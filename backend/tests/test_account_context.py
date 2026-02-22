import uuid

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routers import analysis, import_data


class FakeQuery:
    def __init__(self, model, session):
        self.model = model
        self.session = session

    def filter(self, *args, **kwargs):
        return self

    def first(self):
        if self.model is import_data.Account:
            return object() if self.session.account_exists else None
        return None


class FakeSession:
    def __init__(self):
        self.account_exists = False
        self.added_rows = []

    def query(self, model):
        return FakeQuery(model, self)

    def add(self, obj):
        self.added_rows.append(obj)

    def commit(self):
        return None

    def close(self):
        return None


def test_get_default_account(monkeypatch):
    monkeypatch.setattr(
        analysis,
        "get_or_create_default_account",
        lambda: ("a8465a7b-bf39-4352-9658-4f1b8d05b381", "Demo Company"),
    )

    app = FastAPI()
    app.include_router(analysis.router)
    client = TestClient(app)

    response = client.get("/api/accounts/default")

    assert response.status_code == 200
    data = response.json()
    assert data == {
        "account_id": "a8465a7b-bf39-4352-9658-4f1b8d05b381",
        "name": "Demo Company",
    }


def test_import_auto_create_account(monkeypatch):
    fake_session = FakeSession()
    monkeypatch.setattr(import_data, "get_session", lambda: fake_session)

    app = FastAPI()
    app.include_router(import_data.router)
    client = TestClient(app)

    new_account_id = str(uuid.uuid4())
    csv_content = (
        "date,channel_name,spend,conversions,impressions\n"
        "2025-01-01,Test Channel,100.00,5.00,1000\n"
    )

    response = client.post(
        "/api/import/csv",
        files={"file": ("metrics.csv", csv_content, "text/csv")},
        data={"account_id": new_account_id},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert any(isinstance(row, import_data.Account) for row in fake_session.added_rows)
