from pydantic import BaseModel
from typing import Literal, Optional
from datetime import date


class DailyMetric(BaseModel):
    date: date
    spend: float
    revenue: float


class HillParameters(BaseModel):
    alpha: float
    beta: float
    kappa: float
    max_yield: float
    r_squared: float
    status: str = "success"


class MarginalCpaResult(BaseModel):
    channel_name: str
    current_spend: float
    marginal_cpa: Optional[float]
    target_cpa: float
    traffic_light: Literal["green", "yellow", "red", "grey"]
    recommendation: str
    model_params: Optional[HillParameters]
    grey_reason: Optional[str] = None


class FitModelRequest(BaseModel):
    account_id: str
    channel_name: str
    target_cpa: float = 50.0


class FitModelResponse(BaseModel):
    success: bool
    message: str
    result: Optional[MarginalCpaResult]


class ChannelAnalysisRequest(BaseModel):
    account_id: str
    target_cpa: float = 50.0
    optimization_goal: Literal["revenue", "conversions"] = "revenue"


class ChannelAnalysisResponse(BaseModel):
    channels: list[MarginalCpaResult]
    optimization_mode: Literal["revenue", "conversions"] = "revenue"
    mode_label: str = "ROAS Mode"


class ModelQualityRequest(BaseModel):
    account_id: str
    channel_name: str


class ModelQualityResponse(BaseModel):
    dates: list[date]
    actual_values: list[float]
    predicted_values: list[float]
    metrics: dict[str, float]  # e.g., {"r_squared": 0.85}

