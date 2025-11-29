import numpy as np
from scipy.optimize import curve_fit
from typing import Optional
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
    revenue: np.ndarray,
) -> Optional[HillFitResult]:
    """
    Fit Hill Function to spend/revenue data using grid search for alpha
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
    
    max_revenue = np.max(revenue)
    max_yield_upper = settings.max_yield_multiplier * max_revenue
    
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
            initial_guess = [max_revenue * 1.5, 1.0, np.median(adstocked_spend[adstocked_spend > 0])]
            
            bounds = (
                [0, settings.beta_min, 1e-6],
                [max_yield_upper, settings.beta_max, np.max(adstocked_spend) * 10]
            )
            
            popt, _ = curve_fit(
                hill_function,
                adstocked_spend,
                revenue,
                p0=initial_guess,
                bounds=bounds,
                maxfev=5000,
            )
            
            max_yield_fit, beta_fit, kappa_fit = popt
            
            predicted = hill_function(adstocked_spend, max_yield_fit, beta_fit, kappa_fit)
            ss_res = np.sum((revenue - predicted) ** 2)
            ss_tot = np.sum((revenue - np.mean(revenue)) ** 2)
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


def calculate_marginal_cpa(
    current_spend: float,
    params: HillFitResult,
    increment: float = 0.10
) -> Optional[float]:
    """
    Calculate Marginal CPA using the 10% increment rule (per AGENTS.md).
    
    Marginal CPA = (Spend_Next - Spend_Current) / (Conversions_Next - Conversions_Current)
    """
    if params.status != "success" or current_spend <= 0:
        return None
    
    adstocked_current = current_spend
    adstocked_next = current_spend * (1 + increment)
    
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
    
    delta_spend = adstocked_next - adstocked_current
    marginal_cpa = delta_spend / delta_conversions
    
    return marginal_cpa


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
