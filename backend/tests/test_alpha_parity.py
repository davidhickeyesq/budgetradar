import numpy as np
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routers import analysis
from app.services.hill_function import HillFitResult, calculate_marginal_cpa


def _build_client() -> TestClient:
    app = FastAPI()
    app.include_router(analysis.router)
    return TestClient(app)


def test_calculate_marginal_cpa_changes_with_alpha_when_history_is_used():
    spend_history = np.array([100.0, 100.0, 100.0, 100.0])

    shared = {
        "beta": 1.0,
        "kappa": 200.0,
        "max_yield": 1000.0,
        "r_squared": 0.95,
        "status": "success",
    }
    zero_alpha = HillFitResult(alpha=0.0, **shared)
    high_alpha = HillFitResult(alpha=0.7, **shared)

    marginal_zero = calculate_marginal_cpa(100.0, zero_alpha, spend_history=spend_history)
    marginal_high = calculate_marginal_cpa(100.0, high_alpha, spend_history=spend_history)

    assert marginal_zero is not None
    assert marginal_high is not None
    assert marginal_high != marginal_zero


def test_analyze_channels_response_includes_curve_payload(monkeypatch):
    monkeypatch.setattr(
        analysis,
        "fetch_channels_for_account",
        lambda account_id: ["Google Ads"],
    )
    monkeypatch.setattr(
        analysis,
        "fetch_daily_metrics",
        lambda account_id, channel_name: (
            np.array([100.0, 110.0, 120.0, 130.0, 140.0]),
            np.array([20.0, 22.0, 24.0, 26.0, 27.0]),
        ),
    )
    monkeypatch.setattr(
        analysis,
        "fit_hill_model",
        lambda spend, conversions: HillFitResult(
            alpha=0.4,
            beta=1.0,
            kappa=200.0,
            max_yield=1000.0,
            r_squared=0.96,
            status="success",
        ),
    )
    monkeypatch.setattr(analysis, "get_current_spend", lambda account_id, channel_name: 140.0)
    monkeypatch.setattr(analysis, "save_model_params", lambda *args, **kwargs: None)

    client = _build_client()
    response = client.post(
        "/api/analyze-channels",
        json={"account_id": "demo-account", "target_cpa": 50.0},
    )

    assert response.status_code == 200
    payload = response.json()
    assert len(payload["channels"]) == 1

    channel = payload["channels"][0]
    assert isinstance(channel["curve_points"], list)
    assert len(channel["curve_points"]) > 0
    assert all(point["zone"] in {"green", "yellow", "red"} for point in channel["curve_points"])
    assert channel["current_point"] is not None
    assert set(channel["current_point"].keys()) == {"spend", "marginal_cpa"}
