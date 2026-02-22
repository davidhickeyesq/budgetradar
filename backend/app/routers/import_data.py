from dataclasses import dataclass
from datetime import date
from typing import Any, Dict, Iterable, Optional
import io
import uuid

import pandas as pd
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import Response

from app.models.db_models import Account, DailyMetric
from app.services.database import get_session

router = APIRouter(prefix="/api/import", tags=["import"])


@dataclass(frozen=True)
class DailyMetricUpsertRow:
    date: date
    channel_name: str
    spend: float
    conversions: float
    impressions: Optional[int] = None


def parse_account_id(account_id: str) -> uuid.UUID:
    try:
        return uuid.UUID(account_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid account_id format") from exc


def ensure_account_exists(
    session: Any,
    account_id: uuid.UUID,
    create_if_missing: bool = False,
) -> Account:
    account = session.query(Account).filter(Account.id == account_id).first()
    if account:
        return account

    if create_if_missing:
        account = Account(id=account_id, name="Imported Account")
        session.add(account)
        # SQLAlchemy sessions support flush; fakes in tests may not.
        if hasattr(session, "flush"):
            session.flush()
        return account

    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    return account


def upsert_daily_metrics_rows(
    session: Any,
    account_id: uuid.UUID,
    rows: Iterable[DailyMetricUpsertRow],
) -> tuple[int, set[str], dict[str, Optional[str]]]:
    rows_processed = 0
    channels: set[str] = set()
    start_date: Optional[date] = None
    end_date: Optional[date] = None

    for row in rows:
        existing = session.query(DailyMetric).filter(
            DailyMetric.account_id == account_id,
            DailyMetric.date == row.date,
            DailyMetric.channel_name == row.channel_name,
        ).first()

        if existing:
            existing.spend = row.spend
            existing.conversions = row.conversions
            existing.impressions = row.impressions
        else:
            session.add(
                DailyMetric(
                    account_id=account_id,
                    date=row.date,
                    channel_name=row.channel_name,
                    spend=row.spend,
                    conversions=row.conversions,
                    impressions=row.impressions,
                )
            )

        channels.add(row.channel_name)
        rows_processed += 1

        if start_date is None or row.date < start_date:
            start_date = row.date
        if end_date is None or row.date > end_date:
            end_date = row.date

    date_range = {
        "start": start_date.isoformat() if start_date else None,
        "end": end_date.isoformat() if end_date else None,
    }
    return rows_processed, channels, date_range


@router.post("/csv")
async def import_csv(
    file: UploadFile = File(...),
    account_id: str = Form(...),
) -> Dict[str, Any]:
    """
    Import daily metrics from a CSV file.
    Required columns: date, channel_name, spend, conversions
    Optional columns: impressions
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    try:
        content = await file.read()
        df = pd.read_csv(io.BytesIO(content))

        required_cols = {"date", "channel_name", "spend", "conversions"}
        if not required_cols.issubset(df.columns):
            missing = required_cols - set(df.columns)
            raise HTTPException(
                status_code=400,
                detail=f"Missing required columns: {', '.join(missing)}",
            )

        session = get_session()
        try:
            acc_uuid = parse_account_id(account_id)
            ensure_account_exists(session, acc_uuid, create_if_missing=True)

            df["date"] = pd.to_datetime(df["date"]).dt.date
            df["spend"] = pd.to_numeric(df["spend"], errors="coerce").fillna(0)
            df["conversions"] = pd.to_numeric(df["conversions"], errors="coerce").fillna(0)

            if "impressions" in df.columns:
                df["impressions"] = (
                    pd.to_numeric(df["impressions"], errors="coerce").fillna(0).astype(int)
                )
            else:
                df["impressions"] = None

            rows = [
                DailyMetricUpsertRow(
                    date=row.date,
                    channel_name=row.channel_name,
                    spend=float(row.spend),
                    conversions=float(row.conversions),
                    impressions=None if pd.isna(row.impressions) else int(row.impressions),
                )
                for row in df.itertuples(index=False)
            ]

            rows_processed, channels, date_range = upsert_daily_metrics_rows(
                session=session,
                account_id=acc_uuid,
                rows=rows,
            )

            session.commit()

            return {
                "success": True,
                "rows_imported": rows_processed,
                "channels": list(channels),
                "date_range": date_range,
            }
        finally:
            session.close()

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/template")
async def get_csv_template():
    """Download a template CSV file for importing data."""
    csv_content = """date,channel_name,spend,conversions,impressions
2025-01-01,Google Ads,1000.50,5600.00,25000
2025-01-02,Google Ads,1100.00,5800.00,26000"""

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=budgetradar_template.csv"},
    )
