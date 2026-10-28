"""Request ID Middleware.

Extracts incoming X-Request-ID or generates a unique UUIDv4,
attaches it to request state, and returns it in the response header.
"""

import uuid
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

REQUEST_ID_HEADER = "X-Request-ID"


class RequestIdMiddleware(BaseHTTPMiddleware):
    """Middleware that injects and propagates X-Request-ID across the request lifecycle."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Check if caller provided an X-Request-ID header, otherwise generate a UUID4
        req_id = request.headers.get(REQUEST_ID_HEADER)
        if not req_id or not req_id.strip():
            req_id = uuid.uuid4().hex

        # Store on request state so downstream handlers/loggers have access
        request.state.request_id = req_id

        response = await call_next(request)

        # Attach request ID to the outgoing response headers
        response.headers[REQUEST_ID_HEADER] = req_id
        return response
