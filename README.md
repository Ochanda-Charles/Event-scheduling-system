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

![Diagram](https://mermaid.ink/img/Z3JhcGggVEQKICAgIENsaWVudFsiQ2xpZW50PGJyLz4oQnJvd3NlciAvIE1vYmlsZSAvIEFQSSBUb29sKSJdCgogICAgc3ViZ3JhcGggUHJvY2VzczFbIlByb2Nlc3MgMSAtIHNlcnZlci5qcyAoSFRUUCBTZXJ2ZXIpIl0KICAgICAgICBNV1siR2xvYmFsIE1pZGRsZXdhcmU8YnIvPkhlbG1ldCwgQ09SUywgTW9yZ2FuLCBKU09OIFBhcnNlciJdCiAgICAgICAgUm91dGVyWyJFeHByZXNzIFJvdXRlcjxici8+L2F1dGgsIC91c2VycywgL2Jvb2tpbmdzPGJyLz4vb3JnYW5pemF0aW9ucywgL2FuYWx5dGljcywgL25vdGlmaWNhdGlvbnMiXQogICAgICAgIEF1dGhbIkF1dGggTWlkZGxld2FyZTxici8+VmVyaWZ5IEpXVCAtPiByZXEudXNlciJdCiAgICAgICAgUm9sZVsiUm9sZSBNaWRkbGV3YXJlPGJyLz5DaGVjayByZXEudXNlci5yb2xlIl0KICAgICAgICBIYW5kbGVyWyJSb3V0ZSBIYW5kbGVyPGJyLz5CdXNpbmVzcyBMb2dpYyArIFZhbGlkYXRpb24iXQogICAgICAgIE1vZGVsWyJNb2RlbCBMYXllcjxici8+UGFyYW1ldGVyaXNlZCBTUUwgUXVlcmllcyJdCiAgICBlbmQKCiAgICBzdWJncmFwaCBQcm9jZXNzMlsiUHJvY2VzcyAyIC0gd29ya2VyLmpzIChCYWNrZ3JvdW5kIFdvcmtlcikiXQogICAgICAgIFByb2Nlc3NvclsiSm9iIFByb2Nlc3Nvcjxici8+ZW1haWxRdWV1ZS5wcm9jZXNzKCkiXQogICAgICAgIFRlbXBsYXRlc1siRW1haWwgVGVtcGxhdGVzPGJyLz5CT09LSU5HX0NPTkZJUk1BVElPTjxici8+Qk9PS0lOR19DQU5DRUxMRUQ8YnIvPldFTENPTUUsIE9SR19JTlZJVEUiXQogICAgICAgIFNlbmRlclsiRW1haWwgU2VuZGVyPGJyLz5Nb2NrIChkZXYpIC8gU2VuZEdyaWQgLyBSZXNlbmQiXQogICAgZW5kCgogICAgc3ViZ3JhcGggU3RvcmFnZVsiUGVyc2lzdGVudCBTdG9yYWdlIl0KICAgICAgICBQR1soIlBvc3RncmVTUUw8YnIvPnVzZXJzLCBib29raW5nczxici8+b3JnYW5pemF0aW9ucywgbm90aWZpY2F0aW9uczxici8+YW5hbHl0aWNzX2V2ZW50cyIpXQogICAgICAgIFJlZGlzWygiUmVkaXM8YnIvPkJ1bGwgSm9iIFF1ZXVlIildCiAgICBlbmQKCiAgICBDbGllbnQgLS0+fCJIVFRQIFJlcXVlc3QifCBNVwogICAgTVcgLS0+IFJvdXRlcgogICAgUm91dGVyIC0tPiBBdXRoCiAgICBBdXRoIC0tPiBSb2xlCiAgICBSb2xlIC0tPiBIYW5kbGVyCiAgICBIYW5kbGVyIC0tPnwiU1FMIFF1ZXJ5InwgTW9kZWwKICAgIE1vZGVsIDwtLT58IlF1ZXJ5IC8gUmVzdWx0InwgUEcKICAgIEhhbmRsZXIgLS0+fCJlbWFpbFF1ZXVlLmFkZChqb2IpPGJyLz5maXJlLWFuZC1mb3JnZXQifCBSZWRpcwogICAgSGFuZGxlciAtLT58IjIwMSBSZXNwb25zZTxici8+fjUwbXMifCBDbGllbnQKICAgIFJlZGlzIC0tPnwiSm9iIGRlcXVldWVkInwgUHJvY2Vzc29yCiAgICBQcm9jZXNzb3IgLS0+IFRlbXBsYXRlcwogICAgVGVtcGxhdGVzIC0tPiBTZW5kZXIKICAgIFNlbmRlciAtLT58IkVtYWlsIGRlbGl2ZXJlZCJ8IENsaWVudA==)

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

![Diagram](https://mermaid.ink/img/ZXJEaWFncmFtCiAgICBVU0VSUyB7CiAgICAgICAgc2VyaWFsIGlkIFBLCiAgICAgICAgdmFyY2hhciBlbWFpbCBVSwogICAgICAgIHZhcmNoYXIgcGFzc3dvcmRfaGFzaAogICAgICAgIHZhcmNoYXIgbmFtZQogICAgICAgIHZhcmNoYXIgcm9sZQogICAgICAgIHRpbWVzdGFtcCBjcmVhdGVkX2F0CiAgICAgICAgdGltZXN0YW1wIHVwZGF0ZWRfYXQKICAgIH0KCiAgICBPUkdBTklaQVRJT05TIHsKICAgICAgICBzZXJpYWwgaWQgUEsKICAgICAgICB2YXJjaGFyIG5hbWUKICAgICAgICBpbnRlZ2VyIG93bmVyX2lkIEZLCiAgICAgICAgdGltZXN0YW1wIGNyZWF0ZWRfYXQKICAgICAgICB0aW1lc3RhbXAgdXBkYXRlZF9hdAogICAgfQoKICAgIE9SR0FOSVpBVElPTl9NRU1CRVJTIHsKICAgICAgICBzZXJpYWwgaWQgUEsKICAgICAgICBpbnRlZ2VyIG9yZ2FuaXphdGlvbl9pZCBGSwogICAgICAgIGludGVnZXIgdXNlcl9pZCBGSwogICAgICAgIHZhcmNoYXIgcm9sZQogICAgICAgIHRpbWVzdGFtcCBqb2luZWRfYXQKICAgIH0KCiAgICBCT09LSU5HUyB7CiAgICAgICAgc2VyaWFsIGlkIFBLCiAgICAgICAgaW50ZWdlciB1c2VyX2lkIEZLCiAgICAgICAgdmFyY2hhciB0aXRsZQogICAgICAgIHRpbWVzdGFtcCBzdGFydF90aW1lCiAgICAgICAgdGltZXN0YW1wIGVuZF90aW1lCiAgICAgICAgdmFyY2hhciBzdGF0dXMKICAgICAgICB0aW1lc3RhbXAgY3JlYXRlZF9hdAogICAgICAgIHRpbWVzdGFtcCB1cGRhdGVkX2F0CiAgICB9CgogICAgQU5BTFlUSUNTX0VWRU5UUyB7CiAgICAgICAgc2VyaWFsIGlkIFBLCiAgICAgICAgaW50ZWdlciB1c2VyX2lkIEZLCiAgICAgICAgdmFyY2hhciBldmVudF90eXBlCiAgICAgICAganNvbmIgbWV0YWRhdGEKICAgICAgICB0aW1lc3RhbXAgY3JlYXRlZF9hdAogICAgfQoKICAgIE5PVElGSUNBVElPTlMgewogICAgICAgIHNlcmlhbCBpZCBQSwogICAgICAgIGludGVnZXIgdXNlcl9pZCBGSwogICAgICAgIHZhcmNoYXIgdHlwZQogICAgICAgIHZhcmNoYXIgdGl0bGUKICAgICAgICB0ZXh0IG1lc3NhZ2UKICAgICAgICBib29sZWFuIGlzX3JlYWQKICAgICAgICBqc29uYiBtZXRhZGF0YQogICAgICAgIHRpbWVzdGFtcCBjcmVhdGVkX2F0CiAgICB9CgogICAgVVNFUlMgfHwtLW97IEJPT0tJTkdTIDogImNyZWF0ZXMiCiAgICBVU0VSUyB8fC0tb3sgT1JHQU5JWkFUSU9OUyA6ICJvd25zIgogICAgVVNFUlMgfHwtLW97IE9SR0FOSVpBVElPTl9NRU1CRVJTIDogImJlbG9uZ3MgdG8iCiAgICBPUkdBTklaQVRJT05TIHx8LS1veyBPUkdBTklaQVRJT05fTUVNQkVSUyA6ICJoYXMiCiAgICBVU0VSUyB8fC0tb3sgTk9USUZJQ0FUSU9OUyA6ICJyZWNlaXZlcyIKICAgIFVTRVJTIHx8LS1veyBBTkFMWVRJQ1NfRVZFTlRTIDogImdlbmVyYXRlcyI=)

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

![Diagram](https://mermaid.ink/img/c2VxdWVuY2VEaWFncmFtCiAgICBhY3RvciBDbGllbnQKICAgIHBhcnRpY2lwYW50IFNlcnZlcgogICAgcGFydGljaXBhbnQgREIgYXMgUG9zdGdyZVNRTAoKICAgIENsaWVudC0+PlNlcnZlcjogUE9TVCAvYXBpL3YxL2F1dGgvcmVnaXN0ZXI8YnIvPnsgbmFtZSwgZW1haWwsIHBhc3N3b3JkIH0KCiAgICBTZXJ2ZXItPj5TZXJ2ZXI6IFZhbGlkYXRlIGZpZWxkcyAobmFtZSwgZW1haWwsIHBhc3N3b3JkKQogICAgU2VydmVyLT4+U2VydmVyOiBWYWxpZGF0ZSBlbWFpbCBmb3JtYXQgKHJlZ2V4KQogICAgU2VydmVyLT4+U2VydmVyOiBDaGVjayBwYXNzd29yZCBsZW5ndGggPj0gNgoKICAgIFNlcnZlci0+PkRCOiBTRUxFQ1QgKiBGUk9NIHVzZXJzIFdIRVJFIGVtYWlsID0gPwogICAgREItLT4+U2VydmVyOiBudWxsICh1c2VyIG5vdCBmb3VuZCkKCiAgICBTZXJ2ZXItPj5TZXJ2ZXI6IGJjcnlwdC5nZW5TYWx0KDEwKTxici8+YmNyeXB0Lmhhc2gocGFzc3dvcmQsIHNhbHQpCgogICAgU2VydmVyLT4+REI6IElOU0VSVCBJTlRPIHVzZXJzIChuYW1lLCBlbWFpbCwgcGFzc3dvcmRfaGFzaCk8YnIvPlJFVFVSTklORyBpZCwgbmFtZSwgZW1haWwsIHJvbGUKICAgIERCLS0+PlNlcnZlcjogeyBpZDogMSwgbmFtZSwgZW1haWwsIHJvbGU6ICdtZW1iZXInIH0KCiAgICBTZXJ2ZXItPj5TZXJ2ZXI6IGp3dC5zaWduKHsgaWQsIGVtYWlsLCByb2xlIH0sIFNFQ1JFVCwgN2QpCgogICAgU2VydmVyLS0+PkNsaWVudDogMjAxIHsgdG9rZW4sIHVzZXI6IHsgaWQsIG5hbWUsIGVtYWlsIH0gfQ==)

---

### 2. Authenticated Request Flow (Login then Create Booking)

![Diagram](https://mermaid.ink/img/c2VxdWVuY2VEaWFncmFtCiAgICBhY3RvciBDbGllbnQKICAgIHBhcnRpY2lwYW50IFNlcnZlcgogICAgcGFydGljaXBhbnQgQXV0aE1XIGFzIGF1dGhNaWRkbGV3YXJlCiAgICBwYXJ0aWNpcGFudCBIYW5kbGVyIGFzIFJvdXRlIEhhbmRsZXIKICAgIHBhcnRpY2lwYW50IERCIGFzIFBvc3RncmVTUUwKICAgIHBhcnRpY2lwYW50IFJlZGlzCgogICAgTm90ZSBvdmVyIENsaWVudCxSZWRpczogU3RlcCAxIC0gTG9naW4KCiAgICBDbGllbnQtPj5TZXJ2ZXI6IFBPU1QgL2FwaS92MS9hdXRoL2xvZ2luPGJyLz57IGVtYWlsLCBwYXNzd29yZCB9CiAgICBTZXJ2ZXItPj5EQjogU0VMRUNUICogRlJPTSB1c2VycyBXSEVSRSBlbWFpbCA9ID8KICAgIERCLS0+PlNlcnZlcjogdXNlciByb3cgd2l0aCBwYXNzd29yZF9oYXNoCiAgICBTZXJ2ZXItPj5TZXJ2ZXI6IGJjcnlwdC5jb21wYXJlKHBhc3N3b3JkLCBoYXNoKSBPSwogICAgU2VydmVyLT4+U2VydmVyOiBqd3Quc2lnbih7IGlkLCBlbWFpbCwgcm9sZSB9LCBTRUNSRVQpCiAgICBTZXJ2ZXItLT4+Q2xpZW50OiAyMDAgeyB0b2tlbjogImV5Si4uLiIgfQoKICAgIE5vdGUgb3ZlciBDbGllbnQsUmVkaXM6IFN0ZXAgMiAtIENyZWF0ZSBCb29raW5nICh0b2tlbiBhdHRhY2hlZCkKCiAgICBDbGllbnQtPj5TZXJ2ZXI6IFBPU1QgL2FwaS92MS9ib29raW5nczxici8+QXV0aG9yaXphdGlvbjogQmVhcmVyIGV5Si4uLjxici8+eyB0aXRsZSwgc3RhcnQsIGVuZCB9CgogICAgU2VydmVyLT4+QXV0aE1XOiBFeHRyYWN0IEJlYXJlciB0b2tlbgogICAgQXV0aE1XLT4+QXV0aE1XOiBqd3QudmVyaWZ5KHRva2VuLCBTRUNSRVQpCiAgICBBdXRoTVctPj5BdXRoTVc6IEF0dGFjaCBkZWNvZGVkIHBheWxvYWQgdG8gcmVxLnVzZXIKICAgIEF1dGhNVy0+PkhhbmRsZXI6IG5leHQoKSBPSwoKICAgIEhhbmRsZXItPj5IYW5kbGVyOiBWYWxpZGF0ZSB0aXRsZSwgc3RhcnQsIGVuZCBwcmVzZW50CiAgICBIYW5kbGVyLT4+SGFuZGxlcjogQ2hlY2sgc3RhcnQgaXMgbm90IGluIHRoZSBwYXN0CiAgICBIYW5kbGVyLT4+SGFuZGxlcjogQ2hlY2sgZW5kIGlzIGFmdGVyIHN0YXJ0CgogICAgSGFuZGxlci0+PkRCOiBJTlNFUlQgSU5UTyBib29raW5ncyAodXNlcl9pZCwgdGl0bGUsIHN0YXJ0X3RpbWUsIGVuZF90aW1lKQogICAgREItLT4+SGFuZGxlcjogYm9va2luZyB7IGlkLCB0aXRsZSwgc3RhcnRfdGltZSwgZW5kX3RpbWUgfQoKICAgIEhhbmRsZXItPj5SZWRpczogZW1haWxRdWV1ZS5hZGQoeyBlbWFpbCwgdHlwZTogJ0JPT0tJTkdfQ09ORklSTUFUSU9OJywgZGF0YSB9KQogICAgTm90ZSByaWdodCBvZiBSZWRpczogRmlyZSBhbmQgZm9yZ2V0IC0gbm8gYXdhaXQKCiAgICBIYW5kbGVyLT4+REI6IElOU0VSVCBJTlRPIG5vdGlmaWNhdGlvbnMgKHVzZXJfaWQsIHR5cGUsIHRpdGxlLCBtZXNzYWdlKQogICAgREItLT4+SGFuZGxlcjogbm90aWZpY2F0aW9uIGNyZWF0ZWQgT0sKCiAgICBIYW5kbGVyLS0+PkNsaWVudDogMjAxIHsgbWVzc2FnZTogJ0Jvb2tpbmcgY3JlYXRlZCcsIGJvb2tpbmcgfQogICAgTm90ZSBvdmVyIENsaWVudDogUmVzcG9uc2UgcmVjZWl2ZWQgaW4gfjUwbXM=)

---

### 3. Background Email Worker Flow

![Diagram](https://mermaid.ink/img/c2VxdWVuY2VEaWFncmFtCiAgICBwYXJ0aWNpcGFudCBSZWRpcwogICAgcGFydGljaXBhbnQgV29ya2VyIGFzIHdvcmtlci5qcwogICAgcGFydGljaXBhbnQgVGVtcGxhdGVzIGFzIEVtYWlsIFRlbXBsYXRlcwogICAgcGFydGljaXBhbnQgRW1haWxBUEkgYXMgRW1haWwgUHJvdmlkZXI8YnIvPihNb2NrIC8gU2VuZEdyaWQgLyBSZXNlbmQpCgogICAgTm90ZSBvdmVyIFJlZGlzLEVtYWlsQVBJOiBUaGlzIHJ1bnMgaW4gYSBTRVBBUkFURSBwcm9jZXNzIGZyb20gc2VydmVyLmpzCgogICAgUmVkaXMtPj5Xb3JrZXI6IEpvYiBkZXF1ZXVlZCBmcm9tICdlbWFpbHMnIHF1ZXVlPGJyLz57IGVtYWlsLCB0eXBlOiAnQk9PS0lOR19DT05GSVJNQVRJT04nLCBkYXRhIH0KCiAgICBXb3JrZXItPj5Xb3JrZXI6IGVtYWlsUXVldWUucHJvY2Vzcyhhc3luYyAoam9iKSA9PiAuLi4pCiAgICBXb3JrZXItPj5Xb3JrZXI6IEV4dHJhY3QgeyBlbWFpbCwgdHlwZSwgZGF0YSB9IGZyb20gam9iLmRhdGEKCiAgICBXb3JrZXItPj5UZW1wbGF0ZXM6IHRlbXBsYXRlRm4gPSBlbWFpbFRlbXBsYXRlc1t0eXBlXQogICAgVGVtcGxhdGVzLS0+PldvcmtlcjogeyBzdWJqZWN0OiAiQm9va2luZyBDb25maXJtZWQ6IC4uLiIsPGJyLz5ib2R5OiAiSGkgdGhlcmUhIFlvdXIgYm9va2luZy4uLiIgfQoKICAgIFdvcmtlci0+PkVtYWlsQVBJOiBzZW5kRW1haWwodG8sIHN1YmplY3QsIGJvZHkpCgogICAgYWx0IEVNQUlMX1BST1ZJREVSID0gJ21vY2snIChkZXZlbG9wbWVudCkKICAgICAgICBFbWFpbEFQSS0+PkVtYWlsQVBJOiBTaW11bGF0ZSBkZWxheSAoMS0zIHNlY29uZHMpCiAgICAgICAgRW1haWxBUEktLT4+V29ya2VyOiB7IHN1Y2Nlc3M6IHRydWUsIHByb3ZpZGVyOiAnbW9jaycgfQogICAgICAgIE5vdGUgcmlnaHQgb2YgV29ya2VyOiBMb2dzIHRvIGNvbnNvbGUKICAgIGVsc2UgRU1BSUxfUFJPVklERVIgPSAnc2VuZGdyaWQnIChwcm9kdWN0aW9uKQogICAgICAgIEVtYWlsQVBJLT4+RW1haWxBUEk6IFBPU1QgdG8gU2VuZEdyaWQgQVBJCiAgICAgICAgRW1haWxBUEktLT4+V29ya2VyOiB7IHN1Y2Nlc3M6IHRydWUsIHByb3ZpZGVyOiAnc2VuZGdyaWQnIH0KICAgIGVuZAoKICAgIFdvcmtlci0+PldvcmtlcjogZW1pdCAnY29tcGxldGVkJyBldmVudCBPSwoKICAgIE5vdGUgb3ZlciBSZWRpcyxXb3JrZXI6IElmIHNlbmRFbWFpbCgpIHRocm93cywgQnVsbCByZXRyaWVzIGF1dG9tYXRpY2FsbHkgKDMgYXR0ZW1wdHMp)

---

### 4. Organization Member Invite Flow

![Diagram](https://mermaid.ink/img/c2VxdWVuY2VEaWFncmFtCiAgICBhY3RvciBPd25lcgogICAgcGFydGljaXBhbnQgU2VydmVyCiAgICBwYXJ0aWNpcGFudCBEQiBhcyBQb3N0Z3JlU1FMCiAgICBwYXJ0aWNpcGFudCBOb3RpZmljYXRpb25zIGFzIE5vdGlmaWNhdGlvbiBTeXN0ZW0KCiAgICBPd25lci0+PlNlcnZlcjogUE9TVCAvYXBpL3YxL29yZ2FuaXphdGlvbnMvOmlkL21lbWJlcnM8YnIvPnsgZW1haWw6ICJuZXdtZW1iZXJAZXhhbXBsZS5jb20iLCByb2xlOiAibWVtYmVyIiB9CgogICAgU2VydmVyLT4+U2VydmVyOiBhdXRoTWlkZGxld2FyZSAtIHZlcmlmeSBPd25lcidzIEpXVAoKICAgIFNlcnZlci0+PkRCOiBTRUxFQ1QgKiBGUk9NIG9yZ2FuaXphdGlvbnMgV0hFUkUgaWQgPSA/CiAgICBEQi0tPj5TZXJ2ZXI6IG9yZyB7IGlkLCBuYW1lLCBvd25lcl9pZCB9CgogICAgU2VydmVyLT4+U2VydmVyOiBDaGVjayBvcmcub3duZXJfaWQgPT09IHJlcS51c2VyLmlkCiAgICBOb3RlIHJpZ2h0IG9mIFNlcnZlcjogNDAzIEZvcmJpZGRlbiBpZiBub3Qgb3duZXIKCiAgICBTZXJ2ZXItPj5EQjogU0VMRUNUICogRlJPTSB1c2VycyBXSEVSRSBlbWFpbCA9ICduZXdtZW1iZXJAZXhhbXBsZS5jb20nCiAgICBEQi0tPj5TZXJ2ZXI6IHVzZXJUb0FkZCB7IGlkLCBuYW1lLCBlbWFpbCB9CgogICAgU2VydmVyLT4+REI6IElOU0VSVCBJTlRPIG9yZ2FuaXphdGlvbl9tZW1iZXJzPGJyLz4ob3JnYW5pemF0aW9uX2lkLCB1c2VyX2lkLCByb2xlKTxici8+T04gQ09ORkxJQ1QgcmV0dXJucyBudWxsIChhbHJlYWR5IG1lbWJlciBjaGVjaykKICAgIERCLS0+PlNlcnZlcjogbWVtYmVyIHJlY29yZCBPSwoKICAgIFNlcnZlci0+Pk5vdGlmaWNhdGlvbnM6IE5vdGlmaWNhdGlvbk1vZGVsLmNyZWF0ZSg8YnIvPnVzZXJUb0FkZC5pZCw8YnIvPidPUkdfSU5WSVRFJyw8YnIvPidZb3UgaGF2ZSBiZWVuIGFkZGVkIHRvIFRlYW1OYW1lJyw8YnIvPm1ldGFkYXRhOiB7IG9yZ2FuaXphdGlvbl9pZCB9PGJyLz4pCiAgICBOb3RpZmljYXRpb25zLT4+REI6IElOU0VSVCBJTlRPIG5vdGlmaWNhdGlvbnMKICAgIERCLS0+Pk5vdGlmaWNhdGlvbnM6IE9LCgogICAgU2VydmVyLS0+Pk93bmVyOiAyMDEgeyBtZXNzYWdlOiAnTWVtYmVyIGFkZGVkJywgbWVtYmVyIH0KCiAgICBOb3RlIG92ZXIgREIsTm90aWZpY2F0aW9uczogTmV3IG1lbWJlciBzZWVzIG5vdGlmaWNhdGlvbjxici8+b24gdGhlaXIgbmV4dCByZXF1ZXN0IHRvIC9ub3RpZmljYXRpb25zL3VucmVhZA==)

---

### 5. Analytics Dashboard Query Flow

![Diagram](https://mermaid.ink/img/Zmxvd2NoYXJ0IFRECiAgICBBWyJHRVQgL2FwaS92MS9hbmFseXRpY3MvZGFzaGJvYXJkP2RheXM9MzAiXSAtLT4gQlsiYXV0aE1pZGRsZXdhcmVcblZlcmlmeSBKV1QiXQogICAgQiAtLT4gQ1siUGFyc2UgP2RheXMgcXVlcnkgcGFyYW1cbkRlZmF1bHQ6IDMwIl0KICAgIEMgLS0+IERbIlByb21pc2UuYWxsIC0gZmlyZSBib3RoIHF1ZXJpZXMgc2ltdWx0YW5lb3VzbHkiXQoKICAgIEQgLS0+IEVbImdldERhc2hib2FyZFN1bW1hcnkoMzApXG5TRUxFQ1QgZXZlbnRfdHlwZSwgQ09VTlQsIHVuaXF1ZV91c2Vyc1xuRlJPTSBhbmFseXRpY3NfZXZlbnRzXG5XSEVSRSBjcmVhdGVkX2F0ID49IE5PVygpIC0gMzAgZGF5c1xuR1JPVVAgQlkgZXZlbnRfdHlwZSJdCgogICAgRCAtLT4gRlsiZ2V0UXVpY2tTdGF0cygzMClcblNFTEVDVCB0b3RhbF9ldmVudHMsXG51bmlxdWVfdXNlcnMsIGV2ZW50X3R5cGVzXG5GUk9NIGFuYWx5dGljc19ldmVudHNcbldIRVJFIGNyZWF0ZWRfYXQgPj0gTk9XKCkgLSAzMCBkYXlzIl0KCiAgICBFIC0tPiBHWyJNZXJnZSBSZXN1bHRzIl0KICAgIEYgLS0+IEcKCiAgICBHIC0tPiBIWyIyMDAgUmVzcG9uc2VcbnsgcGVyaW9kLCBvdmVydmlldywgYnJlYWtkb3duIH0iXQoKICAgIHN0eWxlIEQgZmlsbDojMWExYTJlLGNvbG9yOiNmZmYKICAgIHN0eWxlIEUgZmlsbDojMTYyMTNlLGNvbG9yOiNmZmYKICAgIHN0eWxlIEYgZmlsbDojMTYyMTNlLGNvbG9yOiNmZmYKICAgIHN0eWxlIEcgZmlsbDojMGYzNDYwLGNvbG9yOiNmZmY=)

---

## Middleware Pipeline

Every HTTP request passes through this **ordered pipeline** before reaching a route handler:

![Diagram](https://mermaid.ink/img/Zmxvd2NoYXJ0IFRECiAgICBSZXFbIkluY29taW5nIEhUVFAgUmVxdWVzdCJdIC0tPiBICgogICAgSFsiSGVsbWV0XG5TZXRzIDExIHNlY3VyaXR5IGhlYWRlcnNcblhTUy1Qcm90ZWN0aW9uLCBIU1RTLCBDU1BcblgtRnJhbWUtT3B0aW9ucywgTUlNRSBzbmlmZiBibG9jayJdCiAgICBIIC0tPiBDCgogICAgQ1siQ09SU1xuQ29udHJvbHMgYWxsb3dlZCBvcmlnaW5zXG5JbiBwcm9kOiByZXN0cmljdCB0byB5b3VyLWZyb250ZW5kLmNvbSJdCiAgICBDIC0tPiBNCgogICAgTVsiTW9yZ2FuXG5Mb2dzIGV2ZXJ5IHJlcXVlc3Q6XG5HRVQgL2FwaS92MS91c2VycyAyMDAgMzRtcyJdCiAgICBNIC0tPiBKCgogICAgSlsiZXhwcmVzcy5qc29uKClcblBhcnNlcyByZXF1ZXN0IGJvZHlcbnJlcS5ib2R5ID0geyB0aXRsZSwgc3RhcnQsIGVuZCB9Il0KICAgIEogLS0+IERlY2lzaW9uCgogICAgRGVjaXNpb257eyJJcyByb3V0ZVxucHJvdGVjdGVkPyJ9fQogICAgRGVjaXNpb24gLS0gWWVzIC0tPiBBTQogICAgRGVjaXNpb24gLS0gTm8gLS0+IFJICgogICAgQU1bImF1dGhNaWRkbGV3YXJlXG5FeHRyYWN0IEJlYXJlciB0b2tlblxuand0LnZlcmlmeSh0b2tlbiwgU0VDUkVUKVxuQXR0YWNoIHJlcS51c2VyID0geyBpZCwgZW1haWwsIHJvbGUgfSJdCiAgICBBTSAtLSAiSW52YWxpZCIgLS0+IEU0MDFbIjQwMSBVbmF1dGhvcml6ZWQiXQogICAgQU0gLS0gIlZhbGlkIiAtLT4gUk0KCiAgICBSTXsiUm9sZSBjaGVja1xucmVxdWlyZWQ/In0KICAgIFJNIC0tIFllcyAtLT4gUm9sZU1XCiAgICBSTSAtLSBObyAtLT4gUkgKCiAgICBSb2xlTVdbInJvbGVNaWRkbGV3YXJlKCdhZG1pbicpXG5DaGVjayByZXEudXNlci5yb2xlIGluIGFsbG93ZWRSb2xlcyJdCiAgICBSb2xlTVcgLS0gIldyb25nIHJvbGUiIC0tPiBFNDAzWyI0MDMgRm9yYmlkZGVuIl0KICAgIFJvbGVNVyAtLSAiQWxsb3dlZCIgLS0+IFJICgogICAgUkhbIlJvdXRlIEhhbmRsZXJcblZhbGlkYXRpb24gdGhlbiBNb2RlbCB0aGVuIERCXG5CdXNpbmVzcyBMb2dpYyJdCiAgICBSSCAtLSAiU3VjY2VzcyIgLS0+IFJlc1siSlNPTiBSZXNwb25zZSJdCiAgICBSSCAtLSAiRXJyb3IgdGhyb3duIiAtLT4gRUgKCiAgICBFSFsiR2xvYmFsIEVycm9yIEhhbmRsZXJcbkxvZ3MgZnVsbCBzdGFjayB0cmFjZSAoZGV2IG9ubHkpXG5SZXR1cm5zIGNsZWFuIHsgZXJyb3IgfSBKU09OIl0KCiAgICBzdHlsZSBSZXEgZmlsbDojMmQ2YTRmLGNvbG9yOiNmZmYKICAgIHN0eWxlIFJlcyBmaWxsOiMyZDZhNGYsY29sb3I6I2ZmZgogICAgc3R5bGUgRTQwMSBmaWxsOiNjMTEyMWYsY29sb3I6I2ZmZgogICAgc3R5bGUgRTQwMyBmaWxsOiNjMTEyMWYsY29sb3I6I2ZmZgogICAgc3R5bGUgRUggZmlsbDojYzExMjFmLGNvbG9yOiNmZmY=)

---

## Auth System - JWT in a Stateless World

### How JWT Authentication Works

![Diagram](https://mermaid.ink/img/Zmxvd2NoYXJ0IExSCiAgICBzdWJncmFwaCBSZWdpc3RyYXRpb24gWyJSZWdpc3RyYXRpb24iXQogICAgICAgIFIxWyJSZWNlaXZlIG5hbWUsIGVtYWlsLCBwYXNzd29yZCJdCiAgICAgICAgUjJbIlZhbGlkYXRlIGlucHV0Il0KICAgICAgICBSM1siYmNyeXB0Lmhhc2ggcGFzc3dvcmRcbnNhbHQgcm91bmRzID0gMTAiXQogICAgICAgIFI0WyJJTlNFUlQgSU5UTyB1c2VycyJdCiAgICAgICAgUjVbImp3dC5zaWduIHBheWxvYWRcbmV4cGlyZXMgaW4gNyBkYXlzIl0KICAgICAgICBSMSAtLT4gUjIgLS0+IFIzIC0tPiBSNCAtLT4gUjUKICAgIGVuZAoKICAgIHN1YmdyYXBoIFRva2VuIFsiSldUIFRva2VuIl0KICAgICAgICBUMVsiSGVhZGVyXG57IGFsZzogSFMyNTYgfSJdCiAgICAgICAgVDJbIlBheWxvYWRcbnsgaWQsIGVtYWlsLCByb2xlXG5pYXQsIGV4cCB9Il0KICAgICAgICBUM1siU2lnbmF0dXJlXG5ITUFDLVNIQTI1NihoZWFkZXIucGF5bG9hZCwgU0VDUkVUKSJdCiAgICBlbmQKCiAgICBzdWJncmFwaCBQcm90ZWN0ZWRSZXEgWyJQcm90ZWN0ZWQgUmVxdWVzdCJdCiAgICAgICAgUDFbIkNsaWVudCBzZW5kczpcbkF1dGhvcml6YXRpb246IEJlYXJlciBleUouLi4iXQogICAgICAgIFAyWyJqd3QudmVyaWZ5KHRva2VuLCBTRUNSRVQpIl0KICAgICAgICBQM1siRGVjb2RlIHBheWxvYWRcbnJlcS51c2VyID0geyBpZCwgZW1haWwsIHJvbGUgfSJdCiAgICAgICAgUDRbIlJvdXRlIGV4ZWN1dGVzXG53aXRoIHVzZXIgY29udGV4dCJdCiAgICAgICAgUDEgLS0+IFAyIC0tPiBQMyAtLT4gUDQKICAgIGVuZAoKICAgIFI1IC0tPiBUb2tlbgogICAgVG9rZW4gLS0+fCJTdG9yZWQgYnkgY2xpZW50XG4obG9jYWxTdG9yYWdlIC8gY29va2llKSJ8IFAxCgogICAgc3R5bGUgUmVnaXN0cmF0aW9uIGZpbGw6IzFhMWEyZSxjb2xvcjojZmZmCiAgICBzdHlsZSBUb2tlbiBmaWxsOiMxNjIxM2UsY29sb3I6I2ZmZgogICAgc3R5bGUgUHJvdGVjdGVkUmVxIGZpbGw6IzBmMzQ2MCxjb2xvcjojZmZm)

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

![Diagram](https://mermaid.ink/img/Zmxvd2NoYXJ0IFRECiAgICBzdWJncmFwaCBCQUQgWyJTeW5jaHJvbm91cyAtIEJsb2NraW5nIHRoZSBIVFRQIFRocmVhZCJdCiAgICAgICAgQjFbIkNsaWVudCBzZW5kcyBQT1NUIC9ib29raW5ncyJdCiAgICAgICAgQjJbIlNhdmUgYm9va2luZyB0byBEQlxufjEwbXMiXQogICAgICAgIEIzWyJDYWxsIFNlbmRHcmlkIEFQSVxuV2FpdCBmb3IgcmVzcG9uc2UuLi5cbjEsMDAwLTUsMDAwbXMiXQogICAgICAgIEI0WyJDcmVhdGUgbm90aWZpY2F0aW9uXG5+NW1zIl0KICAgICAgICBCNVsiUmVzcG9uZCB0byBjbGllbnRcblRvdGFsOiB+NSBzZWNvbmRzIl0KICAgICAgICBCMSAtLT4gQjIgLS0+IEIzIC0tPiBCNCAtLT4gQjUKICAgIGVuZAoKICAgIHN1YmdyYXBoIEdPT0QgWyJBc3luY2hyb25vdXMgLSBGaXJlIGFuZCBGb3JnZXQiXQogICAgICAgIEcxWyJDbGllbnQgc2VuZHMgUE9TVCAvYm9va2luZ3MiXQogICAgICAgIEcyWyJTYXZlIGJvb2tpbmcgdG8gREJcbn4xMG1zIl0KICAgICAgICBHM1siZW1haWxRdWV1ZS5hZGQoam9iKVxuRHJvcHMgam9iIGluIFJlZGlzXG5+Mm1zIl0KICAgICAgICBHNFsiQ3JlYXRlIG5vdGlmaWNhdGlvblxufjVtcyJdCiAgICAgICAgRzVbIlJlc3BvbmQgdG8gY2xpZW50XG5Ub3RhbDogfjUwbXMiXQogICAgICAgIEc2WyIoQmFja2dyb3VuZClcbldvcmtlciBwaWNrcyB1cCBqb2JcblNlbmRHcmlkIEFQSSBjYWxsZWRcbkVtYWlsIGRlbGl2ZXJlZCJdCiAgICAgICAgRzEgLS0+IEcyIC0tPiBHMyAtLT4gRzQgLS0+IEc1CiAgICAgICAgRzMgLS4tPnwiQXN5bmMifCBHNgogICAgZW5kCgogICAgc3R5bGUgQkFEIGZpbGw6IzNkMDAwMCxjb2xvcjojZmZmCiAgICBzdHlsZSBHT09EIGZpbGw6IzAwM2QwMCxjb2xvcjojZmZm)

### Bull Queue - Three Redis Connections

When connecting to cloud Redis (Upstash), Bull internally creates **3 separate Redis connections** for different purposes. Each must be configured identically with TLS settings:

![Diagram](https://mermaid.ink/img/Z3JhcGggVEQKICAgIEJ1bGxbIkJ1bGwgUXVldWVcbmVtYWlsUXVldWUiXSAtLT4gQzEKICAgIEJ1bGwgLS0+IEMyCiAgICBCdWxsIC0tPiBDMwoKICAgIEMxWyJDb25uZWN0aW9uIDE6IGNsaWVudFxuU2VuZHMgY29tbWFuZHNcbm5ldyBSZWRpcyhSRURJU19VUkwsIGNvbmZpZykiXQogICAgQzJbIkNvbm5lY3Rpb24gMjogc3Vic2NyaWJlclxuTGlzdGVucyBmb3IgcHViL3N1YiBldmVudHNcbm5ldyBSZWRpcyhSRURJU19VUkwsIGNvbmZpZykiXQogICAgQzNbIkNvbm5lY3Rpb24gMzogYmNsaWVudFxuQmxvY2tpbmcgY2xpZW50IGZvciBqb2IgcG9sbGluZ1xubmV3IFJlZGlzKFJFRElTX1VSTCwgY29uZmlnKSJdCgogICAgQzEgLS0+IFJlZGlzREJbKCJSZWRpc1xuVXBzdGFzaCBDbG91ZFxuVExTIHJlZGlzczovLyIpXQogICAgQzIgLS0+IFJlZGlzREIKICAgIEMzIC0tPiBSZWRpc0RCCgogICAgc3R5bGUgUmVkaXNEQiBmaWxsOiNjMTEyMWYsY29sb3I6I2ZmZgogICAgc3R5bGUgQnVsbCBmaWxsOiMxYTFhMmUsY29sb3I6I2ZmZg==)

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

![Diagram](https://mermaid.ink/img/Zmxvd2NoYXJ0IExSCiAgICBzdWJncmFwaCBQb29sIFsicGcuUG9vbCAtIDEwIFBlcnNpc3RlbnQgQ29ubmVjdGlvbnMiXQogICAgICAgIEMxWyJDb25uIDEiXQogICAgICAgIEMyWyJDb25uIDIiXQogICAgICAgIEMzWyJDb25uIDMiXQogICAgICAgIENEWyIuLi4iXQogICAgICAgIEMxMFsiQ29ubiAxMCJdCiAgICBlbmQKCiAgICBSMVsiUmVxdWVzdCBBIl0gLS0+fCJib3Jyb3cifCBDMQogICAgUjJbIlJlcXVlc3QgQiJdIC0tPnwiYm9ycm93InwgQzIKICAgIFIzWyJSZXF1ZXN0IEMiXSAtLT58ImJvcnJvdyJ8IEMzCgogICAgQzEgLS0+fCJyZXR1cm4gYWZ0ZXIgcXVlcnkifCBQb29sCiAgICBDMiAtLT58InJldHVybiBhZnRlciBxdWVyeSJ8IFBvb2wKCiAgICBQb29sIDwtLT58IlBlcnNpc3RlbnQgVENQICsgU1NMInwgREJbKCJQb3N0Z3JlU1FMIildCgogICAgc3R5bGUgUG9vbCBmaWxsOiMxYTFhMmUsY29sb3I6I2ZmZgogICAgc3R5bGUgREIgZmlsbDojMmQ2YTRmLGNvbG9yOiNmZmY=)

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

![Diagram](https://mermaid.ink/img/Zmxvd2NoYXJ0IExSCiAgICBzdWJncmFwaCBOb0luZGV4IFsiTm8gSW5kZXggLSBGdWxsIFRhYmxlIFNjYW4iXQogICAgICAgIE5JWyJTRUxFQ1QgKiBGUk9NIGFuYWx5dGljc19ldmVudHNcbldIRVJFIGV2ZW50X3R5cGUgPSAnTE9HSU4nXG5cblBvc3RncmVzIHJlYWRzIEVWRVJZIHJvd1xuTyhuKSAtIHNsb3cgYXQgc2NhbGUiXQogICAgZW5kCgogICAgc3ViZ3JhcGggV2l0aEluZGV4IFsiV2l0aCBJbmRleCAtIEItVHJlZSBMb29rdXAiXQogICAgICAgIFdJWyJDUkVBVEUgSU5ERVggaWR4X2FuYWx5dGljc19ldmVudF90eXBlXG5PTiBhbmFseXRpY3NfZXZlbnRzKGV2ZW50X3R5cGUpXG5cblBvc3RncmVzIGp1bXBzIGRpcmVjdGx5IHRvIG1hdGNoZXNcbk8obG9nIG4pIC0gZmFzdCBhdCBhbnkgc2NhbGUiXQogICAgZW5kCgogICAgc3R5bGUgTm9JbmRleCBmaWxsOiMzZDAwMDAsY29sb3I6I2ZmZgogICAgc3R5bGUgV2l0aEluZGV4IGZpbGw6IzAwM2QwMCxjb2xvcjojZmZm)

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

![Diagram](https://mermaid.ink/img/c2VxdWVuY2VEaWFncmFtCiAgICBwYXJ0aWNpcGFudCBIYW5kbGVyIGFzIFJvdXRlIEhhbmRsZXIKICAgIHBhcnRpY2lwYW50IERCIGFzIFBvc3RncmVTUUwKCiAgICBOb3RlIG92ZXIgSGFuZGxlcixEQjogU2VxdWVudGlhbCAtIDJ4IHRoZSB0aW1lCiAgICBIYW5kbGVyLT4+REI6IGdldERhc2hib2FyZFN1bW1hcnkoKQogICAgREItLT4+SGFuZGxlcjogcmVzdWx0ICg1MG1zKQogICAgSGFuZGxlci0+PkRCOiBnZXRRdWlja1N0YXRzKCkKICAgIERCLS0+PkhhbmRsZXI6IHJlc3VsdCAoNTBtcykKICAgIE5vdGUgcmlnaHQgb2YgSGFuZGxlcjogVG90YWw6IH4xMDBtcwoKICAgIE5vdGUgb3ZlciBIYW5kbGVyLERCOiBQYXJhbGxlbCB3aXRoIFByb21pc2UuYWxsKCkKICAgIEhhbmRsZXItPj5EQjogZ2V0RGFzaGJvYXJkU3VtbWFyeSgpCiAgICBIYW5kbGVyLT4+REI6IGdldFF1aWNrU3RhdHMoKQogICAgREItLT4+SGFuZGxlcjogYm90aCByZXN1bHRzIGFycml2ZSBjb25jdXJyZW50bHkKICAgIE5vdGUgcmlnaHQgb2YgSGFuZGxlcjogVG90YWw6IH41MG1z)

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

![Diagram](https://mermaid.ink/img/Zmxvd2NoYXJ0IFRECiAgICBXb3JrZXJbIndvcmtlci5qc1xucmVhZHMgZW1haWxDb25maWcucHJvdmlkZXIiXSAtLT4gRGVjaXNpb257eyJFTUFJTF9QUk9WSURFUlxuZW52IHZhcmlhYmxlIn19CiAgICBEZWNpc2lvbiAtLSAibW9jayIgLS0+IE1vY2tbIkNvbnNvbGUubG9nXG5TaW11bGF0ZSAxLTNzIGRlbGF5XG5EZXZlbG9wbWVudCBvbmx5Il0KICAgIERlY2lzaW9uIC0tICJzZW5kZ3JpZCIgLS0+IFNHWyJAc2VuZGdyaWQvbWFpbCBTREtcblByb2R1Y3Rpb24iXQogICAgRGVjaXNpb24gLS0gInJlc2VuZCIgLS0+IFJlc2VuZFsicmVzZW5kIFNES1xuUHJvZHVjdGlvbiJdCgogICAgc3R5bGUgTW9jayBmaWxsOiMxYTFhMmUsY29sb3I6I2ZmZgogICAgc3R5bGUgU0cgZmlsbDojMGYzNDYwLGNvbG9yOiNmZmYKICAgIHN0eWxlIFJlc2VuZCBmaWxsOiMxNjIxM2UsY29sb3I6I2ZmZg==)

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
