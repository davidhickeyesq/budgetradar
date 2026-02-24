from datetime import date, datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field

DataQualityState = Literal["ok", "low_confidence", "insufficient_history"]


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


class CurvePoint(BaseModel):
    spend: float
    marginal_cpa: float
    zone: Literal["green", "yellow", "red"]


class CurrentPoint(BaseModel):
    spend: float
    marginal_cpa: float


class MarginalCpaResult(BaseModel):
    channel_name: str
    current_spend: float
    marginal_cpa: Optional[float]
    target_cpa: float
    traffic_light: Literal["green", "yellow", "red", "grey"]
    recommendation: str
    data_quality_state: DataQualityState = "ok"
    data_quality_reason: Optional[str] = None
    model_params: Optional[HillParameters]
    curve_points: list[CurvePoint] = Field(default_factory=list)
    current_point: Optional[CurrentPoint] = None


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


class ScenarioRecommendationRequest(BaseModel):
    account_id: str
    target_cpa: float = 50.0
    budget_delta_percent: float = 0.0
    locked_channels: list[str] = Field(default_factory=list)


class ScenarioChannelRecommendation(BaseModel):
    channel_name: str
    action: Literal["increase", "decrease", "maintain", "locked", "insufficient_data"]
    rationale: str
    current_spend: float
    recommended_spend: float
    spend_delta: float
    spend_delta_percent: float
    current_marginal_cpa: Optional[float]
    projected_marginal_cpa: Optional[float]
    traffic_light: Literal["green", "yellow", "red", "grey"]
    locked: bool = False
    data_quality_state: DataQualityState = "ok"
    data_quality_reason: Optional[str] = None
    is_action_blocked: bool = False
    blocked_reason: Optional[str] = None


class ScenarioProjectedSummary(BaseModel):
    current_total_spend: float
    projected_total_spend: float
    total_spend_delta: float
    total_spend_delta_percent: float
    channels_increase: int
    channels_decrease: int
    channels_maintain: int
    channels_locked: int
    channels_insufficient_data: int


class ScenarioRecommendationResponse(BaseModel):
    scenario_name: str
    recommendations: list[ScenarioChannelRecommendation]
    projected_summary: ScenarioProjectedSummary


class ScenarioCreateRequest(BaseModel):
    account_id: str
    name: str
    budget_allocation: dict[str, Any]


class ScenarioRecord(BaseModel):
    id: str
    account_id: str
    name: str
    budget_allocation: dict[str, Any]
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class ScenarioListResponse(BaseModel):
    scenarios: list[ScenarioRecord]
