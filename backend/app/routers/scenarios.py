from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.supabase_client import get_model_params, get_current_spend
from app.services.hill_function import predict_revenue, HillFitResult

router = APIRouter(prefix="/api", tags=["scenarios"])


class ChannelAllocation(BaseModel):
    channel_name: str
    spend: float


class SimulateScenarioRequest(BaseModel):
    account_id: str
    allocations: list[ChannelAllocation]


class ChannelProjection(BaseModel):
    channel_name: str
    current_spend: float
    proposed_spend: float
    current_revenue: float
    projected_revenue: float
    delta_revenue: float
    has_model: bool


class SimulateScenarioResponse(BaseModel):
    projections: list[ChannelProjection]
    total_current_spend: float
    total_proposed_spend: float
    total_current_revenue: float
    total_projected_revenue: float
    delta_revenue: float
    delta_spend: float


@router.post("/simulate-scenario", response_model=SimulateScenarioResponse)
async def simulate_scenario(request: SimulateScenarioRequest):
    """
    Simulate a budget reallocation scenario.
    Uses saved Hill parameters to predict revenue - pure algebra, instant response.
    """
    projections: list[ChannelProjection] = []
    
    for allocation in request.allocations:
        channel_name = allocation.channel_name
        proposed_spend = allocation.spend
        
        params = get_model_params(request.account_id, channel_name)
        current_spend = get_current_spend(request.account_id, channel_name)
        
        if params is None or params.status != "success":
            projections.append(ChannelProjection(
                channel_name=channel_name,
                current_spend=current_spend,
                proposed_spend=proposed_spend,
                current_revenue=0,
                projected_revenue=0,
                delta_revenue=0,
                has_model=False,
            ))
            continue
        
        fit_result = HillFitResult(
            alpha=params.alpha,
            beta=params.beta,
            kappa=params.kappa,
            max_yield=params.max_yield,
            r_squared=params.r_squared,
            status=params.status,
        )
        
        current_revenue = predict_revenue(current_spend, fit_result)
        projected_revenue = predict_revenue(proposed_spend, fit_result)
        
        projections.append(ChannelProjection(
            channel_name=channel_name,
            current_spend=current_spend,
            proposed_spend=proposed_spend,
            current_revenue=current_revenue,
            projected_revenue=projected_revenue,
            delta_revenue=projected_revenue - current_revenue,
            has_model=True,
        ))
    
    total_current_spend = sum(p.current_spend for p in projections)
    total_proposed_spend = sum(p.proposed_spend for p in projections)
    total_current_revenue = sum(p.current_revenue for p in projections)
    total_projected_revenue = sum(p.projected_revenue for p in projections)
    
    return SimulateScenarioResponse(
        projections=projections,
        total_current_spend=total_current_spend,
        total_proposed_spend=total_proposed_spend,
        total_current_revenue=total_current_revenue,
        total_projected_revenue=total_projected_revenue,
        delta_revenue=total_projected_revenue - total_current_revenue,
        delta_spend=total_proposed_spend - total_current_spend,
    )
