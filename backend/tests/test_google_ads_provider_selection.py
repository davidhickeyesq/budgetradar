from datetime import date

from app.services import google_ads_client


def test_get_google_ads_client_defaults_to_mock():
    provider = google_ads_client.get_google_ads_client()
    assert provider.provider_mode == "mock"


def test_get_google_ads_client_uses_real_provider_when_configured(monkeypatch):
    monkeypatch.setenv("GOOGLE_ADS_PROVIDER", "real")

    class FakeRealProvider:
        provider_mode = "real"

        def __init__(self, settings):
            self.settings = settings

        def fetch_daily_metrics(
            self,
            customer_id: str,
            date_from: date,
            date_to: date,
        ):
            return []

    monkeypatch.setattr(google_ads_client, "GoogleAdsRealProvider", FakeRealProvider)
    provider = google_ads_client.get_google_ads_client()

    assert isinstance(provider, FakeRealProvider)
    assert provider.provider_mode == "real"
