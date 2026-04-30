# TaskFlow — Task Management Application
## Complete Requirements Specification

---

## 1. Project Overview

**Project Name:** task-management-app  
**Package:** com.nazir.taskmanagement  
**Tech Stack:** Java 21 · Spring Boot 3.3 · Spring Security 6 · JWT · H2 (dev) / PostgreSQL (prod) · Flyway · Lombok · OpenAPI 3  
**Purpose:** Production-ready Jira/Trello clone for portfolio & learning

---

## 2. Functional Requirements

### 2.1 Authentication & Authorization
| ID   | Requirement |
|------|-------------|
| FR-01 | Users can register with username, email, password, first/last name |
| FR-02 | Users can login with username OR email + password |
| FR-03 | Authentication uses JWT bearer tokens (24h expiry) |
| FR-04 | Roles: ROLE_USER, ROLE_MANAGER, ROLE_ADMIN |
| FR-05 | Admin-only endpoints protected with `@PreAuthorize` |
| FR-06 | Passwords must contain uppercase, lowercase, and digit (min 8 chars) |
| FR-07 | Token stored client-side; all protected APIs require `Authorization: Bearer <token>` |

### 2.2 User Management
| ID   | Requirement |
|------|-------------|
| FR-10 | Users can view and update their own profile (name, avatar) |
| FR-11 | Users can change their password (current password verification required) |
| FR-12 | Users can search other users by name/email (for assignment) |
| FR-13 | Admin can list all users |

### 2.3 Project Management
| ID   | Requirement |
|------|-------------|
| FR-20 | Users can create projects with name, description, unique key |
| FR-21 | Project key auto-generated from name if not provided |
| FR-22 | Project creator becomes owner and first member |
| FR-23 | Owner can add/remove members from project |
| FR-24 | Users can view all projects they own or are a member of |
| FR-25 | Owner/admin can update project name, description, status |
| FR-26 | Owner/admin can delete project (cascades all tasks/comments) |
| FR-27 | Project statuses: ACTIVE, ON_HOLD, COMPLETED, ARCHIVED |

### 2.4 Task Management
| ID   | Requirement |
|------|-------------|
| FR-30 | Project members can create tasks with title, description, type, status, priority |
| FR-31 | Task number auto-generated as `{PROJECT_KEY}-{N}` (e.g., `TMA-7`) |
| FR-32 | Task types: TASK, BUG, FEATURE, STORY, EPIC |
| FR-33 | Task statuses: BACKLOG, TODO, IN_PROGRESS, IN_REVIEW, DONE, CANCELLED |
| FR-34 | Task priorities: LOW, MEDIUM, HIGH, CRITICAL |
| FR-35 | Tasks can be assigned to any project member |
| FR-36 | Tasks support due date, estimated hours, logged hours |
| FR-37 | Tasks with passed due date and non-terminal status are flagged as overdue |
| FR-38 | Reporter or project owner can delete a task |
| FR-39 | Paginated task listing with filters: status, priority, type, assignee |
| FR-40 | Board endpoint returns all tasks for Kanban view (ungrouped) |
| FR-41 | PATCH `/tasks/{id}/status` supports fast status updates (drag & drop) |
| FR-42 | Users can search tasks by title, description, task number |
| FR-43 | "My Tasks" endpoint returns tasks assigned to the current user |

### 2.5 Comments
| ID   | Requirement |
|------|-------------|
| FR-50 | Project members can add comments to tasks |
| FR-51 | Comment author can edit their own comment |
| FR-52 | Author, project owner, or admin can delete a comment |
| FR-53 | Comments returned in chronological order |

### 2.6 Activity Log
| ID   | Requirement |
|------|-------------|
| FR-60 | Task creation, status changes, priority changes, and assignee changes are logged |
| FR-61 | Activity log stores old and new values for field changes |
| FR-62 | Activities returned in reverse-chronological order per task |

### 2.7 Dashboard
| ID   | Requirement |
|------|-------------|
| FR-70 | Dashboard returns: my active tasks count, completed, in-progress, overdue |
| FR-71 | Task counts grouped by status (for distribution chart) |
| FR-72 | 5 most recently updated tasks across all user's projects |
| FR-73 | Tasks due within the next 7 days |

---

## 3. Non-Functional Requirements

| ID    | Category     | Requirement |
|-------|--------------|-------------|
| NFR-01 | Security    | BCrypt password hashing (cost factor 12) |
| NFR-02 | Security    | CORS configured; CSRF disabled (stateless JWT API) |
| NFR-03 | Security    | Sensitive endpoints require authentication |
| NFR-04 | Performance | Database indexes on tasks.project_id, tasks.assignee_id, tasks.status |
| NFR-05 | Performance | Lazy loading on all entity associations |
| NFR-06 | Scalability | HikariCP connection pool (prod: max 10) |
| NFR-07 | Reliability  | Flyway migrations for reproducible schema management |
| NFR-08 | Observability | Spring Actuator: /actuator/health, /actuator/metrics |
| NFR-09 | Documentation | OpenAPI 3 / Swagger UI at /swagger-ui.html |
| NFR-10 | Portability  | H2 in-memory for dev, PostgreSQL for prod (profile-based) |
| NFR-11 | Code Quality | Global exception handler with structured error responses |
| NFR-12 | Code Quality | Bean Validation on all request DTOs |
| NFR-13 | Testability  | Unit tests for AuthService, TaskService |
| NFR-14 | Testability  | Integration test verifying Spring context loads |

---

## 4. API Endpoints Summary

