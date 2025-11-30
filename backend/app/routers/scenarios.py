from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

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
    marginal_roas: float
    traffic_light: str
    r_squared: float
    warning: Optional[str] = None
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
                marginal_roas=0,
                traffic_light="grey",
                r_squared=0,
                warning="No model available",
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
        
        # Calculate marginal metrics for the PROPOSED spend
        # We use a small increment (e.g. 10%) to see the direction at that point
        from app.services.hill_function import calculate_marginal_cpa, get_traffic_light
        
        marginal_cpa = calculate_marginal_cpa(proposed_spend, fit_result)
        traffic_light = get_traffic_light(marginal_cpa, target_cpa=50.0, optimization_target="revenue")
        
        marginal_roas = 0.0
        if marginal_cpa and marginal_cpa > 0 and marginal_cpa < 9999:
            marginal_roas = 1.0 / marginal_cpa
            
        warning = None
        if params.r_squared < 0.3:
            traffic_light = "grey"
            warning = "Model uncertain (R² < 0.3)"
        
        projections.append(ChannelProjection(
            channel_name=channel_name,
            current_spend=current_spend,
            proposed_spend=proposed_spend,
            current_revenue=current_revenue,
            projected_revenue=projected_revenue,
            delta_revenue=projected_revenue - current_revenue,
            marginal_roas=marginal_roas,
            traffic_light=traffic_light,
            r_squared=params.r_squared,
            warning=warning,
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
