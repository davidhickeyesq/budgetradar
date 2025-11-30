from pydantic_settings import BaseSettings
from functools import lru_cache


from typing import Literal


class Settings(BaseSettings):
    supabase_url: str
    supabase_service_key: str
    
    # Optimization target: "revenue" (ROAS-based) or "conversions" (CPA-based)
    # MVP defaults to "revenue" since that's what CSV contains
    optimization_target: Literal["revenue", "conversions"] = "revenue"
    
    min_data_days: int = 21
    marginal_increment: float = 0.10
    
    alpha_min: float = 0.0
    alpha_max: float = 0.8
    alpha_step: float = 0.1
    
    beta_min: float = 0.5
    beta_max: float = 3.0
    
    max_yield_multiplier: float = 3.0

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
