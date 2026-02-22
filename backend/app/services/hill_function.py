import numpy as np
from scipy.optimize import curve_fit
from typing import Literal, Optional
from dataclasses import dataclass

from app.config import get_settings


@dataclass
class HillFitResult:
    alpha: float
    beta: float
    kappa: float
    max_yield: float
    r_squared: float
    status: str


def hill_function(spend: np.ndarray, max_yield: float, beta: float, kappa: float) -> np.ndarray:
    """
    Hill Function for diminishing returns:
    Conversion = S * (Spend^beta) / (kappa^beta + Spend^beta)
    
    Where:
    - S (max_yield) = asymptote (maximum possible conversions)
    - beta = slope/elasticity
    - kappa = half-saturation point (spend at which you get 50% of max)
    """
    spend = np.maximum(spend, 1e-10)
    numerator = np.power(spend, beta)
    denominator = np.power(kappa, beta) + numerator
    return max_yield * (numerator / denominator)


def apply_adstock(spend: np.ndarray, alpha: float) -> np.ndarray:
    """
    Apply adstock transformation to capture carryover effects.
    adstock_t = spend_t + alpha * adstock_{t-1}
    
    Alpha range: 0.0 to 0.8 (per AGENTS.md guidelines)
    """
    if alpha == 0:
        return spend
    
    adstocked = np.zeros_like(spend, dtype=float)
    adstocked[0] = spend[0]
    
    for t in range(1, len(spend)):
        adstocked[t] = spend[t] + alpha * adstocked[t - 1]
    
    return adstocked


def fit_hill_model(
    spend: np.ndarray,
    conversions: np.ndarray,
) -> Optional[HillFitResult]:
    """
    Fit Hill Function to spend/conversions data using grid search for alpha
    and curve_fit for Hill parameters.
    
    Returns None if fitting fails or data is insufficient.
    """
    settings = get_settings()
    
    non_zero_days = np.sum(spend > 0)
    if non_zero_days < settings.min_data_days:
        return HillFitResult(
            alpha=0, beta=0, kappa=0, max_yield=0, r_squared=0,
            status=f"insufficient_data: {non_zero_days} days < {settings.min_data_days} required"
        )
    
    max_conversions = np.max(conversions)
    max_yield_upper = settings.max_yield_multiplier * max_conversions
    
    alpha_values = np.arange(
        settings.alpha_min,
        settings.alpha_max + settings.alpha_step,
        settings.alpha_step
    )
    
    best_result: Optional[HillFitResult] = None
    best_r_squared = -np.inf
    
    for alpha in alpha_values:
        adstocked_spend = apply_adstock(spend, alpha)
        
        try:
            initial_guess = [max_conversions * 1.5, 1.0, np.median(adstocked_spend[adstocked_spend > 0])]
            
            bounds = (
                [0, settings.beta_min, 1e-6],
                [max_yield_upper, settings.beta_max, np.max(adstocked_spend) * 10]
            )
            
            popt, _ = curve_fit(
                hill_function,
                adstocked_spend,
                conversions,
                p0=initial_guess,
                bounds=bounds,
                maxfev=5000,
            )
            
            max_yield_fit, beta_fit, kappa_fit = popt
            
            predicted = hill_function(adstocked_spend, max_yield_fit, beta_fit, kappa_fit)
            ss_res = np.sum((conversions - predicted) ** 2)
            ss_tot = np.sum((conversions - np.mean(conversions)) ** 2)
            r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0
            
            if r_squared > best_r_squared:
                best_r_squared = r_squared
                best_result = HillFitResult(
                    alpha=float(alpha),
                    beta=float(beta_fit),
                    kappa=float(kappa_fit),
                    max_yield=float(max_yield_fit),
                    r_squared=float(r_squared),
                    status="success"
                )
                
        except RuntimeError:
            continue
        except ValueError:
            continue
    
    if best_result is None:
        return HillFitResult(
            alpha=0, beta=0, kappa=0, max_yield=0, r_squared=0,
            status="failed: curve fitting did not converge"
        )
    
    return best_result


