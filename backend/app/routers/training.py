from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.supabase_client import (
    fetch_daily_metrics,
    fetch_channels_for_account,
    save_model_params,
)
from app.services.hill_function import fit_hill_model
from app.models.schemas import HillParameters

router = APIRouter(prefix="/api", tags=["training"])


class TrainModelsResponse(BaseModel):
    status: str
    models_fitted: int
    models_skipped: int
    details: list[str]


@router.post("/train-models/{account_id}", response_model=TrainModelsResponse)
async def train_models(account_id: str):
    """
    Trigger model training for all channels in an account.
    Call this after uploading new CSV data.
    """
    channels = fetch_channels_for_account(account_id)
    
    if not channels:
        raise HTTPException(status_code=404, detail="No channels found for this account")
    
    details = []
    fitted = 0
    skipped = 0
    
    for channel_name in channels:
        spend, revenue = fetch_daily_metrics(account_id, channel_name)
        
        if len(spend) == 0:
            details.append(f"Skipped {channel_name}: No data")
            skipped += 1
            continue
        
        fit_result = fit_hill_model(spend, revenue)
        
        if fit_result is None or fit_result.status != "success":
            status_msg = fit_result.status if fit_result else "fit failed"
            details.append(f"Skipped {channel_name}: {status_msg}")
            skipped += 1
            continue
        
        params = HillParameters(
            alpha=fit_result.alpha,
            beta=fit_result.beta,
            kappa=fit_result.kappa,
            max_yield=fit_result.max_yield,
            r_squared=fit_result.r_squared,
            status=fit_result.status,
        )
        
        save_model_params(account_id, channel_name, params)
        details.append(f"Fitted {channel_name} (R²: {fit_result.r_squared:.2f})")
        fitted += 1
    
    return TrainModelsResponse(
        status="success",
        models_fitted=fitted,
        models_skipped=skipped,
        details=details,
    )
