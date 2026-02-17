from fastapi import APIRouter, HTTPException

from app.models.schemas import (
    FitModelRequest,
    FitModelResponse,
    ChannelAnalysisRequest,
    ChannelAnalysisResponse,
    MarginalCpaResult,
    HillParameters,
    AccountResponse,
)
from app.services.hill_function import (
    fit_hill_model,
    calculate_marginal_cpa,
    get_traffic_light,
    get_recommendation,
    HillFitResult,
)
from app.services.database import (
    fetch_daily_metrics,
    fetch_channels_for_account,
    get_current_spend,
    save_model_params,
    fetch_default_account,
)

router = APIRouter(prefix="/api", tags=["analysis"])


@router.get("/accounts/default", response_model=AccountResponse)
async def get_default_account():
    """
    Get the default account context.
    """
    account = fetch_default_account()
    return AccountResponse(account_id=str(account.id), name=account.name)


@router.post("/fit-model", response_model=FitModelResponse)
async def fit_model(request: FitModelRequest):
    """
    Fit Hill Function model for a specific channel and calculate marginal CPA.
    """
    spend, conversions = fetch_daily_metrics(request.account_id, request.channel_name)
    
    if len(spend) == 0:
        raise HTTPException(status_code=404, detail="No data found for this channel")
    
    fit_result = fit_hill_model(spend, conversions)
    
    if fit_result is None or fit_result.status != "success":
        status_msg = fit_result.status if fit_result else "fitting failed"
        
        if "insufficient_data" in status_msg:
            current = get_current_spend(request.account_id, request.channel_name)
            total_conversions = float(conversions.sum())
            avg_cpa = float(spend.sum()) / total_conversions if total_conversions > 0 else None
            
            return FitModelResponse(
                success=False,
                message=status_msg,
                result=MarginalCpaResult(
                    channel_name=request.channel_name,
                    current_spend=current,
                    marginal_cpa=avg_cpa,
                    target_cpa=request.target_cpa,
                    traffic_light="grey",
                    recommendation=get_recommendation("grey"),
                    model_params=None,
                )
            )
        
        return FitModelResponse(
            success=False,
            message=status_msg,
            result=None
        )
    
    params = HillParameters(
        alpha=fit_result.alpha,
        beta=fit_result.beta,
        kappa=fit_result.kappa,
        max_yield=fit_result.max_yield,
        r_squared=fit_result.r_squared,
    )
    
    save_model_params(request.account_id, request.channel_name, params)
    
    current_spend = get_current_spend(request.account_id, request.channel_name)
    marginal_cpa = calculate_marginal_cpa(current_spend, fit_result)
    traffic_light = get_traffic_light(marginal_cpa, request.target_cpa)
    
    return FitModelResponse(
        success=True,
        message="Model fitted successfully",
        result=MarginalCpaResult(
            channel_name=request.channel_name,
            current_spend=current_spend,
            marginal_cpa=marginal_cpa,
            target_cpa=request.target_cpa,
            traffic_light=traffic_light,
            recommendation=get_recommendation(traffic_light),
            model_params=params,
        )
    )


@router.post("/analyze-channels", response_model=ChannelAnalysisResponse)
async def analyze_channels(request: ChannelAnalysisRequest):
    """
    Analyze all channels for an account and return marginal CPA + traffic lights.
    """
    channels = fetch_channels_for_account(request.account_id)
    
    if not channels:
        raise HTTPException(status_code=404, detail="No channels found for this account")
    
    results: list[MarginalCpaResult] = []
    
    for channel_name in channels:
        spend, conversions = fetch_daily_metrics(request.account_id, channel_name)
        
        if len(spend) == 0:
            continue
        
        fit_result = fit_hill_model(spend, conversions)
        current_spend = get_current_spend(request.account_id, channel_name)
        
        if fit_result is None or fit_result.status != "success":
            total_conversions = float(conversions.sum())
            avg_cpa = float(spend.sum()) / total_conversions if total_conversions > 0 else None
            
            results.append(MarginalCpaResult(
                channel_name=channel_name,
                current_spend=current_spend,
                marginal_cpa=avg_cpa,
                target_cpa=request.target_cpa,
                traffic_light="grey",
                recommendation=get_recommendation("grey"),
                model_params=None,
            ))
            continue
        
        params = HillParameters(
            alpha=fit_result.alpha,
            beta=fit_result.beta,
            kappa=fit_result.kappa,
            max_yield=fit_result.max_yield,
            r_squared=fit_result.r_squared,
        )
        
        save_model_params(request.account_id, channel_name, params)
        
        marginal_cpa = calculate_marginal_cpa(current_spend, fit_result)
        traffic_light = get_traffic_light(marginal_cpa, request.target_cpa)
        
        results.append(MarginalCpaResult(
            channel_name=channel_name,
            current_spend=current_spend,
            marginal_cpa=marginal_cpa,
            target_cpa=request.target_cpa,
            traffic_light=traffic_light,
            recommendation=get_recommendation(traffic_light),
            model_params=params,
        ))
    
    results.sort(key=lambda x: (
        {"green": 0, "yellow": 1, "red": 2, "grey": 3}[x.traffic_light],
        x.marginal_cpa or float("inf")
    ))
    
    return ChannelAnalysisResponse(channels=results)


@router.get("/health")
async def health_check():
    return {"status": "healthy"}