def get_prior_adstock_state(
    current_spend: float,
    alpha: float,
    spend_history: Optional[np.ndarray] = None,
) -> float:
    """
    Resolve adstock_{t-1} so marginal CPA can evaluate spend_t with carryover.
    """
    if alpha <= 0 or spend_history is None:
        return 0.0

    history = np.asarray(spend_history, dtype=float)
    if history.size == 0:
        return 0.0

    # If history includes current_spend as last point, exclude it for prior state.
    if np.isclose(history[-1], current_spend):
        prior_history = history[:-1]
    else:
        prior_history = history

    if prior_history.size == 0:
        return 0.0

    return float(apply_adstock(prior_history, alpha)[-1])


def calculate_marginal_cpa(
    current_spend: float,
    params: HillFitResult,
    increment: float = 0.10,
    spend_history: Optional[np.ndarray] = None,
    prior_adstock_state: Optional[float] = None,
) -> Optional[float]:
    """
    Calculate Marginal CPA using the 10% increment rule (per AGENTS.md).
    
    Marginal CPA = (Spend_Next - Spend_Current) / (Conversions_Next - Conversions_Current)
    """
    if params.status != "success" or current_spend <= 0:
        return None

    prior_state = (
        float(prior_adstock_state)
        if prior_adstock_state is not None
        else get_prior_adstock_state(current_spend, params.alpha, spend_history)
    )

    spend_next = current_spend * (1 + increment)
    adstocked_current = current_spend + (params.alpha * prior_state)
    adstocked_next = spend_next + (params.alpha * prior_state)

    conversions_current = hill_function(
        np.array([adstocked_current]),
        params.max_yield,
        params.beta,
        params.kappa
    )[0]
    
    conversions_next = hill_function(
        np.array([adstocked_next]),
        params.max_yield,
        params.beta,
        params.kappa
    )[0]
    
    delta_conversions = conversions_next - conversions_current
    
    if delta_conversions <= 0:
        return None
    
    delta_spend = spend_next - current_spend
    marginal_cpa = delta_spend / delta_conversions

    return marginal_cpa


def generate_marginal_curve_points(
    current_spend: float,
    params: HillFitResult,
    target_cpa: float,
    spend_history: Optional[np.ndarray] = None,
    increment: float = 0.10,
) -> tuple[list[dict[str, float | str]], Optional[dict[str, float]]]:
    """
    Generate backend chart payload so frontend and backend share identical math.
    """
    if params.status != "success" or current_spend <= 0:
        return [], None

    prior_state = get_prior_adstock_state(current_spend, params.alpha, spend_history)

    min_spend = max(current_spend * 0.05, 10.0)
    max_spend = max(current_spend * 4.0, min_spend * 1.1)
    num_points = 120
    step = (max_spend - min_spend) / num_points

    points: list[dict[str, float | str]] = []
    for idx in range(num_points + 1):
        spend_level = min_spend + (idx * step)
        marginal_cpa = calculate_marginal_cpa(
            spend_level,
            params,
            increment=increment,
            prior_adstock_state=prior_state,
        )
        if marginal_cpa is None or marginal_cpa > target_cpa * 5:
            continue

        zone = get_traffic_light(marginal_cpa, target_cpa)
        if zone == "grey":
            continue

        points.append(
            {
                "spend": float(round(spend_level)),
                "marginal_cpa": round(float(marginal_cpa), 2),
                "zone": zone,
            }
        )

    current_marginal_cpa = calculate_marginal_cpa(
        current_spend,
        params,
        increment=increment,
        prior_adstock_state=prior_state,
    )
    current_point = (
        {
            "spend": float(round(current_spend)),
            "marginal_cpa": round(float(current_marginal_cpa), 2),
        }
        if current_marginal_cpa is not None
        else None
    )

    return points, current_point


def get_traffic_light(marginal_cpa: Optional[float], target_cpa: float) -> str:
    """
    Determine traffic light based on marginal CPA vs target CPA.
    
    Green: Marginal CPA < 0.9 × Target CPA → Scale spend
    Yellow: 0.9 × Target CPA ≤ Marginal CPA ≤ 1.1 × Target CPA → Maintain
    Red: Marginal CPA > 1.1 × Target CPA → Cut spend (saturated)
    Grey: Insufficient data
    """
    if marginal_cpa is None:
        return "grey"
    
    ratio = marginal_cpa / target_cpa
    
    if ratio < 0.9:
        return "green"
    elif ratio <= 1.1:
        return "yellow"
    else:
        return "red"


