from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import Response
import pandas as pd
import io
import uuid
from typing import Dict, Any

from app.services.database import get_session
from app.models.db_models import DailyMetric, Account

router = APIRouter(prefix="/api/import", tags=["import"])


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
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    try:
        content = await file.read()
        df = pd.read_csv(io.BytesIO(content))
        
        # Verify required columns
        required_cols = {'date', 'channel_name', 'spend', 'conversions'}
        if not required_cols.issubset(df.columns):
            missing = required_cols - set(df.columns)
            raise HTTPException(
                status_code=400, 
                detail=f"Missing required columns: {', '.join(missing)}"
            )
        
        # Validate account exists, create if not (local mode convenience)
        session = get_session()
        try:
            # Check UUID validity
            try:
                acc_uuid = uuid.UUID(account_id)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid account_id format")
                
            account = session.query(Account).filter(Account.id == acc_uuid).first()
            if not account:
                # In local mode, we might want to auto-create, but better to be strict
                # If the user provides a random UUID, maybe create it? 
                # For now let's assume the ID comes from the seed or existing account
                raise HTTPException(status_code=404, detail="Account not found")

            # Basic data cleaning
            df['date'] = pd.to_datetime(df['date']).dt.date
            df['spend'] = pd.to_numeric(df['spend'], errors='coerce').fillna(0)
            df['conversions'] = pd.to_numeric(df['conversions'], errors='coerce').fillna(0)
            
            if 'impressions' in df.columns:
                df['impressions'] = pd.to_numeric(df['impressions'], errors='coerce').fillna(0).astype(int)
            else:
                df['impressions'] = None

            rows_processed = 0
            new_channels = set()
            
            # Upsert logic
            for _, row in df.iterrows():
                # Check for existing record
                existing = session.query(DailyMetric).filter(
                    DailyMetric.account_id == acc_uuid,
                    DailyMetric.date == row['date'],
                    DailyMetric.channel_name == row['channel_name']
                ).first()
                
                if existing:
                    existing.spend = row['spend']
                    existing.conversions = row['conversions']
                    existing.impressions = row['impressions']
                else:
                    new_metric = DailyMetric(
                        account_id=acc_uuid,
                        date=row['date'],
                        channel_name=row['channel_name'],
                        spend=row['spend'],
                        conversions=row['conversions'],
                        impressions=row['impressions']
                    )
                    session.add(new_metric)
                
                new_channels.add(row['channel_name'])
                rows_processed += 1
            
            session.commit()
            
            return {
                "success": True,
                "rows_imported": rows_processed,
                "channels": list(new_channels),
                "date_range": {
                    "start": df['date'].min().isoformat(),
                    "end": df['date'].max().isoformat()
                }
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
        headers={"Content-Disposition": "attachment; filename=budgetradar_template.csv"}
    )
