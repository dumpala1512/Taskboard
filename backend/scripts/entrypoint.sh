#!/bin/sh
set -e

echo "Starting Task Board Backend Application..."

# Inside Docker containers on Docker Desktop/bridge, localhost points to the container itself.
# Automatically map localhost to host.docker.internal for external host PostgreSQL/Redis.
if [ -n "$DATABASE_URL" ]; then
    export DATABASE_URL=$(echo "$DATABASE_URL" | sed 's/@localhost:/@host.docker.internal:/g')
fi

if [ -n "$REDIS_URL" ]; then
    export REDIS_URL=$(echo "$REDIS_URL" | sed 's/@localhost:/@host.docker.internal:/g' | sed 's/\/\/localhost:/\/\/host.docker.internal:/g')
fi

echo "Running database migrations..."
alembic upgrade head

echo "Seeding default admin user..."
python scripts/seed_admin.py || true

# If the command is uvicorn, respect $PORT provided by host platforms (e.g. Render defaults to 10000)
if [ "$1" = "uvicorn" ]; then
    APP_PORT="${PORT:-8000}"
    echo "Starting Uvicorn server on port $APP_PORT..."
    exec uvicorn app.main:app --host 0.0.0.0 --port "$APP_PORT"
fi

# Exec custom command passed into docker container
exec "$@"
