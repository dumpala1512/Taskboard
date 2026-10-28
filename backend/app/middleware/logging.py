"""Structured Request Logging Middleware."""

import logging
import time
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("app.access")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware that measures execution latency and logs inbound HTTP requests."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        start_time = time.perf_counter()
        req_id = getattr(request.state, "request_id", "unknown")
        client_ip = request.client.host if request.client else "unknown"

        logger.info(
            "[%s] Started %s %s from %s",
            req_id,
            request.method,
            request.url.path,
            client_ip,
        )

        try:
            response = await call_next(request)
            duration_ms = (time.perf_counter() - start_time) * 1000.0

            logger.info(
                "[%s] Completed %s %s -> %d in %.2fms",
                req_id,
                request.method,
                request.url.path,
                response.status_code,
                duration_ms,
            )
            return response
        except Exception as exc:
            duration_ms = (time.perf_counter() - start_time) * 1000.0
            logger.error(
                "[%s] Failed %s %s in %.2fms: %s",
                req_id,
                request.method,
                request.url.path,
                duration_ms,
                str(exc),
            )
            raise exc
