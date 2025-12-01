from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.services.supabase_client import get_model_params, get_current_spend, get_supabase_client
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


class SaveScenarioRequest(BaseModel):
    account_id: str
    name: str
    description: Optional[str] = None
    allocations: list[ChannelAllocation]


class SavedScenario(BaseModel):
    id: str
    account_id: str
    name: str
    description: Optional[str]
    budget_allocation: list[ChannelAllocation]
    created_at: str
    updated_at: str


@router.post("/save-scenario")
async def save_scenario(request: SaveScenarioRequest):
    """
    Save a budget allocation scenario for later comparison.
    """
    # Convert allocations to JSONB format
    budget_allocation = [
        {"channel_name": a.channel_name, "spend": a.spend}
        for a in request.allocations
    ]
    
    try:
        client = get_supabase_client()
        result = client.table("scenarios").insert({
            "account_id": request.account_id,
            "name": request.name,
            "description": request.description,
            "budget_allocation": budget_allocation,
        }).execute()
        
        return {"success": True, "scenario_id": result.data[0]["id"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save scenario: {str(e)}")


@router.put("/update-scenario/{scenario_id}")
async def update_scenario(scenario_id: str, request: SaveScenarioRequest):
    """
    Update an existing budget allocation scenario.
    """
    # Convert allocations to JSONB format
    budget_allocation = [
        {"channel_name": a.channel_name, "spend": a.spend}
        for a in request.allocations
    ]
    
    try:
        client = get_supabase_client()
        # Verify ownership (optional but good practice, though we trust account_id from request for now)
        # In a real app we'd check if the scenario belongs to the account_id
        
        result = client.table("scenarios").update({
            "name": request.name,
            "description": request.description,
            "budget_allocation": budget_allocation,
            "updated_at": datetime.now().isoformat(),
        }).eq("id", scenario_id).eq("account_id", request.account_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Scenario not found or access denied")
            
        return {"success": True, "scenario_id": scenario_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update scenario: {str(e)}")


@router.get("/scenarios/{account_id}")
async def get_saved_scenarios(account_id: str):
    """
    Get all saved scenarios for an account.
    """
    try:
        client = get_supabase_client()
        result = client.table("scenarios").select("*").eq("account_id", account_id).order("created_at", desc=True).execute()
        
        scenarios = []
        for row in result.data:
            scenarios.append(SavedScenario(
                id=row["id"],
                account_id=row["account_id"],
                name=row["name"],
                description=row.get("description"),
                budget_allocation=[
                    ChannelAllocation(channel_name=a["channel_name"], spend=a["spend"])
                    for a in row["budget_allocation"]
                ],
                created_at=row["created_at"],
                updated_at=row["updated_at"],
            ))
        
        return {"scenarios": scenarios}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch scenarios: {str(e)}")
