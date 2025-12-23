# Email Notification Setup Guide

## Overview

The task management system now supports email notifications! When users receive in-app notifications, they can also receive emails.

## Features

✅ **Email Templates:**
- Task assigned notification
- Task progress updated
- Task status changed
- New comment added
- New user registration (to admins)
- Registration approved (to user)

✅ **Smart Email Handling:**
- Falls back gracefully if email not configured
- System works perfectly without email setup
- Errors in email don't affect core functionality
- HTML and plain text email formats

## Quick Setup

### 1. Gmail Setup (Recommended for Testing)

#### Step 1: Enable 2-Factor Authentication
1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Navigate to Security → 2-Step Verification
3. Enable 2-Step Verification

#### Step 2: Generate App Password
1. Go to [Google Account](https://myaccount.google.com/) → Security
2. Find "App passwords" (only visible after 2FA is enabled)
3. Select app: "Mail"
4. Select device: "Other" and name it "Task Management System"
5. Copy the 16-character password generated

#### Step 3: Update .env File
Add these lines to `backend/.env`:

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-app-password
FROM_EMAIL=noreply@taskmanagement.com
FRONTEND_URL=http://localhost:5173
```

**Replace:**
- `your-email@gmail.com` with your Gmail address
- `your-16-character-app-password` with the app password from step 2

### 2. Other Email Providers

#### Office 365 / Outlook.com
```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
FROM_EMAIL=your-email@outlook.com
FRONTEND_URL=http://localhost:5173
```

#### Custom SMTP Server
```env
SMTP_HOST=mail.your-domain.com
SMTP_PORT=587
SMTP_USER=noreply@your-domain.com
SMTP_PASS=your-password
FROM_EMAIL=noreply@your-domain.com
FRONTEND_URL=https://tasks.your-domain.com
```

## Testing Email Notifications

### Test 1: Task Assignment Email

1. **Setup**: Make sure backend/.env has email configuration
2. **Restart backend**: `cd backend && npm run dev`
3. **Check logs**: Should see `✅ Email service initialized` (not ⚠️)
4. **Create task**: 
   - Login as dept_admin (sigera@taskmanagement.com)
   - Create task assigned to employee
5. **Check console**: Should see `📧 Email sent to employee@email.com`
6. **Check inbox**: Employee should receive email

### Test 2: Registration Email

1. **Register new user**: Use self-registration
2. **Check super admin email**: Should receive "New User Registration"
3. **Approve user**: Approve the registration
4. **Check user email**: Should receive "Registration Approved"

## Email Templates

All emails are sent with both HTML and plain text formats for maximum compatibility.

### Task Assigned Email
```
Subject: New Task Assigned

Hi [Employee Name],

You have been assigned a new task: "[Task Title]"

Assigned by: [Admin Name]

[View Task Details Button]
```

### Registration Approved Email
```
Subject: Registration Approved - Welcome!

Hi [User Name],

Your registration has been approved!

You can now login to the Task Management System.

[Login Now Button]
```

## Troubleshooting

### Email Not Sending

**Problem:** Console shows `⚠️  Email notifications disabled`
- **Cause:** Email credentials not configured in .env
- **Solution:** Add SMTP_USER and SMTP_PASS to .env and restart server

**Problem:** Error "Invalid login"
- **Cause:** Wrong email/password or 2FA not enabled
- **Solution:** 
  1. Enable 2-Factor Authentication
  2. Generate App Password (not your regular password)
  3. Use app password in SMTP_PASS

**Problem:** Error "Connection timeout"
- **Cause:** Firewall or network blocking SMTP port
- **Solution:**
  1. Check if port 587 is open
  2. Try port 465 with `secure: true`
  3. Check corporate firewall settings

### Email Goes to Spam

**Solution:**
1. Use FROM_EMAIL with your actual domain
2. Set up SPF and DKIM records (production only)
3. Use authenticated SMTP server
4. Avoid spam trigger words in subject

## Production Considerations

### 1. Use Professional Email Service

For production, use dedicated email services:
- **SendGrid**: Free tier 100 emails/day
- **Mailgun**: Free tier 5,000 emails/month
- **AWS SES**: $0.10 per 1,000 emails
- **Postmark**: Reliable transactional emails

Example SendGrid setup:
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
FROM_EMAIL=noreply@your-domain.com
```

### 2. Set Proper FROM_EMAIL

Use your actual domain:
```env
FROM_EMAIL=noreply@your-company.com
```

### 3. Configure DNS Records

Add SPF record:
```
v=spf1 include:_spf.google.com ~all
```

Add DKIM record (provided by email service)

### 4. Monitor Email Delivery

- Track bounce rates
- Monitor spam complaints  
- Check email logs
- Set up email delivery webhooks

## Email Notification Types

| Event | Recipient | Email Template |
|-------|-----------|----------------|
| Task Assigned | Assigned Employee | Task assigned with link to task |
| Progress Updated | Dept Admins | Progress update notification |
| Status Changed | Dept Admins | Status change notification |
| Comment Added | Task watchers, assignee, creator | New comment with link |
| User Registered | Super Admins | New registration approval request |
| Registration Approved | User | Welcome email with login link |

## Customization

### Modify Email Templates

Edit: `backend/src/services/emailService.js`

Methods to customize:
- `sendTaskAssignedEmail()`
- `sendProgressUpdatedEmail()`
- `sendStatusChangedEmail()`
- `sendCommentAddedEmail()`
- `sendNewRegistrationEmail()`
- `sendRegistrationApprovedEmail()`

### Change Email Styling

The HTML emails use inline CSS. Modify the `html` variable in each method:

```javascript
const html = `
  <div style="font-family: Arial, sans-serif; max-width: 600px;">
    <!-- Your custom HTML here -->
  </div>
`;
```

### Add New Email Type

1. Add method to `emailService.js`:
```javascript
async sendCustomEmail(userEmail, userName, ...args) {
  const subject = 'Custom Subject';
  const text = 'Plain text version';
  const html = '<div>HTML version</div>';
  return this.sendEmail({ to: userEmail, subject, text, html });
}
```

2. Call from NotificationService:
```javascript
await emailService.sendCustomEmail(
  user.email,
  user.full_name,
  ...args
);
```

## Disabling Email Notifications

To disable email notifications temporarily:

1. **Remove from .env:**
```env
# Comment out or remove these lines
# SMTP_USER=...
# SMTP_PASS=...
```

2. **Restart server**

System will show: `⚠️  Email notifications disabled: SMTP credentials not configured`

All other notifications (in-app, real-time) continue to work normally!

## Email Service Implementation Details

### Architecture

```
NotificationService (creates notification)
    ↓
Database (stores notification)
    ↓
Socket.IO (real-time notification)
    ↓
EmailService (sends email)
```

### Error Handling

Emails are sent with try-catch blocks:
```javascript
try {
  await emailService.sendEmail(...);
} catch (emailError) {
  console.error('Error sending email:', emailError);
  // Don't fail the notification creation
}
```

This ensures the core functionality works even if email fails.

### Logging

Email service logs all activities:
- `✅ Email service initialized` - Service ready
- `📧 Email sent to user@email.com: Subject (messageId)` - Success
- `📧 Email would be sent to user@email.com: Subject (disabled)` - Not configured
- `Error sending email: ...` - Failed

## Support

If you encounter issues:

1. Check `.env` configuration
2. Verify email credentials
3. Check server console logs
4. Test with a simple Gmail account first
5. Verify port 587 is accessible

For Gmail issues: https://support.google.com/accounts/answer/185833
For nodemailer issues: https://nodemailer.com/usage/
