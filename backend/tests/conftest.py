import os

import pytest
from fastapi.testclient import TestClient

# Minimal env so Settings() can initialize during imports in tests.
os.environ.setdefault("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/clozr_exchange_test")
os.environ.setdefault("APP_NAME", "CLOZR Exchange API")
os.environ.setdefault("ENVIRONMENT", "test")

from app.core.database import get_db
from app.main import app


class _FakeSession:
    def commit(self) -> None:
        pass


@pytest.fixture
def client() -> TestClient:
    def _fake_db():
        yield _FakeSession()

    app.dependency_overrides[get_db] = _fake_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
