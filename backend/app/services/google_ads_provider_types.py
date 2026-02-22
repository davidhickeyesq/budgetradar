from dataclasses import dataclass
from datetime import date
import re
from typing import Protocol


@dataclass(frozen=True)
class GoogleAdsMetricRow:
    date: date
    channel_name: str
    spend: float
    conversions: float
    impressions: int


class GoogleAdsProvider(Protocol):
    provider_mode: str

    def fetch_daily_metrics(
        self,
        customer_id: str,
        date_from: date,
        date_to: date,
    ) -> list[GoogleAdsMetricRow]:
        ...


def normalize_customer_id(customer_id: str) -> str:
    normalized_customer_id = re.sub(r"\D", "", customer_id)
    if len(normalized_customer_id) != 10:
        raise ValueError("customer_id must contain exactly 10 digits")
    return normalized_customer_id
