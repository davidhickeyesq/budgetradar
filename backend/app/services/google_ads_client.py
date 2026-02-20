from dataclasses import dataclass
from datetime import date, timedelta
import re


@dataclass(frozen=True)
class GoogleAdsMetricRow:
    date: date
    channel_name: str
    spend: float
    conversions: float
    impressions: int


class GoogleAdsClient:
    """
    Deterministic MVP provider used to exercise ingest + upsert flow locally.
    Replace with a real Google Ads integration when credentials/OAuth are added.
    """

    _channels = ("Google Search", "Google Display")

    def fetch_daily_metrics(
        self,
        customer_id: str,
        date_from: date,
        date_to: date,
    ) -> list[GoogleAdsMetricRow]:
        normalized_customer_id = re.sub(r"\D", "", customer_id)
        if len(normalized_customer_id) != 10:
            raise ValueError("customer_id must contain exactly 10 digits")

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


def get_google_ads_client() -> GoogleAdsClient:
    return GoogleAdsClient()
