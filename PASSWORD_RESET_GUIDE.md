# Password Reset System

Complete password reset flow with email-based token verification.

## Features

- ✅ **Forgot Password Page** - Request password reset via email
- ✅ **Reset Password Page** - Reset password using secure token
- ✅ **Token Expiration** - Tokens expire after 60 minutes
- ✅ **Email Validation** - Only registered users can request resets
- ✅ **Secure Hashing** - Tokens are hashed before storage
- ✅ **Auto-cleanup** - Old tokens are deleted on successful reset

## API Endpoints

### 1. Request Password Reset
```http
POST /api/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response (Success):**
```json
{
  "message": "Password reset link has been sent to your email.",
  "token": "abc123..." // Only in development mode
}
```

### 2. Reset Password
```http
POST /api/reset-password
Content-Type: application/json

{
  "email": "user@example.com",
  "token": "abc123...",
  "password": "newPassword123",
  "password_confirmation": "newPassword123"
}
```

**Response (Success):**
```json
{
  "message": "Password has been reset successfully. You can now log in with your new password."
}
```

## Frontend Routes

- `/forgot-password` - Request password reset
- `/reset-password` - Reset password with token
- Login page has "Forgot password?" link

## Development Mode

In development, the API returns the reset token in the response. This allows you to test the flow without setting up email:

1. Go to `/forgot-password`
2. Enter your email
3. Copy the token shown in the success message
4. Go to `/reset-password`
5. Paste the token and set your new password

## Production Setup

**Important:** Remove the token from the API response in production!

In `app/Http/Controllers/Api/AuthController.php`, remove this line:
```php
'token' => $token, // Remove this in production
```

Then configure email in `.env`:
```env
MAIL_MAILER=smtp
MAIL_HOST=your-smtp-host
MAIL_PORT=587
MAIL_USERNAME=your-username
MAIL_PASSWORD=your-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="noreply@yourdomain.com"
MAIL_FROM_NAME="CLK Task Management"
```

To send actual emails, update the `forgotPassword` method to use Laravel's notification system or Mail facade.

## Database

The `password_reset_tokens` table stores:
- `email` (primary key)
- `token` (hashed)
- `created_at` (for expiration check)

Tokens expire after 60 minutes and are automatically deleted after successful password reset.

## Security Features

1. **Hashed Tokens** - Tokens are never stored in plain text
2. **Single-Use** - Tokens are deleted after use
3. **Time-Limited** - 60-minute expiration window
4. **Rate Limiting** - Uses `throttle:login` middleware
5. **Email Verification** - Only registered users can request resets

## Testing

1. **Request Reset:**
   ```bash
   curl -X POST http://localhost:8001/api/forgot-password \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@taskmanagement.com"}'
   ```

2. **Reset Password:**
   ```bash
   curl -X POST http://localhost:8001/api/reset-password \
     -H "Content-Type: application/json" \
     -d '{
       "email":"admin@taskmanagement.com",
       "token":"YOUR_TOKEN_HERE",
       "password":"newPassword123",
       "password_confirmation":"newPassword123"
     }'
   ```

## Error Handling

- **404** - Email not found
- **400** - Invalid/expired token
- **422** - Validation errors (password mismatch, too short, etc.)
