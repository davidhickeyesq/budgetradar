from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.services.supabase_client import get_supabase_client

router = APIRouter(prefix="/api", tags=["upload"])


class MetricRow(BaseModel):
    date: str
    channel_name: str
    spend: float
    revenue: float
    impressions: Optional[int] = None


class CsvUploadRequest(BaseModel):
    account_id: str
    data: list[MetricRow]


class CsvUploadResponse(BaseModel):
    inserted: int
    skipped: int
    message: str
    models_updated: int = 0


def parse_date(date_str: str) -> str:
    """Parse various date formats and return YYYY-MM-DD."""
    formats = [
        "%Y-%m-%d",
        "%m/%d/%Y",
        "%d/%m/%Y",
        "%Y/%m/%d",
        "%m-%d-%Y",
        "%d-%m-%Y",
    ]
    
    for fmt in formats:
        try:
            parsed = datetime.strptime(date_str.strip(), fmt)
            return parsed.strftime("%Y-%m-%d")
        except ValueError:
            continue
    
    raise ValueError(f"Could not parse date: {date_str}")


@router.post("/upload-csv", response_model=CsvUploadResponse)
async def upload_csv(request: CsvUploadRequest):
    """
    Upload CSV data to daily_metrics table.
    Handles duplicates with upsert (updates existing rows).
    """
    if not request.data:
        raise HTTPException(status_code=400, detail="No data provided")
    
    client = get_supabase_client()
    
    account = client.table("accounts").select("id").eq(
        "id", request.account_id
    ).execute()
    
    if not account.data:
        raise HTTPException(status_code=404, detail="Account not found")
    
    rows_to_insert = []
    skipped = 0
    errors = []
    
    for i, row in enumerate(request.data):
        try:
            parsed_date = parse_date(row.date)
            
            rows_to_insert.append({
                "account_id": request.account_id,
                "date": parsed_date,
                "channel_name": row.channel_name.strip(),
                "spend": round(row.spend, 2),
                "revenue": round(row.revenue, 2),
                "impressions": row.impressions,
            })
        except ValueError as e:
            errors.append(f"Row {i + 1}: {str(e)}")
            skipped += 1
        except Exception as e:
            errors.append(f"Row {i + 1}: {str(e)}")
            skipped += 1
    
    if not rows_to_insert:
        raise HTTPException(
            status_code=400, 
            detail=f"No valid rows to insert. Errors: {'; '.join(errors[:5])}"
        )
    
    inserted = 0
    batch_size = 100
    
    for i in range(0, len(rows_to_insert), batch_size):
        batch = rows_to_insert[i:i + batch_size]
        
        try:
            client.table("daily_metrics").upsert(
                batch,
                on_conflict="account_id,date,channel_name"
            ).execute()
            inserted += len(batch)
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Database error: {str(e)}"
            )
    
    message = f"Successfully uploaded {inserted} rows"
    if skipped > 0:
        message += f" ({skipped} skipped due to errors)"
    
    return CsvUploadResponse(
        inserted=inserted,
        skipped=skipped,
        message=message
    )
