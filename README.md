# TaskFlow - Task Management Application

TaskFlow is a production-ready task and project management application inspired by Jira and Trello.  
Built with modern Spring Boot architecture, JWT authentication, Kanban workflows, and scalable backend design.

---

# Features

## Authentication & Security
- JWT-based authentication
- Login with username or email
- Role-based authorization
- BCrypt password encryption
- Stateless API security
- Protected endpoints with Spring Security

## User Management
- User registration & profile management
- Password change support
- User search functionality
- Admin user management

## Project Management
- Create and manage projects
- Auto-generated project keys
- Member management
- Project ownership & permissions
- Project status tracking

## Task Management
- Create, update, assign, and delete tasks
- Kanban board support
- Task filtering & pagination
- Task priorities and types
- Due dates and overdue detection
- Full-text task search
- Dashboard statistics

## Collaboration
- Task comments
- Activity logging
- Change history tracking

## Developer Features
- OpenAPI / Swagger documentation
- Flyway database migrations
- H2 development database
- PostgreSQL production support
- Global exception handling
- Validation support
- Unit & integration testing

---

# Tech Stack

| Technology | Version |
|------------|---------|
| Java | 21 |
| Spring Boot | 3.3 |
| Spring Security | 6 |
| JWT | Latest |
| H2 Database | Dev |
| PostgreSQL | Production |
| Flyway | Latest |
| Lombok | Latest |
| OpenAPI 3 | Latest |

---

# Project Structure

```text
src
├── main
│   ├── java/com/nazir/taskmanagement
│   │   ├── auth
│   │   ├── config
│   │   ├── controller
│   │   ├── dto
│   │   ├── entity
│   │   ├── exception
│   │   ├── repository
│   │   ├── security
│   │   ├── service
│   │   └── util
│   └── resources
│       ├── db/migration
│       ├── static
│       ├── templates
│       ├── application.yml
│       ├── application-dev.yml
│       └── application-prod.yml
└── test
```

---

# Functional Modules

## Authentication
- User registration
- JWT login
- Current user endpoint

## Users
- Profile update
- Change password
- Search users
- Admin user listing

## Projects
- CRUD operations
- Member management
- Ownership controls

## Tasks
- CRUD operations
- Assignment
- Status updates
- Kanban board API
- Filtering & searching
- Dashboard analytics

## Comments
- Add/edit/delete comments
- Chronological ordering

## Activity Logs
- Track task changes
- Audit history support

---

# API Endpoints

## Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Current authenticated user |

## Users

| Method | Endpoint |
|--------|----------|
| GET | `/api/users/profile` |
| PUT | `/api/users/profile` |
| POST | `/api/users/change-password` |
| GET | `/api/users/search?query=` |
| GET | `/api/users/{id}` |

## Projects

| Method | Endpoint |
|--------|----------|
| POST | `/api/projects` |
| GET | `/api/projects` |
| GET | `/api/projects/{id}` |
| PUT | `/api/projects/{id}` |
| DELETE | `/api/projects/{id}` |

## Tasks

| Method | Endpoint |
|--------|----------|
| POST | `/api/projects/{id}/tasks` |
| GET | `/api/projects/{id}/tasks` |
| GET | `/api/projects/{id}/tasks/board` |
| GET | `/api/tasks/{id}` |
| PUT | `/api/tasks/{id}` |
| PATCH | `/api/tasks/{id}/status` |
| PATCH | `/api/tasks/{id}/assign/{assigneeId}` |
| DELETE | `/api/tasks/{id}` |
| GET | `/api/tasks/my` |
| GET | `/api/tasks/dashboard` |
| GET | `/api/tasks/search?q=` |

---

# Database Design

## Core Tables
- users
- projects
- project_members
- tasks
- comments
- task_activities

## Relationships
- One user can own multiple projects
- One project contains multiple tasks
- Tasks can have comments and activities
- Projects support multiple members

---

# Running the Application

## Development Mode (H2)

```bash
git clone <repository-url>
cd task-management-app
./mvnw spring-boot:run
```

### URLs
- Application: http://localhost:8080
- Swagger UI: http://localhost:8080/swagger-ui.html
- H2 Console: http://localhost:8080/h2-console

---

# Demo Credentials

| Username | Password | Role |
|----------|----------|------|
| admin | Admin@123 | ADMIN |
| demo | Demo@123 | USER |
| alice | Alice@123 | MANAGER |

---

# Production Setup (PostgreSQL)

```bash
export DATABASE_URL=jdbc:postgresql://localhost:5432/taskmanagerdb
export DATABASE_USERNAME=postgres
export DATABASE_PASSWORD=yourpassword
export JWT_SECRET=your-256-bit-base64-secret

./mvnw spring-boot:run -Dspring.profiles.active=prod
```

---

# Running Tests

```bash
./mvnw test
```

---

# Security

- BCrypt password hashing
- JWT token authentication
- Stateless session management
- Role-based endpoint protection
- CORS configuration
- Bean validation

---

# Observability

Spring Boot Actuator endpoints:
- `/actuator/health`
- `/actuator/metrics`

---

# Testing

## Unit Tests
- AuthService
- TaskService

## Integration Tests
- Spring context loading
- API validation

