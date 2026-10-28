"""Pytest configuration and async test fixtures."""

import os
from typing import AsyncGenerator
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

# Force test environment before importing application
os.environ["ENVIRONMENT"] = "test"
os.environ["DEBUG"] = "false"

from app.core.config import get_settings
from app.main import app


@pytest.fixture(autouse=True)
def test_settings():
    """Clear settings cache to ensure test settings are picked up."""
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest_asyncio.fixture
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    """Provide an async HTTP test client using ASGITransport."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client
