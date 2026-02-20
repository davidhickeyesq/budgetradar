from contextlib import contextmanager
from typing import Iterator, Optional

from fastapi.testclient import TestClient

from app import config, main


@contextmanager
def _configured_client(
    monkeypatch,
    require_api_key: bool,
    app_api_key: Optional[str],
) -> Iterator[TestClient]:
    monkeypatch.setenv("REQUIRE_API_KEY", "true" if require_api_key else "false")
    if app_api_key is None:
        monkeypatch.delenv("APP_API_KEY", raising=False)
    else:
        monkeypatch.setenv("APP_API_KEY", app_api_key)

    monkeypatch.setattr(main, "init_db", lambda: None)
    config.get_settings.cache_clear()

    try:
        with TestClient(main.app) as client:
            yield client
    finally:
        config.get_settings.cache_clear()


def test_missing_api_key_returns_401_when_protected(monkeypatch):
    with _configured_client(
        monkeypatch=monkeypatch,
        require_api_key=True,
        app_api_key="test-secret",
    ) as client:
        response = client.get("/api/import/template")

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid or missing API key"


def test_invalid_api_key_returns_401_when_protected(monkeypatch):
    with _configured_client(
        monkeypatch=monkeypatch,
        require_api_key=True,
        app_api_key="test-secret",
    ) as client:
        response = client.get(
            "/api/import/template",
            headers={"X-API-Key": "wrong-key"},
        )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid or missing API key"


def test_valid_api_key_allows_protected_route(monkeypatch):
    with _configured_client(
        monkeypatch=monkeypatch,
        require_api_key=True,
        app_api_key="test-secret",
    ) as client:
        response = client.get(
            "/api/import/template",
            headers={"X-API-Key": "test-secret"},
        )

    assert response.status_code == 200


def test_health_route_is_unprotected_even_when_api_key_is_required(monkeypatch):
    with _configured_client(
        monkeypatch=monkeypatch,
        require_api_key=True,
        app_api_key="test-secret",
    ) as client:
        response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
