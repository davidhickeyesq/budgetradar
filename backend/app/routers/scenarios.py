from datetime import datetime
import uuid

from fastapi import APIRouter, HTTPException

from app.config import get_settings
from app.models.schemas import (
    ScenarioChannelRecommendation,
    ScenarioCreateRequest,
    ScenarioListResponse,
    ScenarioProjectedSummary,
    ScenarioRecommendationRequest,
    ScenarioRecommendationResponse,
    ScenarioRecord,
)
from app.routers.analysis import compute_account_channel_analysis
from app.services.database import list_scenarios, save_scenario
from app.services.hill_function import (
    apply_spend_step,
    calculate_marginal_cpa,
    get_scenario_action,
    get_scenario_rationale,
)

router = APIRouter(prefix="/api/scenarios", tags=["scenarios"])


def _validate_account_id(account_id: str) -> None:
    try:
        uuid.UUID(account_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid account_id format") from exc


def _build_scenario_name(budget_delta_percent: float) -> str:
    timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    return f"Auto Scenario ({budget_delta_percent:+.1f}% budget) - {timestamp}"


def _candidate_indices(
    channels: list[dict],
    direction: str,
) -> list[int]:
    if direction == "increase":
        priority = {"green": 0, "yellow": 1, "red": 2}
        return sorted(
            [
                idx
                for idx, channel in enumerate(channels)
                if (
                    not channel["locked"]
                    and not channel["policy_hold"]
                    and channel["traffic_light"] != "grey"
                )
            ],
            key=lambda idx: (
                priority.get(channels[idx]["traffic_light"], 3),
                channels[idx]["current_marginal_cpa"]
                if channels[idx]["current_marginal_cpa"] is not None
                else float("inf"),
            ),
        )

    priority = {"red": 0, "yellow": 1, "green": 2}
    return sorted(
        [
            idx
            for idx, channel in enumerate(channels)
            if (
                not channel["locked"]
                and not channel["policy_hold"]
                and channel["traffic_light"] != "grey"
            )
        ],
        key=lambda idx: (
            priority.get(channels[idx]["traffic_light"], 3),
            -channels[idx]["current_marginal_cpa"]
            if channels[idx]["current_marginal_cpa"] is not None
            else float("inf"),
        ),
    )


def _rebalance_budget(
    channels: list[dict],
    target_total_spend: float,
    increment: float,
) -> None:
    projected_total = sum(channel["recommended_spend"] for channel in channels)
    remaining_delta = target_total_spend - projected_total
    tolerance = max(1.0, target_total_spend * 0.005)

    max_iterations = 500
    for _ in range(max_iterations):
        if abs(remaining_delta) <= tolerance:
            return

        direction = "increase" if remaining_delta > 0 else "decrease"
        candidates = _candidate_indices(channels, direction)
        if not candidates:
            return

        moved = False
        for idx in candidates:
            channel = channels[idx]
            current_spend = channel["recommended_spend"]
            next_spend = apply_spend_step(current_spend, direction, increment=increment)
            if abs(next_spend - current_spend) < 1e-6:
                continue

            channel["recommended_spend"] = next_spend
            remaining_delta -= (next_spend - current_spend)
            moved = True

            if abs(remaining_delta) <= tolerance:
                return

        if not moved:
            return


@router.post("/recommend", response_model=ScenarioRecommendationResponse)
async def recommend_scenario(request: ScenarioRecommendationRequest):
    _validate_account_id(request.account_id)

    computations = compute_account_channel_analysis(
        account_id=request.account_id,
        target_cpa=request.target_cpa,
    )
    if not computations:
        raise HTTPException(status_code=404, detail="No channels found for this account")

    locked_channels = {channel.strip().lower() for channel in request.locked_channels}
    settings = get_settings()
    increment = settings.marginal_increment
    low_confidence_policy = settings.low_confidence_scenario_policy

    working_channels: list[dict] = []
    for computation in computations:
        result = computation.result
        is_locked = result.channel_name.lower() in locked_channels
        data_quality_state = result.data_quality_state
        data_quality_reason = result.data_quality_reason
        policy_hold = data_quality_state == "low_confidence"
        is_action_blocked = policy_hold and low_confidence_policy == "block"
        blocked_reason = (
            (
                "Action blocked by low-confidence policy: "
                f"{data_quality_reason or 'model fit is below confidence threshold'}"
            )
            if is_action_blocked
            else None
        )

        if is_locked:
            action = "locked"
        elif data_quality_state == "insufficient_history":
            action = "insufficient_data"
        elif policy_hold:
            action = "maintain"
        else:
            action = get_scenario_action(result.traffic_light, locked=False)

        recommended_spend = result.current_spend
        if action == "increase":
            recommended_spend = apply_spend_step(result.current_spend, "increase", increment)
        elif action == "decrease":
            recommended_spend = apply_spend_step(result.current_spend, "decrease", increment)

        working_channels.append(
            {
                "channel_name": result.channel_name,
                "traffic_light": result.traffic_light,
                "current_spend": result.current_spend,
                "recommended_spend": recommended_spend,
                "current_marginal_cpa": result.marginal_cpa,
                "fit_result": computation.fit_result,
                "prior_adstock_state": computation.prior_adstock_state,
                "locked": is_locked,
                "policy_hold": policy_hold,
                "data_quality_state": data_quality_state,
                "data_quality_reason": data_quality_reason,
                "is_action_blocked": is_action_blocked,
                "blocked_reason": blocked_reason,
            }
        )

    current_total = sum(channel["current_spend"] for channel in working_channels)
    target_total = max(0.0, current_total * (1 + (request.budget_delta_percent / 100)))
    _rebalance_budget(working_channels, target_total, increment)

    recommendations: list[ScenarioChannelRecommendation] = []
    for channel in working_channels:
        current_spend = float(channel["current_spend"])
        recommended_spend = float(channel["recommended_spend"])
        spend_delta = recommended_spend - current_spend
        spend_delta_percent = (spend_delta / current_spend * 100) if current_spend > 0 else 0.0

        if channel["locked"]:
            final_action = "locked"
        elif channel["data_quality_state"] == "insufficient_history":
            final_action = "insufficient_data"
        elif channel["policy_hold"]:
            final_action = "maintain"
        elif spend_delta > 0.01:
            final_action = "increase"
        elif spend_delta < -0.01:
            final_action = "decrease"
        else:
            final_action = "maintain"

        projected_marginal_cpa = None
        fit_result = channel["fit_result"]
        if fit_result is not None:
            projected_marginal_cpa = calculate_marginal_cpa(
                current_spend=recommended_spend,
                params=fit_result,
                increment=increment,
                prior_adstock_state=channel["prior_adstock_state"],
            )

        rationale = get_scenario_rationale(
            traffic_light=channel["traffic_light"],
            target_cpa=request.target_cpa,
            marginal_cpa=channel["current_marginal_cpa"],
            action=final_action,
            locked=channel["locked"],
            data_quality_state=channel["data_quality_state"],
            data_quality_reason=channel["data_quality_reason"],
            blocked_reason=channel["blocked_reason"],
        )

        recommendations.append(
            ScenarioChannelRecommendation(
                channel_name=channel["channel_name"],
                action=final_action,
                rationale=rationale,
                current_spend=round(current_spend, 2),
                recommended_spend=round(recommended_spend, 2),
                spend_delta=round(spend_delta, 2),
                spend_delta_percent=round(spend_delta_percent, 2),
                current_marginal_cpa=(
                    round(float(channel["current_marginal_cpa"]), 2)
                    if channel["current_marginal_cpa"] is not None
                    else None
                ),
                projected_marginal_cpa=(
                    round(float(projected_marginal_cpa), 2)
                    if projected_marginal_cpa is not None
                    else None
                ),
                traffic_light=channel["traffic_light"],
                locked=channel["locked"],
                data_quality_state=channel["data_quality_state"],
                data_quality_reason=channel["data_quality_reason"],
                is_action_blocked=channel["is_action_blocked"],
                blocked_reason=channel["blocked_reason"],
            )
        )

    recommendations.sort(key=lambda item: abs(item.spend_delta), reverse=True)

    projected_total = sum(item.recommended_spend for item in recommendations)
    total_delta = projected_total - current_total
    total_delta_percent = (total_delta / current_total * 100) if current_total > 0 else 0.0

    projected_summary = ScenarioProjectedSummary(
        current_total_spend=round(current_total, 2),
        projected_total_spend=round(projected_total, 2),
        total_spend_delta=round(total_delta, 2),
        total_spend_delta_percent=round(total_delta_percent, 2),
        channels_increase=sum(1 for item in recommendations if item.action == "increase"),
        channels_decrease=sum(1 for item in recommendations if item.action == "decrease"),
        channels_maintain=sum(1 for item in recommendations if item.action == "maintain"),
        channels_locked=sum(1 for item in recommendations if item.action == "locked"),
        channels_insufficient_data=sum(
            1 for item in recommendations if item.action == "insufficient_data"
        ),
    )

    return ScenarioRecommendationResponse(
        scenario_name=_build_scenario_name(request.budget_delta_percent),
        recommendations=recommendations,
        projected_summary=projected_summary,
    )


@router.post("", response_model=ScenarioRecord)
async def create_scenario(request: ScenarioCreateRequest):
    _validate_account_id(request.account_id)

    scenario = save_scenario(
        account_id=request.account_id,
        name=request.name,
        budget_allocation=request.budget_allocation,
    )

    return ScenarioRecord(
        id=str(scenario.id),
        account_id=str(scenario.account_id),
        name=scenario.name,
        budget_allocation=scenario.budget_allocation,
        created_at=scenario.created_at,
        updated_at=scenario.updated_at,
    )


@router.get("/{account_id}", response_model=ScenarioListResponse)
async def get_scenarios(account_id: str):
    _validate_account_id(account_id)

    scenarios = list_scenarios(account_id)
    return ScenarioListResponse(
        scenarios=[
            ScenarioRecord(
                id=str(scenario.id),
                account_id=str(scenario.account_id),
                name=scenario.name,
                budget_allocation=scenario.budget_allocation,
                created_at=scenario.created_at,
                updated_at=scenario.updated_at,
            )
            for scenario in scenarios
        ]
    )