def get_recommendation(traffic_light: str) -> str:
    recommendations = {
        "green": "Scale spend - Room for efficient growth",
        "yellow": "Maintain - At optimal efficiency",
        "red": "Cut spend - Hitting diminishing returns",
        "grey": "Insufficient data (need 21+ days)"
    }
    return recommendations.get(traffic_light, "Unknown status")


def apply_spend_step(
    spend: float,
    direction: Literal["increase", "decrease"],
    increment: float = 0.10,
) -> float:
    """Apply a single bounded spend step used in scenario simulation."""
    if direction == "increase":
        return max(0.0, spend * (1 + increment))
    return max(0.0, spend * (1 - increment))


def get_scenario_action(traffic_light: str, locked: bool = False) -> str:
    """Map traffic-light status into scenario planning action labels."""
    if locked:
        return "locked"

    if traffic_light == "green":
        return "increase"
    if traffic_light == "red":
        return "decrease"
    if traffic_light == "yellow":
        return "maintain"
    return "insufficient_data"


def get_scenario_rationale(
    traffic_light: str,
    target_cpa: float,
    marginal_cpa: Optional[float],
    action: str,
    locked: bool = False,
) -> str:
    """Explain recommendations using the 90%-110% target CPA guardrails."""
    lower_bound = 0.9 * target_cpa
    upper_bound = 1.1 * target_cpa

    if locked:
        return "Channel is locked, so spend is held constant."

    if marginal_cpa is None or traffic_light == "grey":
        return "Insufficient data (< 21 days) to estimate reliable marginal CPA."

    if traffic_light == "green":
        if action == "decrease":
            return (
                f"Marginal CPA ${marginal_cpa:.2f} is below 90% threshold "
                f"(${lower_bound:.2f}), but spend was reduced to satisfy overall budget constraints."
            )
        if action == "maintain":
            return (
                f"Marginal CPA ${marginal_cpa:.2f} is below 90% threshold "
                f"(${lower_bound:.2f}), but spend is held flat due scenario constraints."
            )
        return (
            f"Marginal CPA ${marginal_cpa:.2f} is below 90% threshold "
            f"(${lower_bound:.2f}); scale budget in 10% steps."
        )

    if traffic_light == "yellow":
        if action == "increase":
            return (
                f"Marginal CPA ${marginal_cpa:.2f} is within the 90%-110% band "
                f"(${lower_bound:.2f}-${upper_bound:.2f}); spend was increased to meet the target budget."
            )
        if action == "decrease":
            return (
                f"Marginal CPA ${marginal_cpa:.2f} is within the 90%-110% band "
                f"(${lower_bound:.2f}-${upper_bound:.2f}); spend was reduced to meet the target budget."
            )
        return (
            f"Marginal CPA ${marginal_cpa:.2f} is within the 90%-110% band "
            f"(${lower_bound:.2f}-${upper_bound:.2f}); maintain current spend."
        )

    if traffic_light == "red":
        if action == "increase":
            return (
                f"Marginal CPA ${marginal_cpa:.2f} exceeds 110% threshold "
                f"(${upper_bound:.2f}), but spend was increased to satisfy overall budget constraints."
            )
        if action == "maintain":
            return (
                f"Marginal CPA ${marginal_cpa:.2f} exceeds 110% threshold "
                f"(${upper_bound:.2f}), but spend is held flat due scenario constraints."
            )
        return (
            f"Marginal CPA ${marginal_cpa:.2f} exceeds 110% threshold "
            f"(${upper_bound:.2f}); reduce spend in 10% steps."
        )

    if action == "increase":
        return "Budget increase distributed to this channel in 10% steps."
    if action == "decrease":
        return "Budget reduction distributed from this channel in 10% steps."
    return "No spend change recommended."
