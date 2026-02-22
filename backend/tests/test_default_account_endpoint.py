from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routers import analysis


def _build_client() -> TestClient:
    app = FastAPI()
    app.include_router(analysis.router)
    return TestClient(app)


def test_get_default_account_returns_expected_payload(monkeypatch):
    monkeypatch.setattr(
        analysis,
        "get_or_create_default_account",
        lambda: ("a8465a7b-bf39-4352-9658-4f1b8d05b381", "Demo Company"),
    )
    client = _build_client()

    response = client.get("/api/accounts/default")

    assert response.status_code == 200
    assert response.json() == {
        "account_id": "a8465a7b-bf39-4352-9658-4f1b8d05b381",
        "name": "Demo Company",
    }
