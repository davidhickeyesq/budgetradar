from datetime import date

from app.config import Settings
from app.services.google_ads_provider_types import (
    GoogleAdsMetricRow,
    normalize_customer_id,
)


class GoogleAdsRealProvider:
    provider_mode = "real"

    _required_env_fields = (
        ("GOOGLE_ADS_DEVELOPER_TOKEN", "google_ads_developer_token"),
        ("GOOGLE_ADS_CLIENT_ID", "google_ads_client_id"),
        ("GOOGLE_ADS_CLIENT_SECRET", "google_ads_client_secret"),
        ("GOOGLE_ADS_REFRESH_TOKEN", "google_ads_refresh_token"),
    )

    _channel_name_map = {
        "SEARCH": "Google Search",
        "DISPLAY": "Google Display",
        "SHOPPING": "Google Shopping",
        "VIDEO": "Google Video",
        "PERFORMANCE_MAX": "Google Performance Max",
        "DISCOVERY": "Google Discovery",
        "LOCAL": "Google Local",
        "HOTEL": "Google Hotel",
    }

    def __init__(self, settings: Settings):
        self._settings = settings

    def _validate_credentials(self) -> None:
        missing = [
            env_name
            for env_name, field_name in self._required_env_fields
            if not getattr(self._settings, field_name)
        ]
        if missing:
            raise ValueError(
                "GOOGLE_ADS_PROVIDER=real requires credentials: "
                + ", ".join(missing)
            )

        login_customer_id = self._settings.google_ads_login_customer_id
        if login_customer_id:
            normalize_customer_id(login_customer_id)

    @staticmethod
    def _normalize_channel_name(channel_type: str) -> str:
        normalized = channel_type.upper()
        mapped_name = GoogleAdsRealProvider._channel_name_map.get(normalized)
        if mapped_name:
            return mapped_name
        return f"Google {normalized.replace('_', ' ').title()}"

    def _build_client(self):
        self._validate_credentials()
        try:
            from google.ads.googleads.client import GoogleAdsClient
        except ImportError as exc:
            raise RuntimeError(
                "google-ads package is required for GOOGLE_ADS_PROVIDER=real"
            ) from exc

        config_dict = {
            "developer_token": self._settings.google_ads_developer_token,
            "client_id": self._settings.google_ads_client_id,
            "client_secret": self._settings.google_ads_client_secret,
            "refresh_token": self._settings.google_ads_refresh_token,
            "use_proto_plus": True,
        }
        login_customer_id = self._settings.google_ads_login_customer_id
        if login_customer_id:
            config_dict["login_customer_id"] = normalize_customer_id(login_customer_id)

        return GoogleAdsClient.load_from_dict(config_dict)

    def fetch_daily_metrics(
        self,
        customer_id: str,
        date_from: date,
        date_to: date,
    ) -> list[GoogleAdsMetricRow]:
        normalized_customer_id = normalize_customer_id(customer_id)
        client = self._build_client()
        service = client.get_service("GoogleAdsService")

        query = (
            "SELECT segments.date, campaign.advertising_channel_type, "
            "metrics.cost_micros, metrics.conversions, metrics.impressions "
            "FROM campaign "
            f"WHERE segments.date BETWEEN '{date_from.isoformat()}' "
            f"AND '{date_to.isoformat()}'"
        )

        aggregated: dict[tuple[date, str], dict[str, float | int]] = {}
        try:
            stream = service.search_stream(
                customer_id=normalized_customer_id,
                query=query,
            )

            for batch in stream:
                for row in batch.results:
                    raw_date = row.segments.date
                    metric_date = (
                        raw_date
                        if isinstance(raw_date, date)
                        else date.fromisoformat(str(raw_date))
                    )
                    channel_name = self._normalize_channel_name(
                        str(row.campaign.advertising_channel_type)
                    )

                    key = (metric_date, channel_name)
                    if key not in aggregated:
                        aggregated[key] = {
                            "spend": 0.0,
                            "conversions": 0.0,
                            "impressions": 0,
                        }

                    aggregated[key]["spend"] += float(row.metrics.cost_micros or 0.0) / 1_000_000
                    aggregated[key]["conversions"] += float(row.metrics.conversions or 0.0)
                    aggregated[key]["impressions"] += int(row.metrics.impressions or 0)
        except Exception as exc:
            raise RuntimeError(f"Google Ads API request failed: {exc}") from exc

        rows: list[GoogleAdsMetricRow] = []
        for (metric_date, channel_name), metrics in sorted(
            aggregated.items(),
            key=lambda item: (item[0][0], item[0][1]),
        ):
            rows.append(
                GoogleAdsMetricRow(
                    date=metric_date,
                    channel_name=channel_name,
                    spend=round(float(metrics["spend"]), 2),
                    conversions=round(float(metrics["conversions"]), 2),
                    impressions=int(metrics["impressions"]),
                )
            )

        return rows
