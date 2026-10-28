# Admin User Management
 Implement these routes and include proper error handling for each scenario. If any route is missing or not used in frontend mention explcitly and i will review and approve. Frontend should not be changed
## 1. Get All Users

| Property | Value |
| --- | --- |
| **Method** | GET |
| **Endpoint** | `/taskboard/api/v1/admin/users` |
| **Description** | Retrieves all registered users. |
| **Access** | Admin |

### API Flow

```
Client
   │
GET /admin/users
   │
Authenticate User
   │
Authorize (Admin)
   │
Fetch Users
   │
Return Response
```

### Request

No request body.

### Positive Response

**HTTP 200 OK**

```
{
  "success": true,
  "message": "Users retrieved successfully.",
  "data": [
    {
      "id": "uuid",
      "full_name": "John Doe",
      "email": "john.doe@taskboard.com",
      "role": "MEMBER",
      "created_at": "2026-10-22T10:30:00Z",
      "updated_at": "2026-10-22T10:30:00Z"
    }
  ]
}
```

---

## 2. Create User

| Property | Value |
| --- | --- |
| **Method** | POST |
| **Endpoint** | `/taskboard/api/v1/admin/users` |
| **Description** | Creates a new user account. |
| **Access** | Admin |

### API Flow

```
Client
   │
POST /admin/users
   │
Authenticate User
   │
Authorize (Admin)
   │
Validate Request
   │
Create User
   │
Return Response
```

### Request Body

```
{
  "full_name": "John Doe",
  "email": "john.doe@taskboard.com",
  "role": "MEMBER"
}
```

### Positive Response

**HTTP 201 Created**

```
{
  "success": true,
  "message": "User created successfully.",
  "data": {
    "id": "uuid",
    "full_name": "John Doe",
    "email": "john.doe@taskboard.com",
    "role": "MEMBER",
    "created_at": "2026-10-22T10:30:00Z",
    "updated_at": "2026-10-22T10:30:00Z"
  }
}
```

---

## 3. Update User

| Property | Value |
| --- | --- |
| **Method** | PATCH |
| **Endpoint** | `/taskboard/api/v1/admin/users/{user_id}` |
| **Description** | Updates a user's information or role. |
| **Access** | Admin |

**HTTP 200 OK**

```
{
  "success": true,
  "message": "User updated successfully.",
  "data": {
    "id": "e4a52f74-9b54-4c72-8d5d-7a2e1e2c84d3",
    "full_name": "John Doe",
    "email": "john.doe@taskboard.com",
    "role": "ADMIN",
    "updated_at": "2026-10-23T09:15:00Z"
  }
}
```

---

## 4. Delete User

| Property | Value |
| --- | --- |
| **Method** | DELETE |
| **Endpoint** | `/taskboard/api/v1/admin/users/{user_id}` |
| **Description** | Deletes a user account. |
| **Access** | Admin |

**HTTP 204 No Content**

No response body.

# Project Management APIs

## 1. Create Project

| Property | Value |
| --- | --- |
| **Method** | POST |
| **Endpoint** | `/taskboard/api/v1/projects` |
| **Description** | Creates a new project. |
| **Access** | Admin |

### API Flow

```
Client
   │
POST /projects
   │
Authenticate User
   │
Authorize (Admin)
   │
Validate Request
   │
Create Project
   │
Return Response
```

### Request Body

```
{
  "name": "Task Board API",
  "description": "Backend development project",
  "start_date": "2026-10-22",
  "end_date": "2026-12-31"
}
```

### Positive Response

**HTTP 201 Created**

```
{
  "success": true,
  "message": "Project created successfully.",
  "data": {
    "id": "uuid",
    "name": "Task Board API",
    "description": "Backend development project",
    "status": "ACTIVE",
    "created_by": "uuid",
    "created_at": "2026-10-22T10:30:00Z",
    "updated_at": "2026-10-22T10:30:00Z"
  }
}
```

### Negative Scenarios

**401 Unauthorized**

```
{
  "success": false,
  "message": "Authentication is required to access this resource.",
  "error": {
    "code": "MISSING_AUTH_TOKEN"
  }
}
```

**403 Forbidden**

```
{
  "success": false,
  "message": "You do not have permission to create projects.",
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS"
  }
}
```

**409 Conflict**

```
{
  "success": false,
  "message": "A project with the provided name already exists.",
  "error": {
    "code": "PROJECT_ALREADY_EXISTS"
  }
}
```

**422 Unprocessable Entity**

```
{
  "success": false,
  "message": "Validation failed. Please review the submitted project details.",
  "errors": [
    {
      "field": "name",
      "message": "Project name is required."
    }
  ]
}
```

---

# 2. Get All Projects

| Property | Value |
| --- | --- |
| **Method** | GET |
| **Endpoint** | `/taskboard/api/v1/projects` |
| **Description** | Retrieves all projects accessible to the authenticated user. |
| **Access** | Admin, Member |

### Positive Response

**HTTP 200 OK**

```
{
  "success": true,
  "message": "Projects retrieved successfully.",
  "data": [
    {
      "id": "7c9c3a5d-f1d2-4a4d-8e42-c2c43f3c9f0d",
      "name": "Task Board API",
      "description": "Backend development project",
      "created_by": "4d98f65b-9b23-4cb2-8b6f-5ef47b63d8f2",
      "created_at": "2026-10-22T10:30:00Z",
      "updated_at": "2026-10-23T11:20:00Z"
    }
  ]
}
```

### Negative Scenarios

**401 Unauthorized**

```
{
  "success": false,
  "message": "Authentication is required to access this resource.",
  "error": {
    "code": "MISSING_AUTH_TOKEN"
  }
}
```

