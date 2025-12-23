# API Testing Guide

## Quick Test Commands

### 1. Health Check
```bash
curl http://localhost:5000/api/health
```

### 2. Login as Admin
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@taskmanagement.com\",\"password\":\"admin123\"}"
```

**Save the token from the response!**

### 3. Get Current User Info
```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 4. Get All Departments
```bash
curl http://localhost:5000/api/departments \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 5. Create a New Department
```bash
curl -X POST http://localhost:5000/api/departments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d "{\"name\":\"Engineering\",\"description\":\"Engineering Department\"}"
```

### 6. Create a New User (Department Admin)
```bash
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d "{\"username\":\"johndoe\",\"email\":\"john@example.com\",\"password\":\"password123\",\"role\":\"dept_admin\",\"department_id\":2}"
```

### 7. Get All Users
```bash
curl http://localhost:5000/api/users \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 8. Get All Tasks
```bash
curl http://localhost:5000/api/tasks \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 9. Create a New Task
```bash
curl -X POST http://localhost:5000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d "{\"title\":\"Setup Development Environment\",\"description\":\"Install all required software\",\"priority\":\"high\",\"status\":\"pending\",\"department_id\":2,\"assigned_to\":2,\"due_date\":\"2025-12-31\"}"
```

### 10. Update Task Status
```bash
curl -X PUT http://localhost:5000/api/tasks/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d "{\"status\":\"in_progress\"}"
```

### 11. Get My Assigned Tasks
```bash
curl http://localhost:5000/api/tasks/assigned-to-me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 12. Get Task Details (with comments, attachments, history)
```bash
curl http://localhost:5000/api/tasks/1 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## PowerShell Commands (Windows)

If curl doesn't work in PowerShell, use Invoke-RestMethod:

### Login
```powershell
$body = @{
    email = "admin@taskmanagement.com"
    password = "admin123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body

$token = $response.data.token
Write-Host "Token: $token"
```

### Get Departments
```powershell
$headers = @{
    Authorization = "Bearer $token"
}

Invoke-RestMethod -Uri "http://localhost:5000/api/departments" `
    -Headers $headers
```

### Create Task
```powershell
$headers = @{
    Authorization = "Bearer $token"
    "Content-Type" = "application/json"
}

$taskBody = @{
    title = "New Task"
    description = "Task description"
    priority = "medium"
    department_id = 1
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/tasks" `
    -Method POST `
    -Headers $headers `
    -Body $taskBody
```

---

## Testing with VS Code REST Client

Install the "REST Client" extension in VS Code, then create a file `api-tests.http`:

```http
### Variables
@baseUrl = http://localhost:5000/api
@token = YOUR_TOKEN_HERE

### Health Check
GET {{baseUrl}}/health

### Login
POST {{baseUrl}}/auth/login
Content-Type: application/json

{
  "email": "admin@taskmanagement.com",
  "password": "admin123"
}

### Get Current User
GET {{baseUrl}}/auth/me
Authorization: Bearer {{token}}

### Get All Departments
GET {{baseUrl}}/departments
Authorization: Bearer {{token}}

### Create Department
POST {{baseUrl}}/departments
Content-Type: application/json
Authorization: Bearer {{token}}

{
  "name": "Engineering",
  "description": "Engineering Department"
}

### Get All Users
GET {{baseUrl}}/users
Authorization: Bearer {{token}}

### Create User
POST {{baseUrl}}/users
Content-Type: application/json
Authorization: Bearer {{token}}

{
  "username": "janedoe",
  "email": "jane@example.com",
  "password": "password123",
  "role": "employee",
  "department_id": 1
}

### Get All Tasks
GET {{baseUrl}}/tasks
Authorization: Bearer {{token}}

### Create Task
POST {{baseUrl}}/tasks
Content-Type: application/json
Authorization: Bearer {{token}}

{
  "title": "Implement Login Page",
  "description": "Create the login page with form validation",
  "priority": "high",
  "status": "pending",
  "department_id": 1,
  "assigned_to": 2,
  "due_date": "2025-12-15T10:00:00Z"
}

### Get Task by ID
GET {{baseUrl}}/tasks/1
Authorization: Bearer {{token}}

### Update Task
PUT {{baseUrl}}/tasks/1
Content-Type: application/json
Authorization: Bearer {{token}}

{
  "status": "in_progress",
  "actual_hours": 2.5
}

### Get My Tasks
GET {{baseUrl}}/tasks/assigned-to-me
Authorization: Bearer {{token}}

### Get Tasks I Created
GET {{baseUrl}}/tasks/created-by-me
Authorization: Bearer {{token}}

### Filter Tasks
GET {{baseUrl}}/tasks?status=pending&priority=high&department_id=1
Authorization: Bearer {{token}}

### Search Tasks
GET {{baseUrl}}/tasks?search=login
Authorization: Bearer {{token}}
```

---

## Expected Responses

### Successful Login
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "username": "admin",
      "email": "admin@taskmanagement.com",
      "role": "super_admin",
      "department_id": 1,
      "department_name": "Administration"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Get Tasks Response
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Setup Development Environment",
      "description": "Install all required software",
      "status": "pending",
      "priority": "high",
      "assigned_to": 2,
      "assigned_to_name": "johndoe",
      "assigned_by_name": "admin",
      "department_name": "Engineering",
      "due_date": "2025-12-31T00:00:00.000Z",
      "created_at": "2025-11-27T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1,
    "totalPages": 1
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "You do not have permission to perform this action"
}
```

---

## Common HTTP Status Codes

- **200 OK** - Success
- **201 Created** - Resource created successfully
- **400 Bad Request** - Validation error or bad input
- **401 Unauthorized** - Missing or invalid token
- **403 Forbidden** - Insufficient permissions
- **404 Not Found** - Resource not found
- **500 Internal Server Error** - Server error

---

## Testing Checklist

### Authentication Tests
- [ ] Login with valid credentials
- [ ] Login with invalid credentials
- [ ] Access protected route without token
- [ ] Access protected route with expired token
- [ ] Change password
- [ ] Refresh token

### User Management Tests (as Super Admin)
- [ ] Get all users
- [ ] Create dept admin
- [ ] Create employee
- [ ] Update user
- [ ] Delete user
- [ ] Get users by department

### Department Tests (as Super Admin)
- [ ] Get all departments
- [ ] Create department
- [ ] Update department
- [ ] Get department stats
- [ ] Delete empty department
- [ ] Try to delete department with users (should fail)

### Task Tests
- [ ] Create task as dept admin
- [ ] Create task as employee (should fail)
- [ ] Get all tasks (filtered by role)
- [ ] Get my assigned tasks
- [ ] Update task status as employee
- [ ] Update task details as dept admin
- [ ] Delete task as super admin
- [ ] Filter tasks by status, priority, department
- [ ] Search tasks
- [ ] Get task with comments and history

### Permission Tests
- [ ] Dept admin trying to access other department (should fail)
- [ ] Employee trying to update other's task (should fail)
- [ ] Employee trying to create task (should fail)
- [ ] Dept admin trying to create super admin (should fail)

---

Happy Testing! 🧪
