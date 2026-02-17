from typing import Optional
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database Config
    database_url: str = "postgresql://localuser:localpass@postgres:5432/budgetradar"
    use_supabase: bool = False
    
    # Supabase (Optional for local mode)
    supabase_url: Optional[str] = None
    supabase_service_key: Optional[str] = None
    
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
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
