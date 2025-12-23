# Quick Start Guide - Activity Timeline & Time Tracking

## Testing the New Features

### 1. Database Setup ✅
The migration has already been run. Tables created:
- task_activities
- time_entries
- task_watchers
- task_tags
- task_tag_assignments
- time_tracking_settings

### 2. Start the Backend Server

```bash
cd c:\xampp\htdocs\clk_task\project\backend
npm run dev
```

Backend should start on: http://localhost:3000

### 3. Start the Frontend Server

```bash
cd c:\xampp\htdocs\clk_task\project\frontend
npm run dev
```

Frontend should start on: http://localhost:5173

### 4. Test Activity Timeline

#### Automatic Activities (via triggers)
1. **Login** to the application
2. **Open any task** from the dashboard
3. **Click "Activity" tab** - You should see existing activities
4. **Edit the task**:
   - Change status (todo → in-progress)
   - Update progress (0% → 50%)
   - Change priority (low → high)
   - Modify due date
5. **Return to Activity tab** - New activities should appear automatically!

#### Manual Activities
Activities are automatically logged when you:
- Add comments (with/without @mentions)
- Upload files
- Add links in comments
- Edit task details

#### Test Filters
1. Click the **activity type dropdown** - select "Comments"
2. Toggle **"Show System"** checkbox
3. Use the **search box** - search for keywords
4. Click **Export buttons** (JSON/CSV)

### 5. Test Time Tracking

#### Test Timer
1. **Open a task** you're assigned to
2. **Click "Time" tab**
3. **Enter description**: "Testing timer functionality"
4. **Select category**: Development
5. **Click "Start Timer"**
6. Watch the **live countdown** (HH:MM:SS)
7. Wait 1-2 minutes
8. **Click "Stop Timer"**
9. Entry appears in the list below!

#### Test Manual Entry
1. **Click "Manual Entry"** button
2. Fill in the form:
   - Start time: Today at 9:00 AM
   - End time: Today at 11:00 AM
   - Description: "Code review session"
   - Category: Review
   - Check "Billable"
3. **Click "Add Entry"**
4. Entry appears in the list!

#### View Statistics
Check the 4 summary cards:
- **Total Time**: Shows all hours logged
- **Billable Hours**: Shows billable time only
- **Estimated Hours**: Shows original estimate
- **Variance**: Shows over/under estimation

#### Test Export
1. **Click "Export"** button
2. CSV file downloads automatically
3. Open in Excel/Google Sheets

### 6. Verify Integration

#### Check Activity Timeline Updates
1. Add a comment on a task
2. Switch to **Activity tab**
3. Look for "comment_added" activity

#### Check Time Logging Activities
1. Log time or start/stop timer
2. Switch to **Activity tab**
3. Look for "time_logged", "timer_started", "timer_stopped" activities

### 7. Test Different User Roles

#### As Employee
- Can view activities on assigned tasks
- Can track time on assigned tasks
- Can only edit/delete own time entries

#### As Department Admin
- Can view all department task activities
- Can see time summaries for department

#### As Super Admin
- Can view all activities
- Can edit any time entries
- Can delete any entries

### 8. Common Test Scenarios

#### Scenario 1: Full Task Lifecycle
1. Create new task → Check activity
2. Assign to employee → Check activity
3. Employee starts timer → Check activity
4. Employee adds comment → Check activity
5. Employee updates progress → Check activity
6. Employee stops timer → Check activity
7. Admin changes priority → Check activity
8. Mark task complete → Check activity

#### Scenario 2: Time Tracking Workflow
1. Start timer with description
2. Work for 30 minutes
3. Stop timer
4. Add manual entry for earlier work
5. View summary statistics
6. Export timesheet
7. Verify billable hours calculation

#### Scenario 3: Activity Filtering
1. Create multiple activities (status changes, comments, file uploads)
2. Filter by "Comments only"
3. Filter by specific user
4. Search for keyword
5. Export filtered results

### 9. Expected Results

#### Activity Timeline Should Show:
- ✅ User avatars and names
- ✅ Color-coded activity badges
- ✅ Timestamps (e.g., "2 minutes ago")
- ✅ Metadata for changes (old → new values)
- ✅ Date grouping headers
- ✅ Statistics cards

#### Time Tracking Should Show:
- ✅ Live timer countdown
- ✅ Category color badges
- ✅ Duration in hours/minutes
- ✅ Billable indicators
- ✅ Summary cards with calculations
- ✅ Edit/delete buttons (own entries)

### 10. Troubleshooting

#### Activities Not Appearing
- **Check**: Database triggers enabled
  ```sql
  SHOW TRIGGERS;
  ```
- **Check**: Browser console for errors
- **Try**: Refresh the page

#### Timer Not Starting
- **Check**: No existing timer running
- **Check**: Task is assigned to you
- **Check**: Backend server running

#### Export Not Working
- **Check**: Browser popup blocker
- **Check**: Download folder permissions
- **Check**: Network tab for API errors

#### Statistics Not Updating
- **Refresh**: Click between tabs
- **Check**: Time entries have duration_minutes set
- **Verify**: Database calculations in summary view

### 11. API Testing (Optional)

Test endpoints directly using browser/Postman:

#### Get Activities
```
GET http://localhost:3000/api/tasks/1/activities
Authorization: Bearer YOUR_TOKEN
```

#### Get Time Summary
```
GET http://localhost:3000/api/tasks/1/time/summary
Authorization: Bearer YOUR_TOKEN
```

#### Start Timer
```
POST http://localhost:3000/api/tasks/1/time/start
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "description": "API testing",
  "category": "development"
}
```

### 12. Verification Checklist

- [ ] Backend server running
- [ ] Frontend server running
- [ ] Can access task details page
- [ ] Activity tab visible and working
- [ ] Time tab visible and working
- [ ] Can start/stop timer
- [ ] Timer shows live countdown
- [ ] Can add manual time entry
- [ ] Activities appear automatically when task edited
- [ ] Filters work on activity timeline
- [ ] Search works on activity timeline
- [ ] Export downloads CSV files
- [ ] Statistics cards show correct data
- [ ] Category badges display correctly
- [ ] Timestamps show relative time
- [ ] User avatars appear
- [ ] Pagination works (if many activities)

### 13. Sample Test Data

To create rich test data quickly:

1. **Create a task** with all fields filled
2. **Edit it multiple times**:
   - Change status 3 times
   - Update progress in increments
   - Change priority twice
   - Modify due date
   - Add 5+ comments
   - Upload 2-3 files
3. **Track time**:
   - Start timer, wait 2 min, stop
   - Add 3 manual entries
   - Mix billable and non-billable
   - Use different categories
4. **Result**: Rich activity timeline and time data!

### 14. Success Criteria

✅ **Activity Timeline**
- Shows chronological list of all task activities
- Filters and search work correctly
- Export produces valid CSV/JSON
- Statistics reflect actual data
- Real-time updates on task changes

✅ **Time Tracking**
- Timer starts and stops correctly
- Live countdown updates every second
- Manual entries save successfully
- Summary statistics calculate accurately
- Export produces valid timesheet CSV

---

## Need Help?

See detailed documentation:
- `ACTIVITY_TIMELINE_TIME_TRACKING_GUIDE.md` - Full feature guide
- `IMPLEMENTATION_SUMMARY_ACTIVITY_TIME.md` - Technical summary

## Report Issues

Check:
1. Browser console for errors
2. Network tab for failed API calls
3. Backend terminal for server errors
4. Database for missing tables/data

---

**Happy Testing!** 🎉
