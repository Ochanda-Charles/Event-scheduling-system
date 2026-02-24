# Event Scheduling System

> A **production-ready** RESTful scheduling API built with Node.js, Express, PostgreSQL, and Redis. Features JWT authentication, role-based access control, background email processing, team management, and real-time analytics.

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [System Architecture](#system-architecture)
4. [Project Structure](#project-structure)
5. [Database Design](#database-design)
6. [Data Flow Diagrams](#data-flow-diagrams)
7. [Middleware Pipeline](#middleware-pipeline)
8. [Auth System](#auth-system--jwt-in-a-stateless-world)
9. [Background Worker Pattern](#the-background-worker-pattern)
10. [API Endpoints](#api-endpoints)
11. [Performance & Design Decisions](#performance--design-decisions)
12. [Getting Started](#getting-started)

---

## Overview

This is a **RESTful scheduling API** that allows users to:

- Register and authenticate with **JWT tokens**
- Create, manage, and cancel **bookings** (appointments/events)
- Organise into **teams** with role-based membership
- Receive **in-app notifications** for every meaningful action
- Receive **email confirmations** processed asynchronously in the background
- Track usage with an **analytics event** system

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Runtime** | Node.js + Express 5 | Async-first, non-blocking I/O, industry standard |
| **Database** | PostgreSQL | Relational integrity, powerful SQL, JSONB support |
| **Queue** | Redis + Bull + ioredis | In-memory speed, perfect for persistent background jobs |
| **Auth** | JWT (jsonwebtoken) | Stateless - no server-side session storage needed |
| **Password Hashing** | bcryptjs | One-way hashing with salt rounds - industry standard |
| **Security** | Helmet + CORS | Sets HTTP security headers, controls cross-origin access |
| **Logging** | Morgan | HTTP request logger in dev/production |
| **Dev Tooling** | Nodemon | Auto-restart on file save |

---

## System Architecture

The system runs as **two completely independent processes** that communicate only through Redis:

```mermaid
graph TD
    Client["Client<br/>(Browser / Mobile / API Tool)"]

    subgraph Process1["Process 1 - server.js (HTTP Server)"]
        MW["Global Middleware<br/>Helmet, CORS, Morgan, JSON Parser"]
        Router["Express Router<br/>/auth, /users, /bookings<br/>/organizations, /analytics, /notifications"]
        Auth["Auth Middleware<br/>Verify JWT -> req.user"]
        Role["Role Middleware<br/>Check req.user.role"]
        Handler["Route Handler<br/>Business Logic + Validation"]
        Model["Model Layer<br/>Parameterised SQL Queries"]
    end

    subgraph Process2["Process 2 - worker.js (Background Worker)"]
        Processor["Job Processor<br/>emailQueue.process()"]
        Templates["Email Templates<br/>BOOKING_CONFIRMATION<br/>BOOKING_CANCELLED<br/>WELCOME, ORG_INVITE"]
        Sender["Email Sender<br/>Mock (dev) / SendGrid / Resend"]
    end

    subgraph Storage["Persistent Storage"]
        PG[("PostgreSQL<br/>users, bookings<br/>organizations, notifications<br/>analytics_events")]
        Redis[("Redis<br/>Bull Job Queue")]
    end

    Client -->|"HTTP Request"| MW
    MW --> Router
    Router --> Auth
    Auth --> Role
    Role --> Handler
    Handler -->|"SQL Query"| Model
    Model <-->|"Query / Result"| PG
    Handler -->|"emailQueue.add(job)<br/>fire-and-forget"| Redis
    Handler -->|"201 Response<br/>~50ms"| Client
    Redis -->|"Job dequeued"| Processor
    Processor --> Templates
    Templates --> Sender
    Sender -->|"Email delivered"| Client
```

> **Key insight:** The HTTP server **never waits** for the email to send. It drops the job into Redis and responds instantly. The worker picks it up independently - this is the **fire-and-forget** pattern.

---

## Project Structure

```
backend/
|
+-- server.js              <- HTTP server entry point (Process 1)
+-- worker.js              <- Background worker entry point (Process 2)
|
+-- config/
|   +-- database.js        <- PostgreSQL connection pool (persistent, reused)
|   +-- redis.js           <- Redis connection settings (TLS for cloud)
|   +-- email.js           <- Email provider config (mock / sendgrid / resend)
|
+-- db/
|   +-- init.sql           <- CREATE TABLE statements + indexes
|   +-- migrate.js         <- Runs init.sql against the database
|
+-- middleware/
|   +-- authMiddleware.js  <- Verifies JWT, attaches req.user
|   +-- roleMiddleware.js  <- Higher-order fn: roleMiddleware('admin')
|   +-- errorHandler.js    <- Global error catcher (4-param Express fn)
|
+-- models/
|   +-- userModel.js          <- findByEmail, create, findById, update
|   +-- bookingModel.js       <- create, findAllByUser, findById, cancel, update
|   +-- organizationModel.js  <- CRUD + addMember, removeMember, getMembers
|   +-- notificationModel.js  <- create, markAsRead, markAllAsRead, findUnread
|   +-- analyticsModel.js     <- logEvent, getDashboardSummary, getQuickStats
|
+-- routes/
|   +-- auth.js            <- /register, /login, /logout, /verify
|   +-- users.js           <- /me (GET, PATCH), /me/password, / (admin)
|   +-- bookings.js        <- Full CRUD, triggers emails + notifications
|   +-- organizations.js   <- CRUD + nested /members routes
|   +-- notifications.js   <- Read/delete notification management
|   +-- analytics.js       <- Event logging + dashboard aggregations
|
+-- workers/
|   +-- emailQueue.js      <- Bull Queue definition (shared between processes)
|
+-- .env.example           <- Safe template (no real secrets)
+-- .gitignore             <- Excludes .env and node_modules
+-- package.json
```

---

## Database Design

### Entity Relationship Diagram

```mermaid
erDiagram
    USERS {
        serial id PK
        varchar email UK
        varchar password_hash
        varchar name
        varchar role
        timestamp created_at
        timestamp updated_at
    }

    ORGANIZATIONS {
        serial id PK
        varchar name
        integer owner_id FK
        timestamp created_at
        timestamp updated_at
    }

    ORGANIZATION_MEMBERS {
        serial id PK
        integer organization_id FK
        integer user_id FK
        varchar role
        timestamp joined_at
    }

    BOOKINGS {
        serial id PK
        integer user_id FK
        varchar title
        timestamp start_time
        timestamp end_time
        varchar status
        timestamp created_at
        timestamp updated_at
    }

    ANALYTICS_EVENTS {
        serial id PK
        integer user_id FK
        varchar event_type
        jsonb metadata
        timestamp created_at
    }

    NOTIFICATIONS {
        serial id PK
        integer user_id FK
        varchar type
        varchar title
        text message
        boolean is_read
        jsonb metadata
        timestamp created_at
    }

    USERS ||--o{ BOOKINGS : "creates"
    USERS ||--o{ ORGANIZATIONS : "owns"
    USERS ||--o{ ORGANIZATION_MEMBERS : "belongs to"
    ORGANIZATIONS ||--o{ ORGANIZATION_MEMBERS : "has"
    USERS ||--o{ NOTIFICATIONS : "receives"
    USERS ||--o{ ANALYTICS_EVENTS : "generates"
```

### Table Design Decisions

| Table | Key Design Choice | Why |
|---|---|---|
| `users` | `password_hash` - never stores plaintext | Security - bcrypt one-way hash |
| `bookings` | `status` field (`confirmed`/`cancelled`) instead of hard DELETE | Soft delete - preserves analytics history |
| `organization_members` | `UNIQUE(organization_id, user_id)` constraint | Prevents duplicate membership at the DB level |
| `analytics_events` | `metadata JSONB` column | Flexible payload - different event types carry different data without schema migrations |
| `notifications` | `is_read BOOLEAN` with composite index `(user_id, is_read)` | Unread badge count query is served entirely from index - no table scan |

---

## Data Flow Diagrams

### 1. User Registration Flow

```mermaid
sequenceDiagram
    actor Client
    participant Server
    participant DB as PostgreSQL

    Client->>Server: POST /api/v1/auth/register<br/>{ name, email, password }

    Server->>Server: Validate fields (name, email, password)
    Server->>Server: Validate email format (regex)
    Server->>Server: Check password length >= 6

    Server->>DB: SELECT * FROM users WHERE email = ?
    DB-->>Server: null (user not found)

    Server->>Server: bcrypt.genSalt(10)<br/>bcrypt.hash(password, salt)

    Server->>DB: INSERT INTO users (name, email, password_hash)<br/>RETURNING id, name, email, role
    DB-->>Server: { id: 1, name, email, role: 'member' }

    Server->>Server: jwt.sign({ id, email, role }, SECRET, 7d)

    Server-->>Client: 201 { token, user: { id, name, email } }
```

---

### 2. Authenticated Request Flow (Login then Create Booking)

```mermaid
sequenceDiagram
    actor Client
    participant Server
    participant AuthMW as authMiddleware
    participant Handler as Route Handler
    participant DB as PostgreSQL
    participant Redis

    Note over Client,Redis: Step 1 - Login

    Client->>Server: POST /api/v1/auth/login<br/>{ email, password }
    Server->>DB: SELECT * FROM users WHERE email = ?
    DB-->>Server: user row with password_hash
    Server->>Server: bcrypt.compare(password, hash) OK
    Server->>Server: jwt.sign({ id, email, role }, SECRET)
    Server-->>Client: 200 { token: "eyJ..." }

    Note over Client,Redis: Step 2 - Create Booking (token attached)

    Client->>Server: POST /api/v1/bookings<br/>Authorization: Bearer eyJ...<br/>{ title, start, end }

    Server->>AuthMW: Extract Bearer token
    AuthMW->>AuthMW: jwt.verify(token, SECRET)
    AuthMW->>AuthMW: Attach decoded payload to req.user
    AuthMW->>Handler: next() OK

    Handler->>Handler: Validate title, start, end present
    Handler->>Handler: Check start is not in the past
    Handler->>Handler: Check end is after start

    Handler->>DB: INSERT INTO bookings (user_id, title, start_time, end_time)
    DB-->>Handler: booking { id, title, start_time, end_time }

    Handler->>Redis: emailQueue.add({ email, type: 'BOOKING_CONFIRMATION', data })
    Note right of Redis: Fire and forget - no await

    Handler->>DB: INSERT INTO notifications (user_id, type, title, message)
    DB-->>Handler: notification created OK

    Handler-->>Client: 201 { message: 'Booking created', booking }
    Note over Client: Response received in ~50ms
```

---

### 3. Background Email Worker Flow

```mermaid
sequenceDiagram
    participant Redis
    participant Worker as worker.js
    participant Templates as Email Templates
    participant EmailAPI as Email Provider<br/>(Mock / SendGrid / Resend)

    Note over Redis,EmailAPI: This runs in a SEPARATE process from server.js

    Redis->>Worker: Job dequeued from 'emails' queue<br/>{ email, type: 'BOOKING_CONFIRMATION', data }

    Worker->>Worker: emailQueue.process(async (job) => ...)
    Worker->>Worker: Extract { email, type, data } from job.data

    Worker->>Templates: templateFn = emailTemplates[type]
    Templates-->>Worker: { subject: "Booking Confirmed: ...",<br/>body: "Hi there! Your booking..." }

    Worker->>EmailAPI: sendEmail(to, subject, body)

    alt EMAIL_PROVIDER = 'mock' (development)
        EmailAPI->>EmailAPI: Simulate delay (1-3 seconds)
        EmailAPI-->>Worker: { success: true, provider: 'mock' }
        Note right of Worker: Logs to console
    else EMAIL_PROVIDER = 'sendgrid' (production)
        EmailAPI->>EmailAPI: POST to SendGrid API
        EmailAPI-->>Worker: { success: true, provider: 'sendgrid' }
    end

    Worker->>Worker: emit 'completed' event OK

    Note over Redis,Worker: If sendEmail() throws, Bull retries automatically (3 attempts)
```

---

### 4. Organization Member Invite Flow

```mermaid
sequenceDiagram
    actor Owner
    participant Server
    participant DB as PostgreSQL
    participant Notifications as Notification System

    Owner->>Server: POST /api/v1/organizations/:id/members<br/>{ email: "newmember@example.com", role: "member" }

    Server->>Server: authMiddleware - verify Owner's JWT

    Server->>DB: SELECT * FROM organizations WHERE id = ?
    DB-->>Server: org { id, name, owner_id }

    Server->>Server: Check org.owner_id === req.user.id
    Note right of Server: 403 Forbidden if not owner

    Server->>DB: SELECT * FROM users WHERE email = 'newmember@example.com'
    DB-->>Server: userToAdd { id, name, email }

    Server->>DB: INSERT INTO organization_members<br/>(organization_id, user_id, role)<br/>ON CONFLICT returns null (already member check)
    DB-->>Server: member record OK

    Server->>Notifications: NotificationModel.create(<br/>userToAdd.id,<br/>'ORG_INVITE',<br/>'You have been added to TeamName',<br/>metadata: { organization_id }<br/>)
    Notifications->>DB: INSERT INTO notifications
    DB-->>Notifications: OK

    Server-->>Owner: 201 { message: 'Member added', member }

    Note over DB,Notifications: New member sees notification<br/>on their next request to /notifications/unread
```

---

### 5. Analytics Dashboard Query Flow

```mermaid
flowchart TD
    A["GET /api/v1/analytics/dashboard?days=30"] --> B["authMiddleware\nVerify JWT"]
    B --> C["Parse ?days query param\nDefault: 30"]
    C --> D["Promise.all - fire both queries simultaneously"]

    D --> E["getDashboardSummary(30)\nSELECT event_type, COUNT, unique_users\nFROM analytics_events\nWHERE created_at >= NOW() - 30 days\nGROUP BY event_type"]

    D --> F["getQuickStats(30)\nSELECT total_events,\nunique_users, event_types\nFROM analytics_events\nWHERE created_at >= NOW() - 30 days"]

    E --> G["Merge Results"]
    F --> G

    G --> H["200 Response\n{ period, overview, breakdown }"]

    style D fill:#1a1a2e,color:#fff
    style E fill:#16213e,color:#fff
    style F fill:#16213e,color:#fff
    style G fill:#0f3460,color:#fff
```

---

## Middleware Pipeline

Every HTTP request passes through this **ordered pipeline** before reaching a route handler:

```mermaid
flowchart TD
    Req["Incoming HTTP Request"] --> H

    H["Helmet\nSets 11 security headers\nXSS-Protection, HSTS, CSP\nX-Frame-Options, MIME sniff block"]
    H --> C

    C["CORS\nControls allowed origins\nIn prod: restrict to your-frontend.com"]
    C --> M

    M["Morgan\nLogs every request:\nGET /api/v1/users 200 34ms"]
    M --> J

    J["express.json()\nParses request body\nreq.body = { title, start, end }"]
    J --> Decision

    Decision{{"Is route\nprotected?"}}
    Decision -- Yes --> AM
    Decision -- No --> RH

    AM["authMiddleware\nExtract Bearer token\njwt.verify(token, SECRET)\nAttach req.user = { id, email, role }"]
    AM -- "Invalid" --> E401["401 Unauthorized"]
    AM -- "Valid" --> RM

    RM{"Role check\nrequired?"}
    RM -- Yes --> RoleMW
    RM -- No --> RH

    RoleMW["roleMiddleware('admin')\nCheck req.user.role in allowedRoles"]
    RoleMW -- "Wrong role" --> E403["403 Forbidden"]
    RoleMW -- "Allowed" --> RH

    RH["Route Handler\nValidation then Model then DB\nBusiness Logic"]
    RH -- "Success" --> Res["JSON Response"]
    RH -- "Error thrown" --> EH

    EH["Global Error Handler\nLogs full stack trace (dev only)\nReturns clean { error } JSON"]

    style Req fill:#2d6a4f,color:#fff
    style Res fill:#2d6a4f,color:#fff
    style E401 fill:#c1121f,color:#fff
    style E403 fill:#c1121f,color:#fff
    style EH fill:#c1121f,color:#fff
```

---

## Auth System - JWT in a Stateless World

### How JWT Authentication Works

```mermaid
flowchart LR
    subgraph Registration ["Registration"]
        R1["Receive name, email, password"]
        R2["Validate input"]
        R3["bcrypt.hash password\nsalt rounds = 10"]
        R4["INSERT INTO users"]
        R5["jwt.sign payload\nexpires in 7 days"]
        R1 --> R2 --> R3 --> R4 --> R5
    end

    subgraph Token ["JWT Token"]
        T1["Header\n{ alg: HS256 }"]
        T2["Payload\n{ id, email, role\niat, exp }"]
        T3["Signature\nHMAC-SHA256(header.payload, SECRET)"]
    end

    subgraph ProtectedReq ["Protected Request"]
        P1["Client sends:\nAuthorization: Bearer eyJ..."]
        P2["jwt.verify(token, SECRET)"]
        P3["Decode payload\nreq.user = { id, email, role }"]
        P4["Route executes\nwith user context"]
        P1 --> P2 --> P3 --> P4
    end

    R5 --> Token
    Token -->|"Stored by client\n(localStorage / cookie)"| P1

    style Registration fill:#1a1a2e,color:#fff
    style Token fill:#16213e,color:#fff
    style ProtectedReq fill:#0f3460,color:#fff
```

### Why Stateless JWT vs Sessions?

| | **JWT (this project)** | **Session-based** |
|---|---|---|
| **Server storage** | None - token is self-contained | Server stores session in DB/Redis |
| **Scalability** | Any server can verify the same token | All servers must share session store |
| **Expiry** | Built into token (`exp` claim) | Server must clean up expired sessions |
| **Logout** | Client deletes token | Server deletes session record |
| **Tradeoff** | Token can't be revoked before expiry | Full control over session lifecycle |

---

## The Background Worker Pattern

### The Problem with Synchronous Email

```mermaid
flowchart TD
    subgraph BAD ["Synchronous - Blocking the HTTP Thread"]
        B1["Client sends POST /bookings"]
        B2["Save booking to DB\n~10ms"]
        B3["Call SendGrid API\nWait for response...\n1,000-5,000ms"]
        B4["Create notification\n~5ms"]
        B5["Respond to client\nTotal: ~5 seconds"]
        B1 --> B2 --> B3 --> B4 --> B5
    end

    subgraph GOOD ["Asynchronous - Fire and Forget"]
        G1["Client sends POST /bookings"]
        G2["Save booking to DB\n~10ms"]
        G3["emailQueue.add(job)\nDrops job in Redis\n~2ms"]
        G4["Create notification\n~5ms"]
        G5["Respond to client\nTotal: ~50ms"]
        G6["(Background)\nWorker picks up job\nSendGrid API called\nEmail delivered"]
        G1 --> G2 --> G3 --> G4 --> G5
        G3 -.->|"Async"| G6
    end

    style BAD fill:#3d0000,color:#fff
    style GOOD fill:#003d00,color:#fff
```

### Bull Queue - Three Redis Connections

When connecting to cloud Redis (Upstash), Bull internally creates **3 separate Redis connections** for different purposes. Each must be configured identically with TLS settings:

```mermaid
graph TD
    Bull["Bull Queue\nemailQueue"] --> C1
    Bull --> C2
    Bull --> C3

    C1["Connection 1: client\nSends commands\nnew Redis(REDIS_URL, config)"]
    C2["Connection 2: subscriber\nListens for pub/sub events\nnew Redis(REDIS_URL, config)"]
    C3["Connection 3: bclient\nBlocking client for job polling\nnew Redis(REDIS_URL, config)"]

    C1 --> RedisDB[("Redis\nUpstash Cloud\nTLS rediss://")]
    C2 --> RedisDB
    C3 --> RedisDB

    style RedisDB fill:#c1121f,color:#fff
    style Bull fill:#1a1a2e,color:#fff
```

```javascript
// The createClient pattern - ensures ALL 3 connections use TLS:
const emailQueue = new Queue('emails', {
    createClient: function (type) {
        return new Redis(process.env.REDIS_URL, {
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
            tls: { rejectUnauthorized: false } // Required for Upstash
        });
    }
});
```

---

## API Endpoints

All routes are prefixed with `/api/v1/`. `[auth]` = requires JWT, `[admin]` = admin role only.

### Auth - `/auth`
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/register` | Create account, returns JWT |
| `POST` | `/auth/login` | Login with email+password, returns JWT |
| `POST` | `/auth/logout` `[auth]` | Stateless logout (clears client-side) |
| `GET` | `/auth/verify` `[auth]` | Validate token is still live |

### Users - `/users`
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/users/me` `[auth]` | Get my profile |
| `PATCH` | `/users/me` `[auth]` | Update name and/or email |
| `PATCH` | `/users/me/password` `[auth]` | Change password (requires current password) |
| `GET` | `/users` `[auth]` `[admin]` | List all users |

### Bookings - `/bookings`
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/bookings` `[auth]` | Create, triggers confirmation email + notification |
| `GET` | `/bookings` `[auth]` | List all my bookings |
| `GET` | `/bookings/:id` `[auth]` | View one booking |
| `PATCH` | `/bookings/:id` `[auth]` | Update title/times |
| `DELETE` | `/bookings/:id` `[auth]` | Soft-cancel, triggers cancellation email + notification |

### Organizations - `/organizations`
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/organizations` `[auth]` | Create org (creator auto-added as admin) |
| `GET` | `/organizations` `[auth]` | List orgs I own |
| `GET` | `/organizations/:id` `[auth]` | View org details + member list |
| `PATCH` | `/organizations/:id` `[auth]` | Rename org (owner only) |
| `DELETE` | `/organizations/:id` `[auth]` | Delete org + cascade remove members |
| `POST` | `/organizations/:id/members` `[auth]` | Add member by email, triggers notification |
| `GET` | `/organizations/:id/members` `[auth]` | List all members |
| `DELETE` | `/organizations/:id/members/:userId` `[auth]` | Remove a member |

### Notifications - `/notifications`
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/notifications` `[auth]` | All notifications (unread first) |
| `GET` | `/notifications/unread` `[auth]` | Unread only |
| `GET` | `/notifications/count` `[auth]` | Unread count (for badge UI) |
| `PATCH` | `/notifications/read-all` `[auth]` | Mark all as read |
| `PATCH` | `/notifications/:id/read` `[auth]` | Mark one as read |
| `DELETE` | `/notifications/:id` `[auth]` | Delete a notification |

### Analytics - `/analytics`
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/analytics/event` | Log event (auth optional, supports anonymous) |
| `GET` | `/analytics/dashboard` `[auth]` | Aggregated stats (`?days=30`) |
| `GET` | `/analytics/events` `[auth]` `[admin]` | Raw event log with user info |

---

## Performance & Design Decisions

### 1. Database Connection Pooling

Opening a raw connection per request involves a full TCP handshake + SSL + auth challenge every time. That costs ~200ms. We keep **10 connections alive permanently** and share them across requests:

```mermaid
flowchart LR
    subgraph Pool ["pg.Pool - 10 Persistent Connections"]
        C1["Conn 1"]
        C2["Conn 2"]
        C3["Conn 3"]
        CD["..."]
        C10["Conn 10"]
    end

    R1["Request A"] -->|"borrow"| C1
    R2["Request B"] -->|"borrow"| C2
    R3["Request C"] -->|"borrow"| C3

    C1 -->|"return after query"| Pool
    C2 -->|"return after query"| Pool

    Pool <-->|"Persistent TCP + SSL"| DB[("PostgreSQL")]

    style Pool fill:#1a1a2e,color:#fff
    style DB fill:#2d6a4f,color:#fff
```

**Result:** `~2ms` connection overhead vs `~200ms` without pooling.

---

### 2. JSONB for Flexible Metadata

Both `analytics_events` and `notifications` store a `metadata JSONB` column. This avoids schema migrations every time a new event type carries different data:

```sql
-- The same column, completely different shapes - no ALTER TABLE needed:
{ "page": "/bookings", "device": "mobile" }       -- PAGE_VIEW event
{ "bookingId": 42, "durationHours": 2 }           -- BOOKING_CREATED event
{ "organizationId": 7, "role": "admin" }          -- ORG_INVITE notification
{ "ipAddress": "1.2.3.4", "reason": "invalid" }   -- LOGIN_FAILED event
```

---

### 3. Strategic Database Indexes

```mermaid
flowchart LR
    subgraph NoIndex ["No Index - Full Table Scan"]
        NI["SELECT * FROM analytics_events\nWHERE event_type = 'LOGIN'\n\nPostgres reads EVERY row\nO(n) - slow at scale"]
    end

    subgraph WithIndex ["With Index - B-Tree Lookup"]
        WI["CREATE INDEX idx_analytics_event_type\nON analytics_events(event_type)\n\nPostgres jumps directly to matches\nO(log n) - fast at any scale"]
    end

    style NoIndex fill:#3d0000,color:#fff
    style WithIndex fill:#003d00,color:#fff
```

Indexes applied:
```sql
-- Analytics dashboard filters by type and time constantly:
CREATE INDEX idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_created_at  ON analytics_events(created_at);

-- Unread badge count is hit on every page load:
-- Composite index covers BOTH conditions in one index scan:
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read);
```

---

### 4. Parallel Database Queries with `Promise.all()`

```mermaid
sequenceDiagram
    participant Handler as Route Handler
    participant DB as PostgreSQL

    Note over Handler,DB: Sequential - 2x the time
    Handler->>DB: getDashboardSummary()
    DB-->>Handler: result (50ms)
    Handler->>DB: getQuickStats()
    DB-->>Handler: result (50ms)
    Note right of Handler: Total: ~100ms

    Note over Handler,DB: Parallel with Promise.all()
    Handler->>DB: getDashboardSummary()
    Handler->>DB: getQuickStats()
    DB-->>Handler: both results arrive concurrently
    Note right of Handler: Total: ~50ms
```

---

### 5. Soft Deletes - History Over Erasure

Booking cancellation sets `status = 'cancelled'` rather than issuing a `DELETE`:

| Approach | History preserved | Analytics usable | Undo possible |
|---|---|---|---|
| Hard DELETE | No | No | No |
| Soft delete (status field) | Yes | Yes | Yes |

```sql
-- The booking row stays in the database - just marked as cancelled:
UPDATE bookings
SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND user_id = $2 AND status != 'cancelled'
RETURNING *;
```

---

### 6. Security Headers via Helmet

`app.use(helmet())` - one line, eleven protections:

| Header Injected | Attack Prevented |
|---|---|
| `X-XSS-Protection` | Reflected cross-site scripting |
| `X-Frame-Options: DENY` | Clickjacking via iframes |
| `Strict-Transport-Security` | HTTP downgrade attacks |
| `X-Content-Type-Options` | MIME-type sniffing |
| `Content-Security-Policy` | Inline script injection |

---

### 7. Strategy Pattern for Email Providers

The email system is designed so the **provider is swappable** with zero code changes - only an environment variable update:

```mermaid
flowchart TD
    Worker["worker.js\nreads emailConfig.provider"] --> Decision{{"EMAIL_PROVIDER\nenv variable"}}
    Decision -- "mock" --> Mock["Console.log\nSimulate 1-3s delay\nDevelopment only"]
    Decision -- "sendgrid" --> SG["@sendgrid/mail SDK\nProduction"]
    Decision -- "resend" --> Resend["resend SDK\nProduction"]

    style Mock fill:#1a1a2e,color:#fff
    style SG fill:#0f3460,color:#fff
    style Resend fill:#16213e,color:#fff
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL (local or cloud - [Neon](https://neon.tech), [Supabase](https://supabase.com))
- Redis (local or cloud - [Upstash](https://upstash.com))

### Setup

```bash
# 1. Enter the project directory and install dependencies
cd backend
npm install              # or: pnpm install

# 2. Configure environment
cp .env.example .env
# Edit .env - fill in DATABASE_URL, REDIS_URL, JWT_SECRET

# 3. Run database migrations (creates all tables + indexes)
node db/migrate.js

# 4. Start the API server
npm run dev              # Development - auto-restarts on save
# or
npm start               # Production

# 5. Start the background email worker (separate terminal)
node worker.js
```

### Health Check

```bash
curl http://localhost:3000/health
# Expected:
# { "status": "OK", "uptime": 12.4, "timestamp": "...", "environment": "development" }
```

### Quick Test

```bash
# Register a user
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice", "email": "alice@example.com", "password": "secure123"}'

# Login and capture token
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@example.com", "password": "secure123"}'

# Create a booking (replace <token> with JWT from login)
curl -X POST http://localhost:3000/api/v1/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"title": "Team standup", "start": "2026-04-01T09:00:00Z", "end": "2026-04-01T09:30:00Z"}'
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your values. **Never commit `.env` - it is listed in `.gitignore`.**

| Variable | Description | Example |
|---|---|---|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment flag | `development` or `production` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `REDIS_URL` | Redis connection string (use `rediss://` for TLS) | `rediss://default:token@host.upstash.io:6379` |
| `JWT_SECRET` | Secret for signing tokens - keep long and random | *(generate with `crypto.randomBytes(64)`)* |
| `EMAIL_PROVIDER` | Which email backend to use | `mock`, `sendgrid`, or `resend` |
| `EMAIL_API_KEY` | API key for your email provider | *(from SendGrid / Resend dashboard)* |
| `EMAIL_FROM` | The "From" address | `noreply@yourdomain.com` |
| `EMAIL_RATE_LIMIT` | Max emails per minute | `30` |
| `EMAIL_RETRY_ATTEMPTS` | Bull retry count on failure | `3` |

---

## License

ISC
