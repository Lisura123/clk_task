// Cache Buster: v2026.02.09.1
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import { ConfirmProvider } from './components/ConfirmDialog';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import DeptAdminDashboard from './pages/DeptAdminDashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import Tasks from './pages/Tasks';
import MyTasks from './pages/MyTasks';
import Users from './pages/Users';
import CreateEmployee from './pages/CreateEmployee';
import PendingRegistrations from './pages/PendingRegistrations';
import Departments from './pages/Departments';
import DepartmentDetails from './pages/DepartmentDetails';
import Groups from './pages/Groups';
import Schedule from './pages/Schedule';
import Settings from './pages/Settings';
import Search from './pages/Search';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import TaskDetails from './pages/TaskDetails';
import EmployeeDetails from './pages/EmployeeDetails';
import MyLeaves from './pages/MyLeaves';
import LeaveApproval from './pages/LeaveApproval';
import LeaveSettings from './pages/LeaveSettings';
import Attendance from './pages/Attendance';
import GpsAttendance from './pages/GpsAttendance';
import BranchManagement from './pages/BranchManagement';
import AttendanceReports from './pages/AttendanceReports';
import AttendanceAdmin from './pages/AttendanceAdmin';
import useAuthStore from './store/authStore';

function DashboardRouter() {
  const { user } = useAuthStore();

  if (!user) return <Navigate to="/login" replace />;

  switch (user.role) {
    case 'admin':
      return <SuperAdminDashboard />;
    case 'hod':
      return <DeptAdminDashboard />;
    case 'senior_employee':
      return <EmployeeDashboard />;
    case 'employee':
      return <EmployeeDashboard />;
    default:
      return <Navigate to="/login" replace />;
  }
}

function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
        
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          
          {/* Dashboard Route - dynamically renders based on role */}
          <Route path="dashboard" element={<DashboardRouter />} />

          {/* Dashboard Task Routes */}
          <Route
            path="dashboard/tasks"
            element={
              <ProtectedRoute allowedRoles={['admin', 'hod', 'senior_employee', 'employee']}>
                <Tasks />
              </ProtectedRoute>
            }
          />
          <Route
            path="dashboard/tasks/:id"
            element={
              <ProtectedRoute allowedRoles={['admin', 'hod', 'senior_employee', 'employee']}>
                <TaskDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="dashboard/my-tasks"
            element={
              <ProtectedRoute allowedRoles={['senior_employee', 'employee']}>
                <MyTasks />
              </ProtectedRoute>
            }
          />

          {/* Dashboard User Management */}
          <Route
            path="dashboard/users"
            element={
              <ProtectedRoute allowedRoles={['admin', 'hod']}>
                <Users />
              </ProtectedRoute>
            }
          />
          <Route
            path="dashboard/all-employees"
            element={
              <ProtectedRoute allowedRoles={['admin', 'hod', 'senior_employee', 'employee']}>
                <Users />
              </ProtectedRoute>
            }
          />
          <Route
            path="dashboard/employees/:id"
            element={
              <ProtectedRoute allowedRoles={['admin', 'hod', 'senior_employee', 'employee']}>
                <EmployeeDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="dashboard/create-employee"
            element={
              <ProtectedRoute allowedRoles={['admin', 'hod']}>
                <CreateEmployee />
              </ProtectedRoute>
            }
          />
          <Route
            path="dashboard/pending-registrations"
            element={
              <ProtectedRoute allowedRoles={['admin', 'hod']}>
                <PendingRegistrations />
              </ProtectedRoute>
            }
          />

          {/* Dashboard Department Management */}
          <Route
            path="dashboard/departments"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Departments />
              </ProtectedRoute>
            }
          />
          <Route
            path="dashboard/departments/:id"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DepartmentDetails />
              </ProtectedRoute>
            }
          />

          {/* Dashboard Group Management - All users can view, admins can create */}
          <Route
            path="dashboard/groups"
            element={
              <ProtectedRoute allowedRoles={['admin', 'hod', 'senior_employee', 'employee']}>
                <Groups />
              </ProtectedRoute>
            }
          />

          {/* Schedule - All users can view, admins can manage */}
          <Route
            path="dashboard/schedule"
            element={
              <ProtectedRoute allowedRoles={['admin', 'hod', 'senior_employee', 'employee']}>
                <Schedule />
              </ProtectedRoute>
            }
          />

          {/* Dashboard Search */}
          <Route
            path="dashboard/search"
            element={
              <ProtectedRoute allowedRoles={['admin', 'hod', 'senior_employee', 'employee']}>
                <Search />
              </ProtectedRoute>
            }
          />

          {/* Dashboard Notifications */}
          <Route
            path="dashboard/notifications"
            element={
              <ProtectedRoute allowedRoles={['admin', 'hod', 'senior_employee', 'employee']}>
                <Notifications />
              </ProtectedRoute>
            }
          />

          {/* Dashboard Profile */}
          <Route
            path="dashboard/profile"
            element={
              <ProtectedRoute allowedRoles={['admin', 'hod', 'senior_employee', 'employee']}>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* Dashboard Settings */}
          <Route path="dashboard/settings" element={<Settings />} />

          {/* Leave Management - Employee View */}
          <Route
            path="dashboard/my-leaves"
            element={
              <ProtectedRoute allowedRoles={['admin', 'hod', 'senior_employee', 'employee']}>
                <MyLeaves />
              </ProtectedRoute>
            }
          />

          {/* Leave Management - Admin Approval */}
          <Route
            path="dashboard/leave-approval"
            element={
              <ProtectedRoute allowedRoles={['admin', 'hod']}>
                <LeaveApproval />
              </ProtectedRoute>
            }
          />

          {/* Leave Settings - Admin Only */}
          <Route
            path="dashboard/leave-settings"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <LeaveSettings />
              </ProtectedRoute>
            }
          />

          {/* Attendance Management - Procurement Only */}
          <Route
            path="dashboard/attendance"
            element={
              <ProtectedRoute allowedRoles={['admin', 'hod', 'senior_employee', 'employee']}>
                <Attendance />
              </ProtectedRoute>
            }
          />

          {/* GPS Attendance - Branch Employees */}
          <Route
            path="dashboard/gps-attendance"
            element={
              <ProtectedRoute allowedRoles={['admin', 'hod', 'senior_employee', 'employee']}>
                <GpsAttendance />
              </ProtectedRoute>
            }
          />

          {/* Branch Management - Admin Only */}
          <Route
            path="dashboard/branches"
            element={
              <ProtectedRoute allowedRoles={['admin', 'hod']}>
                <BranchManagement />
              </ProtectedRoute>
            }
          />

          {/* Attendance Reports - Admin/Procurement Only */}
          <Route
            path="dashboard/attendance-reports"
            element={
              <ProtectedRoute allowedRoles={['admin']} allowProcurement={true}>
                <AttendanceReports />
              </ProtectedRoute>
            }
          />

          {/* Attendance Administration - Admin Only */}
          <Route
            path="dashboard/attendance-admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AttendanceAdmin />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </ConfirmProvider>
    </ToastProvider>
  );
}

export default App;
