from datetime import date, timedelta
from app.config import get_settings
from app.services.google_ads_provider_real import GoogleAdsRealProvider
from app.services.google_ads_provider_types import (
    GoogleAdsMetricRow,
    GoogleAdsProvider,
    normalize_customer_id,
)


class GoogleAdsMockProvider:
    """Deterministic local provider used for local-first demo mode."""

    provider_mode = "mock"

    _channels = ("Google Search", "Google Display")

    def fetch_daily_metrics(
        self,
        customer_id: str,
        date_from: date,
        date_to: date,
    ) -> list[GoogleAdsMetricRow]:
        normalized_customer_id = normalize_customer_id(customer_id)

        rows: list[GoogleAdsMetricRow] = []
        total_days = (date_to - date_from).days + 1
        customer_seed = int(normalized_customer_id[-2:])

        for day_offset in range(total_days):
            metric_date = date_from + timedelta(days=day_offset)
            seasonal_offset = (metric_date.toordinal() % 9) * 4

            for channel_index, channel_name in enumerate(self._channels):
                base_spend = 90 + (channel_index * 35)
                spend = round(base_spend + seasonal_offset + (customer_seed % 7), 2)
                conversions = round(max(spend / (24 + (channel_index * 5)), 0.01), 2)
                impressions = int(spend * (50 + (channel_index * 15)))

                rows.append(
                    GoogleAdsMetricRow(
                        date=metric_date,
                        channel_name=channel_name,
                        spend=spend,
                        conversions=conversions,
                        impressions=impressions,
                    )
                )

        return rows


def get_google_ads_client() -> GoogleAdsProvider:
    settings = get_settings()
    if settings.google_ads_provider == "mock":
        return GoogleAdsMockProvider()
    if settings.google_ads_provider == "real":
        return GoogleAdsRealProvider(settings=settings)

    raise ValueError(f"Unsupported GOOGLE_ADS_PROVIDER: {settings.google_ads_provider}")