---

# 3. Get Project by ID

| Property | Value |
| --- | --- |
| **Method** | GET |
| **Endpoint** | `/taskboard/api/v1/projects/{project_id}` |
| **Description** | Retrieves details of a specific project. |
| **Access** | Admin, Member (Assigned Project) |

### Positive Response

**HTTP 200 OK**

```
{
  "success": true,
  "message": "Project retrieved successfully.",
  "data": {
    "id": "7c9c3a5d-f1d2-4a4d-8e42-c2c43f3c9f0d",
    "name": "Task Board API",
    "description": "Backend development project",
    "created_by": "4d98f65b-9b23-4cb2-8b6f-5ef47b63d8f2",
    "created_at": "2026-10-22T10:30:00Z",
    "updated_at": "2026-10-23T11:20:00Z"
  }
}
```

### Negative Scenarios

**403 Forbidden**

```
{
  "success": false,
  "message": "You do not have access to the requested project.",
  "error": {
    "code": "PROJECT_ACCESS_DENIED"
  }
}
```

**404 Not Found**

```
{
  "success": false,
  "message": "The requested project could not be found.",
  "error": {
    "code": "PROJECT_NOT_FOUND"
  }
}
```

---

# 4. Update Project

| Property | Value |
| --- | --- |
| **Method** | PATCH |
| **Endpoint** | `/taskboard/api/v1/projects/{project_id}` |
| **Description** | Updates an existing project. |
| **Access** | Admin |

### Request Body

```
{
  "name": "Task Board API v2",
  "status": "COMPLETED"
}
```

### Positive Response

**HTTP 200 OK**

```
{
  "success": true,
  "message": "Project updated successfully.",
  "data": {
    "id": "7c9c3a5d-f1d2-4a4d-8e42-c2c43f3c9f0d",
    "name": "Task Board API v2",
    "status": "COMPLETED",
    "updated_at": "2026-10-23T10:45:00Z"
  }
}
```

### Negative Scenarios

- **401 Unauthorized**
- **403 Forbidden**
- **404 Project Not Found**
- **422 Validation Failed**

---

# 5. Delete Project

| Property | Value |
| --- | --- |
| **Method** | DELETE |
| **Endpoint** | `/taskboard/api/v1/projects/{project_id}` |
| **Description** | Deletes an existing project. |
| **Access** | Admin |

### Positive Response

**HTTP 204 No Content**

No response body.

### Negative Scenarios

**404 Not Found**

```
{
  "success": false,
  "message": "The requested project could not be found.",
  "error": {
    "code": "PROJECT_NOT_FOUND"
  }
}
```

---

# Assign Projects

| Property | Value |
| --- | --- |
| **Method** | POST |
| **Endpoint** | `/taskboard/api/v1/users/{user_id}/assign-projects` |
| **Description** | Assigns one or more projects to a user. |
| **Access** | Admin |

### API Flow

```
Client
   │
POST /users/{user_id}/assign-projects
   │
Authenticate User
   │
Authorize (Admin)
   │
Validate Request
   │
Verify User & Projects
   │
Assign Projects
   │
Return Response
```

### Request Body

```
{
  "project_ids": [
    "7c9c3a5d-f1d2-4a4d-8e42-c2c43f3c9f0d",
    "5e8b2c1d-3a5b-4d6f-a7c8-9b2d3f4e5a6b"
  ]
}
```

### Positive Response

**HTTP 200 OK**

```
{
  "success": true,
  "message": "Projects assigned successfully.",
  "data": {
    "user_id": "e4a52f74-9b54-4c72-8d5d-7a2e1e2c84d3",
    "assigned_projects": 2
  }
}
```

### Negative Scenarios

#### Authentication Required

**HTTP 401 Unauthorized**

```
{
  "success": false,
  "message": "Authentication is required to access this resource.",
  "error": {
    "code": "MISSING_AUTH_TOKEN"
  }
}
```

---

#### Insufficient Permissions

**HTTP 403 Forbidden**

```
{
  "success": false,
  "message": "You do not have permission to assign projects.",
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS"
  }
}
```

---

#### User or Project Not Found

**HTTP 404 Not Found**

```
{
  "success": false,
  "message": "The specified user or one or more projects could not be found.",
  "error": {
    "code": "RESOURCE_NOT_FOUND"
  }
}
```

---

#### Validation Failed

**HTTP 422 Unprocessable Entity**

```
{
  "success": false,
  "message": "Validation failed. Please review the submitted project assignments.",
  "errors": [
    {
      "field": "project_ids",
      "message": "At least one project must be selected."
    }
  ]
}
```

---

# Remove Project Assignment

| Property | Value |
| --- | --- |
| **Method** | DELETE |
| **Endpoint** | `/taskboard/api/v1/users/{user_id}/assign-projects` |
| **Description** | Removes a project assignment from a user. |
| **Access** | Admin |

### API Flow

```
Client
   │
DELETE /users/{user_id}/assign-projects
   │
Authenticate User
   │
Authorize (Admin)
   │
Validate Request
   │
Remove Assignment
   │
Return Response
```

### Request Body

```
{
  "project_id": "7c9c3a5d-f1d2-4a4d-8e42-c2c43f3c9f0d"
}
```

### Positive Response

**HTTP 200 OK**

```
{
  "success": true,
  "message": "Project assignment removed successfully."
}
```

### Negative Scenarios

#### Authentication Required

**HTTP 401 Unauthorized**

```
{
  "success": false,
  "message": "Authentication is required to access this resource.",
  "error": {
    "code": "MISSING_AUTH_TOKEN"
  }
}
```

---

#### Assignment Not Found

**HTTP 404 Not Found**