from datetime import date
import uuid

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app import config
from app.routers import google_ads, import_data
from app.services.google_ads_client import GoogleAdsMetricRow


class ExistingMetric:
    def __init__(self, spend: float, conversions: float, impressions: int):
        self.spend = spend
        self.conversions = conversions
        self.impressions = impressions


class FakeQuery:
    def __init__(self, model, session):
        self.model = model
        self.session = session
        self._filters = ()

    def filter(self, *args, **kwargs):
        self._filters = args
        return self

    def first(self):
        if self.model is import_data.Account:
            return object() if self.session.account_exists else None

        if self.model is import_data.DailyMetric:
            values = {}
            for expr in self._filters:
                field_name = expr.left.name
                values[field_name] = expr.right.value
            key = (
                values.get("account_id"),
                values.get("date"),
                values.get("channel_name"),
            )
            return self.session.existing_rows.get(key)

        return None


class FakeSession:
    def __init__(self):
        self.account_exists = True
        self.existing_rows = {}
        self.added_rows = []
        self.commit_count = 0
        self.closed = False

    def query(self, model):
        return FakeQuery(model, self)

    def add(self, row):
        self.added_rows.append(row)

    def commit(self):
        self.commit_count += 1

    def close(self):
        self.closed = True


class StubGoogleAdsClient:
    def __init__(self, rows):
        self._rows = rows

    def fetch_daily_metrics(self, customer_id: str, date_from: date, date_to: date):
        return self._rows


def _build_client() -> TestClient:
    app = FastAPI()
    app.include_router(google_ads.router)
    return TestClient(app)


def test_google_ads_sync_upserts_rows(monkeypatch):
    account_id = uuid.uuid4()
    existing_row = ExistingMetric(spend=99.0, conversions=3.0, impressions=4000)

    session = FakeSession()
    session.existing_rows[(account_id, date(2025, 1, 1), "Google Search")] = existing_row

    provider_rows = [
        GoogleAdsMetricRow(
            date=date(2025, 1, 1),
            channel_name="Google Search",
            spend=150.0,
            conversions=7.0,
            impressions=7000,
        ),
        GoogleAdsMetricRow(
            date=date(2025, 1, 2),
            channel_name="Google Display",
            spend=120.0,
            conversions=4.0,
            impressions=6000,
        ),
    ]

    monkeypatch.setattr(google_ads, "get_session", lambda: session)
    monkeypatch.setattr(
        google_ads,
        "get_google_ads_client",
        lambda: StubGoogleAdsClient(provider_rows),
    )
    client = _build_client()

    response = client.post(
        "/api/import/google-ads/sync",
        json={
            "account_id": str(account_id),
            "customer_id": "123-456-7890",
            "date_from": "2025-01-01",
            "date_to": "2025-01-02",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["rows_imported"] == 2
    assert payload["channels"] == ["Google Display", "Google Search"]
    assert payload["date_range"] == {"start": "2025-01-01", "end": "2025-01-02"}

    assert existing_row.spend == 150.0
    assert existing_row.conversions == 7.0
    assert existing_row.impressions == 7000

    assert len(session.added_rows) == 1
    assert session.added_rows[0].channel_name == "Google Display"
    assert session.commit_count == 1
    assert session.closed is True


def test_google_ads_sync_rejects_large_date_range(monkeypatch):
    monkeypatch.setenv("GOOGLE_ADS_MAX_SYNC_DAYS", "7")
    config.get_settings.cache_clear()

    client = _build_client()
    response = client.post(
        "/api/import/google-ads/sync",
        json={
            "account_id": str(uuid.uuid4()),
            "customer_id": "123-456-7890",
            "date_from": "2025-01-01",
            "date_to": "2025-01-30",
        },
    )

    assert response.status_code == 400
    assert "date range exceeds maximum of 7 days" in response.json()["detail"]
