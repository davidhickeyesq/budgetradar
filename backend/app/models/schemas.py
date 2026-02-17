from pydantic import BaseModel
from typing import Literal, Optional
from datetime import date


class DailyMetric(BaseModel):
    date: date
    spend: float
    conversions: float


class HillParameters(BaseModel):
    alpha: float
    beta: float
    kappa: float
    max_yield: float
    r_squared: float


class MarginalCpaResult(BaseModel):
    channel_name: str
    current_spend: float
    marginal_cpa: Optional[float]
    target_cpa: float
    traffic_light: Literal["green", "yellow", "red", "grey"]
    recommendation: str
    model_params: Optional[HillParameters]


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


class ChannelAnalysisResponse(BaseModel):
    channels: list[MarginalCpaResult]


class AccountResponse(BaseModel):
    account_id: str
    name: str
