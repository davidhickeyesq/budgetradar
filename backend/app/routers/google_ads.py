from datetime import date
import re
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator, model_validator

from app.config import get_settings
from app.routers.import_data import (
    DailyMetricUpsertRow,
    ensure_account_exists,
    parse_account_id,
    upsert_daily_metrics_rows,
)
from app.services.database import get_session
from app.services.google_ads_client import get_google_ads_client

router = APIRouter(prefix="/api/import", tags=["import"])


class GoogleAdsSyncRequest(BaseModel):
    account_id: str
    customer_id: str
    date_from: date
    date_to: date

    @field_validator("customer_id")
    @classmethod
    def validate_customer_id(cls, value: str) -> str:
        normalized = re.sub(r"\D", "", value)
        if len(normalized) != 10:
            raise ValueError("customer_id must contain exactly 10 digits")
        return value

    @model_validator(mode="after")
    def validate_date_range(self):
        if self.date_to < self.date_from:
            raise ValueError("date_to must be on or after date_from")
        return self


class GoogleAdsSyncResponse(BaseModel):
    success: bool
    rows_imported: int
    channels: list[str]
    date_range: dict[str, Any]


@router.post("/google-ads/sync", response_model=GoogleAdsSyncResponse)
async def sync_google_ads(request: GoogleAdsSyncRequest):
    settings = get_settings()
    total_days = (request.date_to - request.date_from).days + 1
    if total_days > settings.google_ads_max_sync_days:
        raise HTTPException(
            status_code=400,
            detail=(
                "date range exceeds maximum of "
                f"{settings.google_ads_max_sync_days} days"
            ),
        )

    session = get_session()
    try:
        account_uuid = parse_account_id(request.account_id)
        ensure_account_exists(session, account_uuid, create_if_missing=True)

        google_ads_client = get_google_ads_client()
        provider_rows = google_ads_client.fetch_daily_metrics(
            customer_id=request.customer_id,
            date_from=request.date_from,
            date_to=request.date_to,
        )

        upsert_rows = [
            DailyMetricUpsertRow(
                date=row.date,
                channel_name=row.channel_name,
                spend=row.spend,
                conversions=row.conversions,
                impressions=row.impressions,
            )
            for row in provider_rows
        ]

        rows_imported, channels, date_range = upsert_daily_metrics_rows(
            session=session,
            account_id=account_uuid,
            rows=upsert_rows,
        )
        session.commit()

        return GoogleAdsSyncResponse(
            success=True,
            rows_imported=rows_imported,
            channels=sorted(channels),
            date_range=date_range,
        )
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        if hasattr(session, "rollback"):
            session.rollback()
        raise HTTPException(status_code=502, detail=f"Google Ads sync failed: {exc}") from exc
    finally:
        session.close()
