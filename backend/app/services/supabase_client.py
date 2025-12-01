from supabase import create_client, Client
from functools import lru_cache
import numpy as np
from typing import Optional
from datetime import date

from app.config import get_settings
from app.models.schemas import HillParameters


@lru_cache
def get_supabase_client() -> Client:
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_key)


def fetch_daily_metrics(
    account_id: str,
    channel_name: str,
) -> tuple[np.ndarray, np.ndarray]:
    """
    Fetch daily spend and revenue for a channel, ordered by date.
    Returns (spend_array, revenue_array)
    """
    client = get_supabase_client()
    
    response = client.table("daily_metrics").select(
        "date, spend, revenue"
    ).eq(
        "account_id", account_id
    ).eq(
        "channel_name", channel_name
    ).order("date").execute()
    
    if not response.data:
        return np.array([]), np.array([])
    
    spend = np.array([row["spend"] or 0 for row in response.data])
    revenue = np.array([row["revenue"] or 0 for row in response.data])
    
    return spend, revenue


def fetch_channels_for_account(account_id: str) -> list[str]:
    """Get all unique channel names for an account."""
    client = get_supabase_client()
    
    response = client.table("daily_metrics").select(
        "channel_name"
    ).eq(
        "account_id", account_id
    ).execute()
    
    if not response.data:
        return []
    
    return list(set(row["channel_name"] for row in response.data))


def get_current_spend(account_id: str, channel_name: str) -> float:
    """Get the most recent day's spend for a channel."""
    client = get_supabase_client()
    
    response = client.table("daily_metrics").select(
        "spend"
    ).eq(
        "account_id", account_id
    ).eq(
        "channel_name", channel_name
    ).order("date", desc=True).limit(1).execute()
    
    if not response.data:
        return 0.0
    
    return float(response.data[0]["spend"] or 0)


def save_model_params(
    account_id: str,
    channel_name: str,
    params: HillParameters,
) -> None:
    """Save or update model parameters in mmm_models table."""
    client = get_supabase_client()
    
    existing = client.table("mmm_models").select("id").eq(
        "account_id", account_id
    ).eq(
        "channel_name", channel_name
    ).execute()
    
    data = {
        "account_id": account_id,
        "channel_name": channel_name,
        "alpha": params.alpha,
        "beta": params.beta,
        "kappa": params.kappa,
        "max_yield": params.max_yield,
        "r_squared": params.r_squared,
        "status": params.status,
    }
    
    if existing.data:
        client.table("mmm_models").update(data).eq(
            "id", existing.data[0]["id"]
        ).execute()
    else:
        client.table("mmm_models").insert(data).execute()


def get_model_params(
    account_id: str,
    channel_name: str,
) -> Optional[HillParameters]:
    """Fetch existing model parameters from mmm_models table."""
    client = get_supabase_client()
    
    response = client.table("mmm_models").select(
        "alpha, beta, kappa, max_yield, r_squared, status"
    ).eq(
        "account_id", account_id
    ).eq(
        "channel_name", channel_name
    ).execute()
    
    if not response.data:
        return None
    
    row = response.data[0]
    return HillParameters(
        alpha=row["alpha"],
        beta=row["beta"],
        kappa=row["kappa"],
        max_yield=row["max_yield"],
        r_squared=row["r_squared"],
        status=row.get("status", "success"),
    )
