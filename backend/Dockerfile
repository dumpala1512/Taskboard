# ==============================================================================
# Multi-stage Dockerfile for Task Board FastAPI Backend (Python 3.13 + uv)
# ==============================================================================

# Stage 1: Build & Dependency Resolution
FROM python:3.13-slim AS builder

WORKDIR /app

# Install system dependencies needed for compiling C extensions if required
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install uv binary from official Astral image
COPY --from=ghcr.io/astral-sh/uv:0.5.24 /uv /bin/uv

# Copy dependency configuration files
COPY pyproject.toml uv.lock ./

# Install project dependencies into virtual environment (excluding dev dependencies)
ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy
RUN uv sync --frozen --no-dev --no-install-project

# ==============================================================================
# Stage 2: Final Production Runtime Image
# ==============================================================================
FROM python:3.13-slim AS runner

WORKDIR /app

# Install curl for healthcheck probe
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root system user for security
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

# Copy virtual environment from builder stage
COPY --from=builder /app/.venv /app/.venv

# Set environment PATH to use virtualenv binaries by default
ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONPATH="/app"
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Copy application source code and migrations
COPY alembic.ini ./
COPY alembic ./alembic
COPY app ./app
COPY scripts ./scripts
COPY scripts/entrypoint.sh /entrypoint.sh

# Set executable permission on entrypoint and transfer ownership
RUN chmod +x /entrypoint.sh && chown -R appuser:appgroup /app

USER appuser

EXPOSE 8000

# Container liveness health check
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

ENTRYPOINT ["/entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