### Auth — `/api/auth`
| Method | Path            | Auth | Description |
|--------|-----------------|------|-------------|
| POST   | /register       | ❌   | Register new user |
| POST   | /login          | ❌   | Login and get JWT |
| GET    | /me             | ✅   | Get current user |

### Users — `/api/users`
| Method | Path                 | Auth | Description |
|--------|----------------------|------|-------------|
| GET    | /profile             | ✅   | Get my profile |
| PUT    | /profile             | ✅   | Update my profile |
| POST   | /change-password     | ✅   | Change password |
| GET    | /search?query=       | ✅   | Search users |
| GET    | /                    | ✅🔐 | All users (Admin) |
| GET    | /{id}               | ✅   | Get user by ID |

### Projects — `/api/projects`
| Method | Path                        | Auth | Description |
|--------|-----------------------------|------|-------------|
| POST   | /                           | ✅   | Create project |
| GET    | /                           | ✅   | My projects |
| GET    | /{id}                       | ✅   | Get project |
| PUT    | /{id}                       | ✅   | Update project |
| DELETE | /{id}                       | ✅   | Delete project |
| POST   | /{id}/members/{userId}      | ✅   | Add member |
| DELETE | /{id}/members/{userId}      | ✅   | Remove member |

### Tasks — `/api`
| Method | Path                               | Auth | Description |
|--------|------------------------------------|------|-------------|
| POST   | /projects/{id}/tasks               | ✅   | Create task |
| GET    | /projects/{id}/tasks               | ✅   | List tasks (paginated + filtered) |
| GET    | /projects/{id}/tasks/board         | ✅   | Board view (all tasks) |
| GET    | /tasks/{id}                        | ✅   | Get task |
| PUT    | /tasks/{id}                        | ✅   | Full update |
| PATCH  | /tasks/{id}/status                 | ✅   | Update status only |
| PATCH  | /tasks/{id}/assign/{assigneeId}    | ✅   | Assign task |
| DELETE | /tasks/{id}                        | ✅   | Delete task |
| GET    | /tasks/my                          | ✅   | My assigned tasks |
| GET    | /tasks/dashboard                   | ✅   | Dashboard stats |
| GET    | /tasks/search?q=                   | ✅   | Full-text search |
| GET    | /tasks/{id}/activities             | ✅   | Activity log |

### Comments — `/api`
| Method | Path                       | Auth | Description |
|--------|----------------------------|------|-------------|
| POST   | /tasks/{id}/comments       | ✅   | Add comment |
| GET    | /tasks/{id}/comments       | ✅   | Get comments |
| PUT    | /comments/{id}             | ✅   | Edit comment |
| DELETE | /comments/{id}             | ✅   | Delete comment |

---

## 5. Data Models

```
users            projects           tasks
──────────────   ───────────────    ──────────────────
id               id                 id
username         name               task_number (TMA-1)
email            description        title
password         key (TMA)          description
first_name       status             status
last_name        owner_id           priority
avatar           task_counter       type
role             created_at         project_id
enabled          updated_at         assignee_id
created_at                          reporter_id
updated_at       project_members    due_date
                 ─────────────      estimated_hours
comments         project_id         logged_hours
─────────────    user_id            created_at
id                                  updated_at
content          task_activities
task_id          ───────────────
author_id        id
created_at       task_id
updated_at       user_id
                 action
                 field_name
                 old_value
                 new_value
                 created_at
```

---

## 6. Implementation Phases

### ✅ Phase 1 — Core Backend + Frontend (THIS RELEASE)
- Full Spring Boot project structure with Java 21
- JWT auth, user registration/login
- Project CRUD with member management
- Task CRUD with full filter/search/pagination
- Kanban board endpoint + drag-and-drop frontend
- Comments and Activity log
- Dashboard statistics
- Flyway migration V1
- Bean validation + global exception handler
- OpenAPI / Swagger docs
- H2 dev profile + PostgreSQL prod profile
- Seed data (3 users, 1 project, 10 tasks)
- Single-page frontend (HTML + CSS + Vanilla JS)
- Unit tests (AuthService, TaskService)
- Integration test

### 🔜 Phase 2 — Advanced Features
- Email notifications (Spring Mail + Thymeleaf templates)
- File attachments on tasks
- Task labels/tags
- Sprint / milestone management
- Subtasks and task dependencies
- Time logging (detailed entries)
- Role-based project permissions (Viewer vs Editor)
- Refresh token + token rotation
- Rate limiting (Bucket4j)
- Redis caching for dashboard stats
- Docker Compose setup (app + db)

### 🔜 Phase 3 — Enterprise
- WebSocket real-time updates (Kanban board sync)
- Multi-tenant architecture
- Audit trail for all entities
- Data export (PDF/CSV)
- Webhook integrations
- OAuth2 (Google, GitHub) login
- Admin dashboard with user management
- Kubernetes deployment manifests

---

## 7. Running the Project

### Development (H2 in-memory)
```bash
cd task-management-app
./mvnw spring-boot:run
```
- App: http://localhost:8080
- Swagger: http://localhost:8080/swagger-ui.html
- H2 Console: http://localhost:8080/h2-console

### Demo Credentials
| User  | Password    | Role    |
|-------|-------------|---------|
| admin | Admin@123   | ADMIN   |
| demo  | Demo@123    | USER    |
| alice | Alice@123   | MANAGER |

### Production (PostgreSQL)
```bash
export DATABASE_URL=jdbc:postgresql://localhost:5432/taskmanagerdb
export DATABASE_USERNAME=postgres
export DATABASE_PASSWORD=yourpassword
export JWT_SECRET=your-256-bit-base64-secret

./mvnw spring-boot:run -Dspring.profiles.active=prod
```

### Run Tests
```bash
./mvnw test
```
