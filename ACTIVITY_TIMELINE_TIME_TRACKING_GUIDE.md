# Activity Timeline and Time Tracking Features - Implementation Guide

## Overview
This document describes the comprehensive Activity Timeline and Time Tracking system implemented for the CLK Task Management System. The implementation includes automatic activity logging, manual time tracking, real-time timers, filtering, search, and export capabilities.

## Table of Contents
1. [Database Schema](#database-schema)
2. [Backend Implementation](#backend-implementation)
3. [Frontend Components](#frontend-components)
4. [API Endpoints](#api-endpoints)
5. [Features](#features)
6. [Usage Guide](#usage-guide)

---

## Database Schema

### Tables Created

#### 1. `task_activities`
Tracks all activities performed on tasks with comprehensive metadata.

```sql
Columns:
- id: Primary key
- task_id: Reference to tasks table
- user_id: User who performed the activity
- activity_type: ENUM (task_created, status_changed, progress_updated, etc.)
- description: Human-readable description
- metadata: JSON field for activity-specific data
- is_system_generated: Boolean flag for system vs user activities
- created_at: Timestamp
```

**Activity Types:**
- `task_created` - Task creation
- `status_changed` - Status updates
- `progress_updated` - Progress percentage changes
- `assignment_changed` - Task reassignments
- `due_date_changed` - Due date modifications
- `priority_changed` - Priority changes
- `department_changed` - Department transfers
- `comment_added` - New comments
- `file_uploaded` / `file_deleted` - File operations
- `link_added` / `link_removed` - Link management
- `task_edited` - General task edits
- `user_mentioned` - @mentions in comments
- `task_completed` / `task_reopened` - Completion status
- `watcher_added` / `watcher_removed` - Watcher management
- `tag_added` / `tag_removed` - Tag operations
- `time_logged` / `timer_started` / `timer_stopped` - Time tracking

#### 2. `time_entries`
Records time spent on tasks with detailed categorization.

```sql
Columns:
- id: Primary key
- task_id: Reference to tasks table
- user_id: User who logged time
- start_time: When work started
- end_time: When work ended (NULL if timer running)
- duration_minutes: Calculated duration
- description: What was worked on
- category: ENUM (development, testing, documentation, etc.)
- is_billable: Boolean for billing purposes
- is_manual_entry: True for manual, false for timer
- is_running: True if timer is currently active
- edited_at: Last edit timestamp
- created_at / updated_at: Timestamps
```

**Categories:**
- development
- testing
- documentation
- design
- meeting
- review
- deployment
- planning
- other

#### 3. `task_watchers`
Tracks users watching tasks for notifications.

```sql
Columns:
- id: Primary key
- task_id: Task being watched
- user_id: User watching
- added_by: User who added the watcher
- created_at: Timestamp
```

#### 4. `task_tags`
Categorization tags for tasks.

```sql
Columns:
- id: Primary key
- name: Tag name
- color: Hex color code
- department_id: NULL for global tags
- created_by: User who created tag
- created_at: Timestamp
```

#### 5. `task_tag_assignments`
Links tags to tasks.

#### 6. `time_tracking_settings`
User/department time tracking preferences.

```sql
Columns:
- auto_start_timer: Auto-start on task open
- reminder_interval_minutes: Time logging reminders
- allow_edit_window_hours: How long entries can be edited
- require_description: Mandate time entry descriptions
- default_category: Default category selection
```

### Views Created

#### `vw_task_activities_detailed`
Enriched view of activities with user and task details.

#### `vw_time_tracking_summary`
Aggregated time tracking statistics per user/task.

### Database Triggers

Automatic triggers log activities for:
- Task creation
- Status changes
- Progress updates
- Assignment changes
- Due date modifications
- Priority changes

---

## Backend Implementation

### Controllers

#### `activityTimelineController.js`
**Location:** `backend/src/controllers/activityTimelineController.js`

**Functions:**
- `getTaskActivities` - Fetch activities with filtering and pagination
- `getTaskActivityStats` - Get activity statistics
- `logActivity` - Manually log custom activities
- `exportActivities` - Export to JSON/CSV
- `searchActivities` - Search activity descriptions

#### `timeTrackingController.js`
**Location:** `backend/src/controllers/timeTrackingController.js`

**Functions:**
- `getTaskTimeEntries` - Fetch all time entries
- `getTaskTimeSummary` - Get summary statistics
- `startTimer` - Start tracking time
- `stopTimer` - Stop active timer
- `getActiveTimer` - Get currently running timer
- `addManualTimeEntry` - Add time entry manually
- `updateTimeEntry` - Edit existing entry
- `deleteTimeEntry` - Remove time entry
- `exportTimeReport` - Export to JSON/CSV

### Services

#### `activityLogger.js`
**Location:** `backend/src/services/activityLogger.js`

Centralized service for logging activities throughout the application.

**Methods:**
```javascript
ActivityLogger.log(taskId, userId, activityType, description, metadata, isSystemGenerated)
ActivityLogger.logComment(taskId, userId, commentId, isReply)
ActivityLogger.logFileUpload(taskId, userId, filename, fileSize)
ActivityLogger.logFileDelete(taskId, userId, filename)
ActivityLogger.logLinkAdded(taskId, userId, linkTitle, linkUrl)
ActivityLogger.logMention(taskId, userId, mentionedUserId, mentionedUserName)
ActivityLogger.logTaskCompleted(taskId, userId)
ActivityLogger.getStats(taskId, startDate, endDate)
ActivityLogger.getMostActiveUsers(taskId, limit)
```

### Routes

**Added to:** `backend/src/routes/tasks.js`

```javascript
// Activity Timeline
GET    /api/tasks/:taskId/activities
GET    /api/tasks/:taskId/activities/stats
POST   /api/tasks/:taskId/activities
GET    /api/tasks/:taskId/activities/search
GET    /api/tasks/:taskId/activities/export

// Time Tracking (existing endpoints enhanced)
GET    /api/tasks/:taskId/time
GET    /api/tasks/:taskId/time/summary
POST   /api/tasks/:taskId/time/start
PUT    /api/tasks/time/:entryId/stop
GET    /api/tasks/:taskId/time/active
POST   /api/tasks/:taskId/time/manual
PUT    /api/tasks/time/:entryId
DELETE /api/tasks/time/:entryId
GET    /api/tasks/:taskId/time/export
```

---

## Frontend Components

### ActivityTimeline Component
**Location:** `frontend/src/components/ActivityTimeline.jsx`

**Features:**
- Chronological timeline with date grouping
- Activity type icons and color coding
- User avatars and role badges
- Real-time updates via refreshTrigger prop
- Advanced filtering:
  - By activity type
  - By user
  - Date range
  - System/user activities
- Search functionality
- Export to JSON/CSV
- Pagination with "Load More"
- Activity statistics cards

**Props:**
```javascript
<ActivityTimeline 
  taskId={taskId}
  refreshTrigger={commentsLength + attachmentsLength}
/>
```

**UI Components:**
- Filter bar with search, type selector, system toggle
- Statistics cards showing top 3 activity types
- Date-grouped timeline entries
- Activity icons with color-coded badges
- Metadata display for detailed information
- Export buttons (JSON/CSV)

### TimeTracking Component
**Location:** `frontend/src/components/TimeTracking.jsx`

**Features:**
- Real-time timer with live countdown
- Start/Stop timer controls
- Manual time entry form
- Time entry list with categorization
- Summary statistics:
  - Total hours logged
  - Billable hours
  - Estimated vs actual comparison
  - Variance calculation
- Category selection (9 categories)
- Billable/non-billable marking
- Edit window enforcement
- Export to CSV
- Duration calculator for manual entries

**Props:**
```javascript
<TimeTracking 
  taskId={taskId}
  estimatedHours={task?.estimated_hours || 0}
/>
```

**Timer States:**
- **Inactive:** Shows start form with description and category
- **Active:** Live countdown display with stop button
- **Manual Entry:** Comprehensive form for historical entries

**Summary Cards:**
1. Total Time - Shows hours and entry count
2. Billable Hours - With percentage of total
3. Estimated Hours - Original estimate
4. Variance - Difference from estimate (color-coded)

---

## API Endpoints

### Activity Timeline Endpoints

#### GET `/api/tasks/:taskId/activities`
Fetch paginated activities with filters.

**Query Parameters:**
- `type` - Filter by activity type
- `userId` - Filter by specific user
- `startDate` - Date range start
- `endDate` - Date range end
- `limit` - Results per page (default: 50)
- `offset` - Pagination offset
- `includeSystem` - Include system activities (true/false)

**Response:**
```json
{
  "success": true,
  "data": {
    "activities": [...],
    "pagination": {
      "total": 150,
      "limit": 50,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

#### GET `/api/tasks/:taskId/activities/stats`
Get activity statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "byType": [
      { "activity_type": "comment_added", "count": 25, "last_activity": "2025-12-01" }
    ],
    "byUser": [
      { "id": 1, "name": "John Doe", "activity_count": 50 }
    ]
  }
}
```

#### POST `/api/tasks/:taskId/activities`
Log a custom activity.

**Request Body:**
```json
{
  "activity_type": "task_edited",
  "description": "Updated task description",
  "metadata": { "field": "description" },
  "is_system_generated": false
}
```

#### GET `/api/tasks/:taskId/activities/search`
Search activities by description.

**Query Parameters:**
- `query` - Search term

#### GET `/api/tasks/:taskId/activities/export`
Export activities.

**Query Parameters:**
- `format` - 'json' or 'csv'

### Time Tracking Endpoints

#### POST `/api/tasks/:taskId/time/start`
Start a timer.

**Request Body:**
```json
{
  "description": "Working on authentication",
  "category": "development"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "task_id": 45,
    "start_time": "2025-12-01T10:00:00Z",
    "is_running": true
  }
}
```

#### PUT `/api/tasks/time/:entryId/stop`
Stop a running timer.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "duration_minutes": 120,
    "end_time": "2025-12-01T12:00:00Z"
  }
}
```

#### POST `/api/tasks/:taskId/time/manual`
Add manual time entry.

**Request Body:**
```json
{
  "start_time": "2025-12-01T09:00:00",
  "end_time": "2025-12-01T11:30:00",
  "duration_minutes": 150,
  "description": "Code review",
  "category": "review",
  "is_billable": true
}
```

#### GET `/api/tasks/:taskId/time/summary`
Get time tracking summary.

**Response:**
```json
{
  "success": true,
  "data": {
    "byUser": [...],
    "overall": {
      "total_minutes": 1200,
      "total_hours": "20.00",
      "billable_hours": "15.00",
      "estimated_hours": 16.00,
      "variance_hours": "4.00",
      "total_entries": 10,
      "unique_users": 3
    }
  }
}
```

---

## Features

### Activity Timeline Features

1. **Automatic Activity Logging**
   - Database triggers automatically log task changes
   - No manual intervention required
   - Comprehensive metadata captured

2. **Manual Activity Logging**
   - Custom activities via API
   - Integration with comment system
   - File upload/delete tracking

3. **Advanced Filtering**
   - Activity type filtering
   - User-specific activities
   - Date range selection
   - System vs user activities toggle

4. **Search Functionality**
   - Full-text search in descriptions
   - Real-time search results
   - Highlighted search terms

5. **Export Capabilities**
   - JSON export for programmatic access
   - CSV export for spreadsheets
   - Complete activity history
   - Filtered export options

6. **Visual Timeline**
   - Chronological display (newest first)
   - Date-grouped entries
   - Color-coded activity types
   - User avatars and roles
   - Metadata badges

7. **Statistics Dashboard**
   - Top 3 activity types
   - Activity counts
   - Last activity timestamps
   - Most active users

### Time Tracking Features

1. **Real-Time Timer**
   - Live countdown display (HH:MM:SS)
   - Start/stop controls
   - Auto-stop existing timers
   - Timer description and category
   - Persistent timer state

2. **Manual Time Entry**
   - Start/end time picker
   - Duration calculator
   - Description field
   - Category selection (9 options)
   - Billable toggle

3. **Time Entry Management**
   - View all entries
   - Edit recent entries (24h window)
   - Delete own entries
   - Category badges
   - Duration display

4. **Summary Statistics**
   - Total time logged
   - Billable hours calculation
   - Estimated vs actual comparison
   - Variance tracking
   - Entry count

5. **Categorization**
   - 9 predefined categories
   - Color-coded badges
   - Category filtering
   - Usage analytics

6. **Permissions & Security**
   - Users edit own entries only
   - Time window restrictions
   - Admin override capabilities
   - Audit trail (edited_at)

7. **Export & Reporting**
   - CSV export for timesheets
   - Date range filtering
   - Billable hours reports
   - User-specific reports

---

## Usage Guide

### For Developers

#### Logging Activities Programmatically

```javascript
const ActivityLogger = require('../services/activityLogger');

// Log a comment
await ActivityLogger.logComment(taskId, userId, commentId, false);

// Log file upload
await ActivityLogger.logFileUpload(taskId, userId, 'document.pdf', 1024000);

// Log custom activity
await ActivityLogger.log(
  taskId,
  userId,
  'task_edited',
  'Updated task description',
  { field: 'description', old_value: 'Old', new_value: 'New' },
  false
);
```

#### Integrating Timeline Component

```jsx
import ActivityTimeline from '../components/ActivityTimeline';

function TaskDetails() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Refresh timeline when comments/attachments change
  useEffect(() => {
    setRefreshTrigger(prev => prev + 1);
  }, [comments, attachments]);

  return (
    <ActivityTimeline 
      taskId={taskId}
      refreshTrigger={refreshTrigger}
    />
  );
}
```

#### Integrating Time Tracking

```jsx
import TimeTracking from '../components/TimeTracking';

function TaskDetails() {
  return (
    <TimeTracking 
      taskId={taskId}
      estimatedHours={task?.estimated_hours || 0}
    />
  );
}
```

### For End Users

#### Using Activity Timeline

1. **View Timeline**
   - Navigate to task details
   - Click "Activity" tab
   - Scroll through chronological activities

2. **Filter Activities**
   - Use type dropdown (Comments, Status Changes, Files, etc.)
   - Toggle "Show System" for system vs user activities
   - Enter date range for specific periods

3. **Search Activities**
   - Type search term in search box
   - Press Enter or click search
   - View filtered results

4. **Export Activities**
   - Click "JSON" or "CSV" button
   - Download starts automatically
   - Open in preferred application

#### Using Time Tracker

1. **Start Timer**
   - Enter description (optional)
   - Select category
   - Click "Start Timer"
   - Timer runs in background

2. **Stop Timer**
   - Click "Stop Timer" button
   - Time automatically logged
   - Entry appears in list

3. **Manual Entry**
   - Click "Manual Entry" button
   - Fill in start/end times or duration
   - Add description
   - Select category and billable status
   - Click "Add Entry"

4. **View Summary**
   - See total hours at top
   - Check billable hours
   - Compare to estimate
   - View variance

5. **Export Report**
   - Click "Export" button
   - CSV downloads automatically
   - Open in Excel/Sheets

---

## Configuration

### Time Tracking Settings

Settings stored in `time_tracking_settings` table:

```sql
INSERT INTO time_tracking_settings VALUES
- auto_start_timer: FALSE (don't auto-start)
- reminder_interval_minutes: 60 (hourly reminders)
- allow_edit_window_hours: 24 (24h edit window)
- require_description: TRUE (mandate descriptions)
- default_category: 'development'
```

### Activity Retention

Activities are permanent by default. To implement retention:

```sql
-- Archive old activities (example)
DELETE FROM task_activities 
WHERE created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR)
AND is_system_generated = TRUE;
```

---

## Performance Considerations

1. **Pagination**
   - Default limit: 50 activities
   - Use offset for large datasets
   - Indexed queries on task_id, created_at

2. **Real-Time Updates**
   - Timer updates every second (client-side)
   - Activity refresh via props, not polling
   - Efficient database triggers

3. **Export Limits**
   - No pagination on exports (full dataset)
   - CSV streaming for large files
   - Consider date range limits

---

## Troubleshooting

### Common Issues

**Timer doesn't start:**
- Check for existing running timer
- Verify task assignment
- Check browser console for errors

**Activities not appearing:**
- Verify triggers are enabled: `SHOW TRIGGERS;`
- Check activity_type enum values
- Verify user permissions

**Export fails:**
- Check file size limits
- Verify browser download settings
- Check server disk space

**Performance slow:**
- Add indexes if needed
- Limit date ranges
- Use pagination

---

## Future Enhancements

1. **Real-Time Sync**
   - WebSocket integration for live updates
   - Multi-user timer visibility
   - Instant activity notifications

2. **Advanced Analytics**
   - Time tracking heatmaps
   - Productivity trends
   - Team performance dashboards

3. **Mobile Support**
   - Native mobile timer
   - Push notifications
   - Offline time logging

4. **Integrations**
   - Calendar sync
   - Jira/Asana import
   - Slack notifications
   - Email digests

---

## Migration Information

**Migration File:** `004_add_activity_timeline_and_time_tracking.sql`

**Run Migration:**
```bash
Get-Content "path/to/migration.sql" | mysql -u root clk_task
```

**Rollback:** (Use with caution)
```sql
DROP TABLE task_activities;
DROP TABLE time_entries;
DROP TABLE task_watchers;
DROP TABLE task_tags;
DROP TABLE task_tag_assignments;
DROP TABLE time_tracking_settings;
DROP VIEW vw_task_activities_detailed;
DROP VIEW vw_time_tracking_summary;
-- Drop triggers
DROP TRIGGER trg_task_created;
-- etc.
```

---

## Support

For issues or questions:
1. Check this documentation
2. Review API endpoints
3. Check database schema
4. Consult ActivityLogger service

---

**Version:** 1.0.0  
**Last Updated:** December 1, 2025  
**Author:** CLK Task Management Development Team
