import json
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


def test_import_accepts_column_map_for_non_canonical_headers(monkeypatch):
    fake_session = FakeSession()
    monkeypatch.setattr(import_data, "get_session", lambda: fake_session)
    client = _build_client()

    csv_content = (
        "dt,channel,cost,conv,impr\n"
        "2025-01-01,Google Ads,100.00,5.00,1000\n"
    )
    mapping = {
        "date": "dt",
        "channel_name": "channel",
        "spend": "cost",
        "conversions": "conv",
        "impressions": "impr",
    }

    response = client.post(
        "/api/import/csv",
        files={"file": ("metrics.csv", csv_content, "text/csv")},
        data={
            "account_id": str(uuid.uuid4()),
            "column_map": json.dumps(mapping),
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["rows_imported"] == 1
    assert set(body["channels"]) == {"Google Ads"}
    assert len(fake_session.added_rows) == 1


def test_import_rejects_column_map_with_unsupported_canonical_field(monkeypatch):
    def fail_get_session():
        raise AssertionError("get_session should not be called for invalid column_map")

    monkeypatch.setattr(import_data, "get_session", fail_get_session)
    client = _build_client()

    csv_content = (
        "dt,channel,cost,conv\n"
        "2025-01-01,Google Ads,100.00,5.00\n"
    )
    mapping = {
        "date": "dt",
        "channel": "channel",
    }

    response = client.post(
        "/api/import/csv",
        files={"file": ("metrics.csv", csv_content, "text/csv")},
        data={
            "account_id": str(uuid.uuid4()),
            "column_map": json.dumps(mapping),
        },
    )

    assert response.status_code == 400
    assert "unsupported canonical fields" in response.json()["detail"]


def test_import_rejects_column_map_duplicate_source_columns(monkeypatch):
    def fail_get_session():
        raise AssertionError("get_session should not be called for invalid column_map")

    monkeypatch.setattr(import_data, "get_session", fail_get_session)
    client = _build_client()

    csv_content = (
        "dt,cost\n"
        "2025-01-01,100.00\n"
    )
    mapping = {
        "spend": "cost",
        "conversions": "cost",
    }

    response = client.post(
        "/api/import/csv",
        files={"file": ("metrics.csv", csv_content, "text/csv")},
        data={
            "account_id": str(uuid.uuid4()),
            "column_map": json.dumps(mapping),
        },
    )

    assert response.status_code == 400
    assert "must be unique" in response.json()["detail"]


def test_import_rejects_column_map_with_missing_source_column(monkeypatch):
    def fail_get_session():
        raise AssertionError("get_session should not be called for invalid column_map")

    monkeypatch.setattr(import_data, "get_session", fail_get_session)
    client = _build_client()

    csv_content = (
        "dt,channel,cost,conv\n"
        "2025-01-01,Google Ads,100.00,5.00\n"
    )
    mapping = {
        "date": "missing_date_col",
    }

    response = client.post(
        "/api/import/csv",
        files={"file": ("metrics.csv", csv_content, "text/csv")},
        data={
            "account_id": str(uuid.uuid4()),
            "column_map": json.dumps(mapping),
        },
    )

    assert response.status_code == 400
    assert "not present in CSV headers" in response.json()["detail"]


def test_import_keeps_strict_validation_after_column_map(monkeypatch):
    fake_session = FakeSession()
    monkeypatch.setattr(import_data, "get_session", lambda: fake_session)
    client = _build_client()

    csv_content = (
        "dt,channel,cost,conv\n"
        "2025-01-01,Google Ads,$100,abc\n"
    )
    mapping = {
        "date": "dt",
        "channel_name": "channel",
        "spend": "cost",
        "conversions": "conv",
    }

    response = client.post(
        "/api/import/csv",
        files={"file": ("metrics.csv", csv_content, "text/csv")},
        data={
            "account_id": str(uuid.uuid4()),
            "column_map": json.dumps(mapping),
        },
    )

    assert response.status_code == 400
    detail = response.json()["detail"]
    assert detail["message"] == "CSV validation failed"
    assert any("spend must be a valid number" in err for err in detail["errors"])
    assert any("conversions must be a valid number" in err for err in detail["errors"])
    assert len(fake_session.added_rows) == 0


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


def test_import_rejects_invalid_required_numeric_values(monkeypatch):
    fake_session = FakeSession()
    monkeypatch.setattr(import_data, "get_session", lambda: fake_session)
    client = _build_client()

    csv_content = (
        "date,channel_name,spend,conversions\n"
        "2025-01-01,Google Ads,$100,abc\n"
    )

    response = client.post(
        "/api/import/csv",
        files={"file": ("metrics.csv", csv_content, "text/csv")},
        data={"account_id": str(uuid.uuid4())},
    )

    assert response.status_code == 400
    detail = response.json()["detail"]
    assert detail["message"] == "CSV validation failed"
    assert any("row 2" in err for err in detail["errors"])
    assert any("spend must be a valid number" in err for err in detail["errors"])
    assert any("conversions must be a valid number" in err for err in detail["errors"])


def test_import_rejects_negative_required_values(monkeypatch):
    fake_session = FakeSession()
    monkeypatch.setattr(import_data, "get_session", lambda: fake_session)
    client = _build_client()

    csv_content = (
        "date,channel_name,spend,conversions\n"
        "2025-01-01,Google Ads,-10,-5\n"
    )

    response = client.post(
        "/api/import/csv",
        files={"file": ("metrics.csv", csv_content, "text/csv")},
        data={"account_id": str(uuid.uuid4())},
    )

    assert response.status_code == 400
    detail = response.json()["detail"]
    assert detail["message"] == "CSV validation failed"
    assert any("spend must be non-negative" in err for err in detail["errors"])
    assert any("conversions must be non-negative" in err for err in detail["errors"])


def test_import_rejects_malformed_dates_with_400(monkeypatch):
    fake_session = FakeSession()
    monkeypatch.setattr(import_data, "get_session", lambda: fake_session)
    client = _build_client()

    csv_content = (
        "date,channel_name,spend,conversions\n"
        "not-a-date,Google Ads,100,5\n"
    )

    response = client.post(
        "/api/import/csv",
        files={"file": ("metrics.csv", csv_content, "text/csv")},
        data={"account_id": str(uuid.uuid4())},
    )

    assert response.status_code == 400
    detail = response.json()["detail"]
    assert detail["message"] == "CSV validation failed"
    assert any("date must be in YYYY-MM-DD format" in err for err in detail["errors"])
