<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class AttendanceController extends Controller
{
    /**
     * Normalize emp_code by removing leading zeros
     * e.g., "0000000127" becomes "127"
     */
    private function normalizeEmpCode($empCode): ?string
    {
        if ($empCode === null || $empCode === '') {
            return null;
        }
        // Convert to string, trim whitespace, and remove leading zeros
        $normalized = ltrim(trim((string)$empCode), '0');
        // If the result is empty (e.g., "0000" -> ""), return "0"
        return $normalized === '' ? '0' : $normalized;
    }

    /**
     * Find user by emp_code, matching with normalized values (ignoring leading zeros)
     */
    private function findUserByEmpCode($empCode): ?User
    {
        $normalizedInput = $this->normalizeEmpCode($empCode);
        if (!$normalizedInput) {
            return null;
        }
        
        // Get all users with emp_code and check normalized match
        return User::whereNotNull('emp_code')
            ->where('emp_code', '!=', '')
            ->get()
            ->first(function($user) use ($normalizedInput) {
                return $this->normalizeEmpCode($user->emp_code) === $normalizedInput;
            });
    }

    /**
     * Apply emp_code filter that handles leading zeros
     * Matches attendance.emp_code (e.g., "0000000127") with user.emp_code (e.g., "127")
     */
    private function applyEmpCodeFilter($query, $userEmpCode)
    {
        $normalizedCode = $this->normalizeEmpCode($userEmpCode);
        if (!$normalizedCode) {
            return $query->whereRaw('1 = 0'); // No results if no emp_code
        }
        
        // Match emp_codes where the normalized value matches
        // This handles cases like "0000000127" matching "127"
        return $query->where(function($q) use ($normalizedCode, $userEmpCode) {
            $q->where('emp_code', $userEmpCode)
              ->orWhere('emp_code', $normalizedCode)
              ->orWhereRaw("CAST(emp_code AS UNSIGNED) = ?", [(int)$normalizedCode]);
        });
    }

    /**
     * Get all attendance records with filters
     */
    public function index(Request $request)
    {
        $user = $request->user();
        
        // Only Admin, HOD, and Procurement can view all attendance
        if (!$user->isAdmin() && !$user->isHod() && !$user->isProcurement()) {
            // Regular employees can only see their own attendance
            if ($user->emp_code) {
                $query = Attendance::query();
                $this->applyEmpCodeFilter($query, $user->emp_code);
            } else {
                // Return empty result with message instead of 403
                return response()->json([
                    'data' => [],
                    'current_page' => 1,
                    'last_page' => 1,
                    'per_page' => $request->get('per_page', 15),
                    'total' => 0,
                    'message' => 'No employee code assigned. Please contact HR to set up your employee code for attendance tracking.',
                    'no_emp_code' => true
                ]);
            }
        } else {
            $query = Attendance::query();
            
            // HOD can only see their department's attendance
            if ($user->isHod() && !$user->isAdmin() && !$user->isProcurement()) {
                $managedDepts = $user->managed_department_ids ?? [];
                if (!empty($managedDepts)) {
                    $deptNames = \App\Models\Department::whereIn('id', $managedDepts)->pluck('name')->toArray();
                    $query->whereIn('dept_name', $deptNames);
                }
            }
        }
        
        // Filter by date range
        if ($request->has('start_date') && $request->start_date) {
            $query->whereDate('date', '>=', $request->start_date);
        }
        if ($request->has('end_date') && $request->end_date) {
            $query->whereDate('date', '<=', $request->end_date);
        }
        
        // Filter by specific date
        if ($request->has('date') && $request->date) {
            $query->whereDate('date', $request->date);
        }
        
        // Filter by department
        if ($request->has('department') && $request->department) {
            $query->where('dept_name', $request->department);
        }
        
        // Filter by employee code
        if ($request->has('emp_code') && $request->emp_code) {
            $query->where('emp_code', 'like', '%' . $request->emp_code . '%');
        }
        
        // Search by employee name (join with users)
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('emp_code', 'like', "%{$search}%")
                  ->orWhere('dept_name', 'like', "%{$search}%");
            });
        }
        
        $attendances = $query->orderBy('date', 'desc')
                            ->orderBy('emp_code')
                            ->paginate($request->get('per_page', 50));
        
        // Enrich with user names
        $attendances->getCollection()->transform(function ($attendance) {
            // First try exact match, then try matching without leading zeros
            $user = User::where('emp_code', $attendance->emp_code)->first();
            if (!$user) {
                // Try matching by trimming leading zeros from attendance emp_code
                $trimmedEmpCode = ltrim($attendance->emp_code, '0');
                $user = User::where('emp_code', $trimmedEmpCode)->first();
            }
            if (!$user && $attendance->user_id) {
                // Fallback to user_id if available
                $user = User::find($attendance->user_id);
            }
            $attendance->employee_name = $user ? $user->name : null;
            $attendance->employee_id = $user ? $user->id : null;
            return $attendance;
        });
        
        return response()->json($attendances);
    }

    /**
     * Upload Excel file and import attendance records
     */
    public function upload(Request $request)
    {
        $user = $request->user();
        
        // Only Procurement department users can upload
        if (!$user->isProcurement()) {
            return response()->json(['message' => 'Unauthorized. Only Procurement department can upload attendance.'], 403);
        }
        
        $validator = Validator::make($request->all(), [
            'file' => 'required|file|mimes:xlsx,xls,csv,pdf|max:10240', // Max 10MB
        ]);
        
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }
        
        $file = $request->file('file');
        $extension = strtolower($file->getClientOriginalExtension());
        
        try {
            $data = $this->parseExcelFile($file, $extension);
            
            if (empty($data)) {
                return response()->json(['message' => 'No data found in the file'], 422);
            }
            
            $imported = 0;
            $updated = 0;
            $errors = [];
            $skipped = 0;
            
            foreach ($data as $index => $row) {
                $rowNum = $index + 2; // +2 because index starts at 0 and we skip header
                
                // Validate required fields
                if (empty($row['emp_code'])) {
                    $errors[] = "Row {$rowNum}: Missing employee code";
                    $skipped++;
                    continue;
                }
                
                if (empty($row['date'])) {
                    // Silently skip rows without dates (likely headers/footers)
                    $skipped++;
                    continue;
                }
                
                // Skip known header/footer patterns from PDF reports
                $dateValue = trim($row['date']);
                $skipPatterns = [
                    'accsoft', 'timetr@ck', 'timetrack', 'from', 'to', 'page', 'report',
                    'total', 'subtotal', 'sum', 'period', 'month', 'year', 'date',
                    'generated', 'printed', 'employee', 'department', 'attendance'
                ];
                $isSkipRow = false;
                foreach ($skipPatterns as $pattern) {
                    if (stripos($dateValue, $pattern) !== false) {
                        $isSkipRow = true;
                        break;
                    }
                }
                if ($isSkipRow) {
                    $skipped++;
                    continue;
                }
                
                // Parse date
                $date = $this->parseDate($row['date']);
                if (!$date) {
                    // Only log error if it doesn't look like a header row
                    if (strlen($dateValue) <= 15 && !preg_match('/[a-zA-Z]{3,}/', $dateValue)) {
                        $errors[] = "Row {$rowNum}: Invalid date format '{$dateValue}'";
                    }
                    $skipped++;
                    continue;
                }
                
                // Parse times
                $inTime = $this->parseTime($row['in_time'] ?? null);
                $outTime = $this->parseTime($row['out_time'] ?? null);
                
                // Check if attendance already exists for this emp_code and date
                $existing = Attendance::where('emp_code', $row['emp_code'])
                                     ->whereDate('date', $date)
                                     ->first();
                
                // Look up user by emp_code to link attendance to user (handles leading zeros)
                $matchedUser = $this->findUserByEmpCode($row['emp_code']);
                
                $attendanceData = [
                    'date' => $date,
                    'emp_code' => $row['emp_code'],
                    'fp_code' => $row['fp_code'] ?? null,
                    'dept_name' => $row['dept_name'] ?? null,
                    'in_time' => $inTime,
                    'out_time' => $outTime,
                    'user_id' => $matchedUser ? $matchedUser->id : null, // Link to user if emp_code matches
                ];
                
                if ($existing) {
                    // Update existing record
                    $existing->update($attendanceData);
                    $updated++;
                } else {
                    // Create new record
                    Attendance::create($attendanceData);
                    $imported++;
                }
            }
            
            return response()->json([
                'success' => true,
                'message' => "Import completed successfully",
                'imported' => $imported,
                'updated' => $updated,
                'skipped' => $skipped,
                'errors' => array_slice($errors, 0, 10), // Return first 10 errors
                'total_errors' => count($errors),
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Attendance import error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to process file: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Parse Excel/CSV file
     */
    private function parseExcelFile($file, $extension)
    {
        $data = [];
        
        if ($extension === 'csv') {
            $data = $this->parseCsv($file);
        } elseif ($extension === 'pdf') {
            $data = $this->parsePdf($file);
        } else {
            $data = $this->parseXlsx($file);
        }
        
        return $data;
    }

    /**
     * Parse PDF file - extracts table data from PDF
     */
    private function parsePdf($file)
    {
        // Try using pdftotext command line tool if available
        $pdfPath = $file->getPathname();
        $textContent = '';
        
        // Method 1: Try pdftotext (poppler-utils)
        if ($this->commandExists('pdftotext')) {
            $tempFile = tempnam(sys_get_temp_dir(), 'pdf_');
            exec("pdftotext -layout " . escapeshellarg($pdfPath) . " " . escapeshellarg($tempFile) . " 2>&1", $output, $returnCode);
            if ($returnCode === 0 && file_exists($tempFile)) {
                $textContent = file_get_contents($tempFile);
                unlink($tempFile);
            }
        }
        
        // Method 2: Try basic PDF text extraction
        if (empty($textContent)) {
            $textContent = $this->extractTextFromPdf($pdfPath);
        }
        
        if (empty($textContent)) {
            throw new \Exception('Could not extract text from PDF. Please convert to Excel or CSV format.');
        }
        
        return $this->parseTextContent($textContent);
    }

    /**
     * Check if a command exists
     */
    private function commandExists($command)
    {
        $whereIsCommand = PHP_OS_FAMILY === 'Windows' ? 'where' : 'which';
        exec("$whereIsCommand $command 2>&1", $output, $returnCode);
        return $returnCode === 0;
    }

    /**
     * Basic PDF text extraction
     */
    private function extractTextFromPdf($pdfPath)
    {
        $content = file_get_contents($pdfPath);
        $text = '';
        
        // Simple extraction of text between stream/endstream
        preg_match_all('/stream\s*(.*?)\s*endstream/s', $content, $matches);
        
        foreach ($matches[1] as $stream) {
            // Try to decode if it's compressed
            $decoded = @gzuncompress($stream);
            if ($decoded !== false) {
                $stream = $decoded;
            }
            
            // Extract text objects
            preg_match_all('/\[(.*?)\]\s*TJ/s', $stream, $textMatches);
            foreach ($textMatches[1] as $textBlock) {
                preg_match_all('/\((.*?)\)/s', $textBlock, $strings);
                $text .= implode('', $strings[1]) . ' ';
            }
            
            // Also try Tj operator
            preg_match_all('/\((.*?)\)\s*Tj/s', $stream, $tjMatches);
            foreach ($tjMatches[1] as $string) {
                $text .= $string . ' ';
            }
        }
        
        return $text;
    }

    /**
     * Parse text content (from PDF) into attendance data
     */
    private function parseTextContent($textContent)
    {
        $data = [];
        $lines = preg_split('/\r\n|\r|\n/', $textContent);
        $headers = null;
        
        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line)) continue;
            
            // Split by multiple spaces or tabs (table columns)
            $columns = preg_split('/\s{2,}|\t+/', $line);
            $columns = array_map('trim', $columns);
            $columns = array_filter($columns, fn($col) => $col !== '');
            $columns = array_values($columns);
            
            if (count($columns) < 2) continue;
            
            if (!$headers) {
                // Check if this looks like a header row
                $lowerLine = strtolower($line);
                if (strpos($lowerLine, 'date') !== false || 
                    strpos($lowerLine, 'emp') !== false || 
                    strpos($lowerLine, 'code') !== false ||
                    strpos($lowerLine, 'name') !== false) {
                    $headers = $this->mapHeaders($columns);
                    continue;
                }
            }
            
            if ($headers) {
                $rowData = [];
                foreach ($headers as $index => $header) {
                    if ($header && isset($columns[$index])) {
                        $rowData[$header] = $columns[$index];
                    }
                }
                
                if (!empty($rowData) && (isset($rowData['emp_code']) || isset($rowData['date']))) {
                    $data[] = $rowData;
                }
            }
        }
        
        return $data;
    }

    /**
     * Parse CSV file
     */
    private function parseCsv($file)
    {
        $data = [];
        $handle = fopen($file->getPathname(), 'r');
        $headers = null;
        
        while (($row = fgetcsv($handle)) !== false) {
            if (!$headers) {
                // Map headers to standard names
                $headers = $this->mapHeaders($row);
                continue;
            }
            
            $rowData = [];
            foreach ($headers as $index => $header) {
                if ($header && isset($row[$index])) {
                    $rowData[$header] = trim($row[$index]);
                }
            }
            
            if (!empty($rowData)) {
                $data[] = $rowData;
            }
        }
        
        fclose($handle);
        return $data;
    }

    /**
     * Parse XLSX file using OpenSpout (installed via composer)
     */
    private function parseXlsx($file)
    {
        // Use OpenSpout which is already installed
        if (class_exists('\OpenSpout\Reader\XLSX\Reader')) {
            return $this->parseWithOpenSpout($file);
        }
        
        // Check if PhpSpreadsheet is available
        if (class_exists('\PhpOffice\PhpSpreadsheet\IOFactory')) {
            return $this->parseWithPhpSpreadsheet($file);
        }
        
        // Fallback to SimpleXLSX if available
        if (class_exists('\Shuchkin\SimpleXLSX')) {
            return $this->parseWithSimpleXlsx($file);
        }
        
        // Try basic XML parsing
        return $this->parseXlsxBasic($file);
    }

    /**
     * Parse with OpenSpout
     */
    private function parseWithOpenSpout($file)
    {
        $reader = new \OpenSpout\Reader\XLSX\Reader();
        $reader->open($file->getPathname());
        
        $data = [];
        $headers = null;
        
        foreach ($reader->getSheetIterator() as $sheet) {
            foreach ($sheet->getRowIterator() as $row) {
                $cells = $row->getCells();
                $rowData = [];
                
                foreach ($cells as $cell) {
                    $rowData[] = $cell->getValue();
                }
                
                if (!$headers) {
                    $headers = $this->mapHeaders($rowData);
                    continue;
                }
                
                $mappedRow = [];
                foreach ($headers as $index => $header) {
                    if ($header && isset($rowData[$index])) {
                        $value = $rowData[$index];
                        // Handle DateTime objects from Excel
                        if ($value instanceof \DateTimeInterface) {
                            $mappedRow[$header] = $value->format('Y-m-d H:i:s');
                        } else {
                            $mappedRow[$header] = trim((string)$value);
                        }
                    }
                }
                
                if (!empty(array_filter($mappedRow))) {
                    $data[] = $mappedRow;
                }
            }
            break; // Only read first sheet
        }
        
        $reader->close();
        return $data;
    }

    /**
     * Parse with PhpSpreadsheet
     */
    private function parseWithPhpSpreadsheet($file)
    {
        $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($file->getPathname());
        $worksheet = $spreadsheet->getActiveSheet();
        $rows = $worksheet->toArray();
        
        $data = [];
        $headers = null;
        
        foreach ($rows as $row) {
            if (!$headers) {
                $headers = $this->mapHeaders($row);
                continue;
            }
            
            $rowData = [];
            foreach ($headers as $index => $header) {
                if ($header && isset($row[$index])) {
                    $rowData[$header] = trim($row[$index] ?? '');
                }
            }
            
            if (!empty(array_filter($rowData))) {
                $data[] = $rowData;
            }
        }
        
        return $data;
    }

    /**
     * Parse with SimpleXLSX
     */
    private function parseWithSimpleXlsx($file)
    {
        $xlsx = \Shuchkin\SimpleXLSX::parse($file->getPathname());
        $rows = $xlsx->rows();
        
        $data = [];
        $headers = null;
        
        foreach ($rows as $row) {
            if (!$headers) {
                $headers = $this->mapHeaders($row);
                continue;
            }
            
            $rowData = [];
            foreach ($headers as $index => $header) {
                if ($header && isset($row[$index])) {
                    $rowData[$header] = trim($row[$index] ?? '');
                }
            }
            
            if (!empty(array_filter($rowData))) {
                $data[] = $rowData;
            }
        }
        
        return $data;
    }

    /**
     * Basic XLSX parsing using ZIP and XML
     */
    private function parseXlsxBasic($file)
    {
        $zip = new \ZipArchive();
        if ($zip->open($file->getPathname()) !== true) {
            throw new \Exception('Cannot open XLSX file');
        }
        
        // Read shared strings
        $sharedStrings = [];
        $stringsXml = $zip->getFromName('xl/sharedStrings.xml');
        if ($stringsXml) {
            $xml = simplexml_load_string($stringsXml);
            foreach ($xml->si as $si) {
                $sharedStrings[] = (string)$si->t;
            }
        }
        
        // Read worksheet
        $sheetXml = $zip->getFromName('xl/worksheets/sheet1.xml');
        $zip->close();
        
        if (!$sheetXml) {
            throw new \Exception('Cannot read worksheet');
        }
        
        $xml = simplexml_load_string($sheetXml);
        $data = [];
        $headers = null;
        
        foreach ($xml->sheetData->row as $row) {
            $rowData = [];
            foreach ($row->c as $cell) {
                $value = '';
                if (isset($cell->v)) {
                    $value = (string)$cell->v;
                    // Check if it's a shared string
                    if (isset($cell['t']) && (string)$cell['t'] === 's') {
                        $value = $sharedStrings[(int)$value] ?? '';
                    }
                }
                $rowData[] = $value;
            }
            
            if (!$headers) {
                $headers = $this->mapHeaders($rowData);
                continue;
            }
            
            $mappedRow = [];
            foreach ($headers as $index => $header) {
                if ($header && isset($rowData[$index])) {
                    $mappedRow[$header] = trim($rowData[$index]);
                }
            }
            
            if (!empty(array_filter($mappedRow))) {
                $data[] = $mappedRow;
            }
        }
        
        return $data;
    }

    /**
     * Map Excel headers to database column names
     */
    private function mapHeaders($row)
    {
        $mapping = [
            'date' => 'date',
            'emp code' => 'emp_code',
            'empcode' => 'emp_code',
            'emp_code' => 'emp_code',
            'employee code' => 'emp_code',
            'fp code' => 'fp_code',
            'fpcode' => 'fp_code',
            'fp_code' => 'fp_code',
            'fingerprint code' => 'fp_code',
            'dept name' => 'dept_name',
            'deptname' => 'dept_name',
            'dept_name' => 'dept_name',
            'department' => 'dept_name',
            'department name' => 'dept_name',
            'in' => 'in_time',
            'in time' => 'in_time',
            'in_time' => 'in_time',
            'intime' => 'in_time',
            'check in' => 'in_time',
            'checkin' => 'in_time',
            'out' => 'out_time',
            'out time' => 'out_time',
            'out_time' => 'out_time',
            'outtime' => 'out_time',
            'check out' => 'out_time',
            'checkout' => 'out_time',
        ];
        
        $headers = [];
        foreach ($row as $index => $header) {
            $normalized = strtolower(trim($header ?? ''));
            $headers[$index] = $mapping[$normalized] ?? null;
        }
        
        return $headers;
    }

    /**
     * Parse date from various formats
     */
    private function parseDate($value)
    {
        if (empty($value)) return null;
        
        $value = trim($value);
        
        // Skip common non-date values
        $skipValues = ['date', 'total', 'subtotal', 'sum', 'page', 'report', 'generated', 'printed'];
        if (in_array(strtolower($value), $skipValues)) {
            return null;
        }
        
        // If it's a numeric Excel date
        if (is_numeric($value)) {
            // Excel dates are days since 1900-01-01 (with a bug for 1900 leap year)
            $numValue = (float)$value;
            if ($numValue > 1 && $numValue < 100000) { // Valid Excel date range
                $unixTimestamp = ($numValue - 25569) * 86400;
                return Carbon::createFromTimestamp($unixTimestamp)->format('Y-m-d');
            }
            return null;
        }
        
        // Try common date formats
        $formats = [
            'Y-m-d',
            'd/m/Y',
            'm/d/Y',
            'd-m-Y',
            'm-d-Y',
            'Y/m/d',
            'd.m.Y',
            'j/n/Y',
            'n/j/Y',
            'd M Y',
            'd M y',
            'M d, Y',
            'M d Y',
            'd-M-Y',
            'd-M-y',
            'Y-m-d H:i:s',
            'd/m/Y H:i:s',
        ];
        
        foreach ($formats as $format) {
            try {
                $date = Carbon::createFromFormat($format, $value);
                if ($date && $date->year > 1900 && $date->year < 2100) {
                    return $date->format('Y-m-d');
                }
            } catch (\Exception $e) {
                continue;
            }
        }
        
        // Try Carbon's parse as last resort
        try {
            $parsed = Carbon::parse($value);
            if ($parsed && $parsed->year > 1900 && $parsed->year < 2100) {
                return $parsed->format('Y-m-d');
            }
        } catch (\Exception $e) {
            // Ignore
        }
        
        return null;
    }

    /**
     * Parse time from various formats
     */
    private function parseTime($value)
    {
        if (empty($value)) return null;
        
        // If it's a numeric Excel time (fraction of a day)
        if (is_numeric($value) && $value < 1) {
            $totalSeconds = $value * 86400;
            $hours = floor($totalSeconds / 3600);
            $minutes = floor(($totalSeconds % 3600) / 60);
            return sprintf('%02d:%02d:00', $hours, $minutes);
        }
        
        // If it's a numeric Excel datetime
        if (is_numeric($value) && $value > 1) {
            $fraction = $value - floor($value);
            $totalSeconds = $fraction * 86400;
            $hours = floor($totalSeconds / 3600);
            $minutes = floor(($totalSeconds % 3600) / 60);
            return sprintf('%02d:%02d:00', $hours, $minutes);
        }
        
        // Try parsing as time string
        $formats = [
            'H:i:s',
            'H:i',
            'h:i:s A',
            'h:i A',
            'h:i:sa',
            'h:ia',
        ];
        
        foreach ($formats as $format) {
            try {
                $time = Carbon::createFromFormat($format, trim($value));
                if ($time) return $time->format('H:i:s');
            } catch (\Exception $e) {
                continue;
            }
        }
        
        // Try Carbon's parse
        try {
            return Carbon::parse($value)->format('H:i:s');
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Get attendance statistics
     */
    public function statistics(Request $request)
    {
        $user = $request->user();
        
        $query = Attendance::query();
        
        // Regular employees can only see their own statistics
        if (!$user->isAdmin() && !$user->isHod() && !$user->isProcurement()) {
            if ($user->emp_code) {
                $this->applyEmpCodeFilter($query, $user->emp_code);
            } else {
                return response()->json([
                    'total_records' => 0,
                    'unique_employees' => 0,
                    'departments' => [],
                    'date_range' => [
                        'start' => $request->get('start_date', Carbon::now()->startOfMonth()->format('Y-m-d')),
                        'end' => $request->get('end_date', Carbon::now()->format('Y-m-d')),
                    ],
                    'is_own_records' => true,
                ]);
            }
        } elseif ($user->isHod() && !$user->isAdmin() && !$user->isProcurement()) {
            // HOD filter - can see their department's attendance
            $managedDepts = $user->managed_department_ids ?? [];
            if (!empty($managedDepts)) {
                $deptNames = \App\Models\Department::whereIn('id', $managedDepts)->pluck('name')->toArray();
                $query->whereIn('dept_name', $deptNames);
            }
        }
        
        // Date filter
        $startDate = $request->get('start_date', Carbon::now()->startOfMonth()->format('Y-m-d'));
        $endDate = $request->get('end_date', Carbon::now()->format('Y-m-d'));
        
        $query->whereBetween('date', [$startDate, $endDate]);
        
        $stats = [
            'total_records' => $query->count(),
            'unique_employees' => $query->distinct('emp_code')->count('emp_code'),
            'departments' => $query->distinct('dept_name')->pluck('dept_name')->filter()->values(),
            'date_range' => [
                'start' => $startDate,
                'end' => $endDate,
            ],
            'is_own_records' => !$user->isAdmin() && !$user->isHod() && !$user->isProcurement(),
        ];
        
        return response()->json($stats);
    }

    /**
     * Download sample Excel template
     */
    public function downloadTemplate()
    {
        $headers = ['Date', 'Emp Code', 'FP Code', 'Dept Name', 'In', 'Out'];
        $sampleData = [
            ['2026-01-30', 'EMP001', 'FP001', 'IT Department', '09:00', '18:00'],
            ['2026-01-30', 'EMP002', 'FP002', 'HR Department', '08:30', '17:30'],
        ];
        
        $csv = implode(',', $headers) . "\n";
        foreach ($sampleData as $row) {
            $csv .= implode(',', $row) . "\n";
        }
        
        return response($csv)
            ->header('Content-Type', 'text/csv')
            ->header('Content-Disposition', 'attachment; filename="attendance_template.csv"');
    }

    /**
     * Delete attendance record
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        
        // Only Procurement department users can delete
        if (!$user->isProcurement()) {
            return response()->json(['message' => 'Unauthorized. Only Procurement department can delete attendance records.'], 403);
        }
        
        $attendance = Attendance::findOrFail($id);
        $attendance->delete();
        
        return response()->json(['message' => 'Attendance record deleted successfully']);
    }

    /**
     * Get single attendance record
     */
    public function show(Request $request, $id)
    {
        $user = $request->user();
        $attendance = Attendance::findOrFail($id);
        
        // Check permissions
        if (!$user->isAdmin() && !$user->isProcurement()) {
            if ($user->isHod()) {
                $managedDepts = $user->managed_department_ids ?? [];
                $deptNames = \App\Models\Department::whereIn('id', $managedDepts)->pluck('name')->toArray();
                if (!in_array($attendance->dept_name, $deptNames)) {
                    return response()->json(['message' => 'Unauthorized'], 403);
                }
            } elseif ($user->emp_code !== $attendance->emp_code) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
        }
        
        // Enrich with user info
        $empUser = User::where('emp_code', $attendance->emp_code)->first();
        $attendance->employee_name = $empUser ? $empUser->name : null;
        $attendance->employee_id = $empUser ? $empUser->id : null;
        
        return response()->json($attendance);
    }

    /**
     * Get attendance records for a specific user
     */
    public function userAttendance(Request $request, $userId)
    {
        $currentUser = $request->user();
        $targetUser = User::findOrFail($userId);
        
        // Check permissions - Admin, Procurement, or HOD of user's department can view
        // Also allow users to view their own attendance
        if (!$currentUser->isAdmin() && !$currentUser->isProcurement()) {
            if ($currentUser->id != $userId) {
                if ($currentUser->isHod()) {
                    $managedDepts = $currentUser->managed_department_ids ?? [];
                    if (!in_array($targetUser->department_id, $managedDepts)) {
                        return response()->json(['message' => 'Unauthorized'], 403);
                    }
                } else {
                    return response()->json(['message' => 'Unauthorized'], 403);
                }
            }
        }
        
        // Get attendance by user_id or by emp_code (for backward compatibility)
        // Also match normalized emp_code to handle leading zeros (e.g., "127" matches "0000000127")
        $normalizedEmpCode = $this->normalizeEmpCode($targetUser->emp_code);
        
        $query = Attendance::where(function($q) use ($userId, $targetUser, $normalizedEmpCode) {
            $q->where('user_id', $userId);
            if ($targetUser->emp_code) {
                // Match exact emp_code OR normalized version
                $q->orWhere('emp_code', $targetUser->emp_code);
                if ($normalizedEmpCode) {
                    // Also match if stored emp_code has leading zeros
                    $q->orWhereRaw("CAST(emp_code AS UNSIGNED) = ?", [(int)$normalizedEmpCode]);
                }
            }
        });
        
        // Filter by date range
        if ($request->has('start_date') && $request->start_date) {
            $query->whereDate('date', '>=', $request->start_date);
        }
        if ($request->has('end_date') && $request->end_date) {
            $query->whereDate('date', '<=', $request->end_date);
        }
        
        // Filter by specific month/year
        if ($request->has('month') && $request->has('year')) {
            $query->whereMonth('date', $request->month)
                  ->whereYear('date', $request->year);
        }
        
        $attendances = $query->orderBy('date', 'desc')
                            ->paginate($request->get('per_page', 31)); // Default to ~1 month
        
        // Enrich with calculated fields
        $attendances->getCollection()->transform(function ($attendance) use ($targetUser) {
            $attendance->employee_name = $targetUser->name;
            $attendance->employee_id = $targetUser->id;
            
            // Calculate working hours if both times exist
            if ($attendance->in_time && $attendance->out_time) {
                try {
                    $inTime = \Carbon\Carbon::parse($attendance->in_time);
                    $outTime = \Carbon\Carbon::parse($attendance->out_time);
                    $diff = $outTime->diff($inTime);
                    $attendance->working_hours = sprintf('%02d:%02d', $diff->h, $diff->i);
                    $attendance->working_minutes = ($diff->h * 60) + $diff->i;
                } catch (\Exception $e) {
                    $attendance->working_hours = null;
                    $attendance->working_minutes = null;
                }
            } else {
                $attendance->working_hours = null;
                $attendance->working_minutes = null;
            }
            
            return $attendance;
        });
        
        // Calculate summary statistics
        $allAttendance = Attendance::where(function($q) use ($userId, $targetUser, $normalizedEmpCode) {
            $q->where('user_id', $userId);
            if ($targetUser->emp_code) {
                $q->orWhere('emp_code', $targetUser->emp_code);
                if ($normalizedEmpCode) {
                    $q->orWhereRaw("CAST(emp_code AS UNSIGNED) = ?", [(int)$normalizedEmpCode]);
                }
            }
        });
        
        // Apply same date filters for statistics
        if ($request->has('start_date') && $request->start_date) {
            $allAttendance->whereDate('date', '>=', $request->start_date);
        }
        if ($request->has('end_date') && $request->end_date) {
            $allAttendance->whereDate('date', '<=', $request->end_date);
        }
        if ($request->has('month') && $request->has('year')) {
            $allAttendance->whereMonth('date', $request->month)
                          ->whereYear('date', $request->year);
        }
        
        $stats = [
            'total_days' => $allAttendance->count(),
            'days_with_in_time' => (clone $allAttendance)->whereNotNull('in_time')->count(),
            'days_with_out_time' => (clone $allAttendance)->whereNotNull('out_time')->count(),
        ];
        
        // Get the most recent month with attendance data for this user
        $latestRecord = Attendance::where(function($q) use ($userId, $targetUser, $normalizedEmpCode) {
            $q->where('user_id', $userId);
            if ($targetUser->emp_code) {
                $q->orWhere('emp_code', $targetUser->emp_code);
                if ($normalizedEmpCode) {
                    $q->orWhereRaw("CAST(emp_code AS UNSIGNED) = ?", [(int)$normalizedEmpCode]);
                }
            }
        })->orderBy('date', 'desc')->first();
        
        $latestMonth = $latestRecord ? [
            'month' => (int)date('n', strtotime($latestRecord->date)),
            'year' => (int)date('Y', strtotime($latestRecord->date)),
        ] : null;
        
        return response()->json([
            'user' => [
                'id' => $targetUser->id,
                'name' => $targetUser->name,
                'emp_code' => $targetUser->emp_code,
                'department' => $targetUser->department_name, // Use accessor which handles relationship properly
            ],
            'statistics' => $stats,
            'attendance' => $attendances,
            'latest_month' => $latestMonth,
        ]);
    }
}
