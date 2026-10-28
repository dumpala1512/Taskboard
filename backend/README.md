# Internal Team Task Board — Backend API

Production-ready backend architecture for the Internal Team Task Board application, built with Python 3.13, FastAPI, Async SQLAlchemy 2.0, PostgreSQL, Redis, and uv.

---

## 🛠 Technology Stack

- **Runtime**: Python 3.13
- **Framework**: FastAPI
- **Package & Project Manager**: Astral `uv`
- **ORM**: SQLAlchemy 2.0 (Full Async with `asyncpg` and `greenlet`)
- **Database**: PostgreSQL 16
- **Caching & Session Store**: Redis 7 (`redis.asyncio`)
- **Authentication**: JWT (Access Token & Rotated Refresh Tokens) + bcrypt
- **Migrations**: Alembic (configured for async engine)
- **Validation & Settings**: Pydantic v2 (`pydantic-settings`)
- **Containerization**: Docker (multi-stage) & Docker Compose
- **Testing**: `pytest`, `pytest-asyncio`, `httpx`

---

## 📁 Project Architecture

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                     # App factory, lifespan, CORS, middleware & route mounting
│   ├── api/
│   │   ├── __init__.py
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── api.py              # Version 1 route aggregator (/api/v1)
│   │       └── routers/
│   │           ├── __init__.py
│   │           ├── auth.py         # POST /auth/login, /refresh, /logout, GET /me
│   │           └── health.py       # GET /, GET /health, GET /ready
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py               # Pydantic Settings v2 with fail-fast validation
│   │   └── security.py             # Security constants & expiration helpers
│   ├── db/
│   │   ├── __init__.py
│   │   ├── base.py                 # SQLAlchemy 2.0 DeclarativeBase
│   │   └── session.py              # Async engine, sessionmaker, and get_db dependency
│   ├── dependencies/
│   │   ├── __init__.py
│   │   ├── auth.py                 # get_current_user, require_admin, require_member
│   │   └── database.py             # Typed FastAPI dependencies (DBSessionDep, RedisDep)
│   ├── middleware/
│   │   ├── __init__.py
│   │   ├── logging.py              # Structured request logging with latency tracking
│   │   └── request_id.py           # Inbound/outbound X-Request-ID propagation
│   ├── exceptions/
│   │   ├── __init__.py
│   │   └── handlers.py             # Standardized global error response handlers
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── auth.py                 # LoginRequest, RefreshTokenRequest, LoginResponse, TokenResponse, UserResponse
│   │   ├── common.py               # SuccessResponse, ErrorResponse, ValidationErrorResponse
│   │   └── health.py               # HealthResponse, ReadinessResponse, RootInfoResponse
│   ├── utils/
│   │   ├── __init__.py
│   │   └── redis.py                # Async Redis client, lifecycle, and health checks
│   ├── models/
│   │   ├── __init__.py
│   │   └── user.py                 # SQLAlchemy User model (UUID, email, role, timestamps)
│   ├── services/
│   │   ├── __init__.py
│   │   └── auth_service.py         # Consolidated password hashing, JWTs, Redis sessions & auth logic
│   └── dao/
│       ├── __init__.py
│       └── user_repository.py      # Pure database queries (get_by_email, get_by_id, create, exists)
├── tests/
│   ├── __init__.py
│   ├── conftest.py                 # Async test fixtures with ASGITransport
│   ├── test_auth.py                # Authentication, password, token, session & API tests
│   └── test_health.py              # Unit & integration tests for health & middleware
├── alembic/
│   ├── env.py                      # Async migration runner linked to Base.metadata
│   ├── script.py.mako              # Revision script template
│   └── versions/                   # Migration revision files (no migrations yet)
├── scripts/
│   └── entrypoint.sh               # Container entrypoint script
├── .env.example                    # Environment variable template
├── .env                            # Local development environment configuration
├── .gitignore                      # Git ignore patterns
├── docker-compose.yml              # FastAPI Application service
├── pyproject.toml                  # Project metadata and dependencies
└── uv.lock                         # Exact reproducible dependency lockfile
```

---

## ⚡ Quick Start (Local Development)

### Prerequisites

- Python 3.13+
- [uv](https://docs.astral.sh/uv/) installed on host system
- Running PostgreSQL & Redis instances (or use Docker Compose)

### 1. Install Dependencies

```bash
cd backend
uv sync
```

### 2. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### 3. Run Database Migrations

```bash
uv run alembic upgrade head
```

### 4. Run the Development Server

```bash
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive documentation is available at:
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 🔐 API Endpoints (`/taskboard/api/v1`)

| Method | Endpoint | Description | Request Body | Response |
|---|---|---|---|---|
| `GET` | `/taskboard/api/v1/health` | Service health status check | *None* | `HealthResponse` |
| `POST` | `/taskboard/api/v1/auth/login` | Authenticate with credentials and issue tokens | `LoginRequest` | `LoginResponse` |
| `POST` | `/taskboard/api/v1/auth/refresh` | Validate refresh token against Redis & rotate | `RefreshTokenRequest` | `TokenResponse` |
| `POST` | `/taskboard/api/v1/auth/logout` | Invalidate active refresh token in Redis | `RefreshTokenRequest` (optional) | `SuccessResponse` |
| `GET` | `/taskboard/api/v1/auth/me` | Fetch authenticated user's profile | *Bearer Token* | `UserResponse` |

---

## 🐳 Running with Docker Compose

Launch the FastAPI container:

```bash
cd backend
docker compose up --build
```

---

## 🧪 Running Tests

The test suite contains unit and integration tests covering password hashing, JWT generation & verification, Redis refresh token sessions, database repositories, auth service business logic, FastAPI dependencies (`get_current_user`, `require_admin`, `require_member`), and API endpoints:

```bash
cd backend
uv run pytest -v
```
