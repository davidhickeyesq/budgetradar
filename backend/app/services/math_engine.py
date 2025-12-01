import numpy as np
from app.models.schemas import HillParameters
from app.services.hill_function import hill_function, apply_adstock

def generate_predicted_history(
    spend_history: list[float],
    params: HillParameters
) -> list[float]:
    """
    Generate predicted revenue/conversions history based on spend history and model parameters.
    
    Args:
        spend_history: List of daily spend values.
        params: Saved Hill parameters (alpha, beta, kappa, max_yield).
        
    Returns:
        List of predicted values corresponding to the spend history.
    """
    if not spend_history:
        return []

    # 1. Convert to numpy array
    spend_array = np.array(spend_history, dtype=float)
    
    # 2. Apply Adstock (Time Decay)
    # We use the alpha from the saved parameters
    adstocked_spend = apply_adstock(spend_array, params.alpha)
    
    # 3. Calculate predicted values using Hill Function
    predicted_values = hill_function(
        adstocked_spend,
        params.max_yield,
        params.beta,
        params.kappa
    )
    
    # 4. Return as list
    return predicted_values.tolist()
