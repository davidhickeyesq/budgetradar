import uuid

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routers import import_data


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
        self.account_exists = True
        self.added_rows = []

    def query(self, model):
        return FakeQuery(model, self)

    def add(self, obj):
        self.added_rows.append(obj)

    def commit(self):
        return None

    def close(self):
        return None


def _build_client() -> TestClient:
    app = FastAPI()
    app.include_router(import_data.router)
    return TestClient(app)


def test_import_accepts_conversions_header(monkeypatch):
    fake_session = FakeSession()
    monkeypatch.setattr(import_data, "get_session", lambda: fake_session)
    client = _build_client()

    csv_content = (
        "date,channel_name,spend,conversions,impressions\n"
        "2025-01-01,Google Ads,100.00,5.00,1000\n"
    )

    response = client.post(
        "/api/import/csv",
        files={"file": ("metrics.csv", csv_content, "text/csv")},
        data={"account_id": str(uuid.uuid4())},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["rows_imported"] == 1
    assert set(body["channels"]) == {"Google Ads"}
    assert len(fake_session.added_rows) == 1


def test_import_rejects_legacy_revenue_header(monkeypatch):
    def fail_get_session():
        raise AssertionError("get_session should not be called for invalid CSV headers")

    monkeypatch.setattr(import_data, "get_session", fail_get_session)
    client = _build_client()

    legacy_csv = (
        "date,channel_name,spend,revenue,impressions\n"
        "2025-01-01,Google Ads,100.00,5.00,1000\n"
    )

    response = client.post(
        "/api/import/csv",
        files={"file": ("metrics.csv", legacy_csv, "text/csv")},
        data={"account_id": str(uuid.uuid4())},
    )

    assert response.status_code == 400
    assert "Missing required columns: conversions" in response.json()["detail"]


def test_import_auto_creates_unknown_valid_account(monkeypatch):
    fake_session = FakeSession()
    fake_session.account_exists = False
    monkeypatch.setattr(import_data, "get_session", lambda: fake_session)
    client = _build_client()

    csv_content = (
        "date,channel_name,spend,conversions,impressions\n"
        "2025-01-01,Google Ads,100.00,5.00,1000\n"
    )
    account_id = str(uuid.uuid4())

    response = client.post(
        "/api/import/csv",
        files={"file": ("metrics.csv", csv_content, "text/csv")},
        data={"account_id": account_id},
    )

    assert response.status_code == 200
    assert response.json()["success"] is True
    assert len(fake_session.added_rows) == 2
    assert any(isinstance(row, import_data.Account) for row in fake_session.added_rows)
    assert any(isinstance(row, import_data.DailyMetric) for row in fake_session.added_rows)
