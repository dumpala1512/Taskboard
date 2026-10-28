"""Unit and Integration tests for Health Check and Middleware."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check_endpoint(async_client: AsyncClient):
    """Verify GET /taskboard/api/v1/health and root /health return 200 OK and status ok."""
    # Test primary API path
    response = await async_client.get("/taskboard/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "timestamp" in data
    assert "service" in data
    assert "x-request-id" in response.headers

    # Test root fallback
    root_resp = await async_client.get("/health")
    assert root_resp.status_code == 200
    assert root_resp.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_request_id_custom_propagation(async_client: AsyncClient):
    """Verify that an incoming X-Request-ID header is preserved and echoed back."""
    custom_id = "test-custom-request-id-999"
    response = await async_client.get("/health", headers={"X-Request-ID": custom_id})
    assert response.status_code == 200
    assert response.headers.get("x-request-id") == custom_id


@pytest.mark.asyncio
async def test_global_exception_handler_not_found(async_client: AsyncClient):
    """Verify that a 404 response returns formatted JSON error envelope."""
    response = await async_client.get("/non-existent-endpoint-xyz")
    assert response.status_code == 404
    data = response.json()
    assert data["success"] is False
    assert data["error"] == "NOT_FOUND"
    assert data["code"] == "NOT_FOUND"
    assert "request_id" in data
