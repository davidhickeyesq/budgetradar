import numpy as np
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routers import analysis
from app.services.hill_function import HillFitResult


def _build_client() -> TestClient:
    app = FastAPI()
    app.include_router(analysis.router)
    return TestClient(app)


def test_analyze_channels_continues_to_return_results_after_rename(monkeypatch):
    monkeypatch.setattr(
        analysis,
        "fetch_channels_for_account",
        lambda account_id: ["Google Ads"],
    )
    monkeypatch.setattr(
        analysis,
        "fetch_daily_metrics",
        lambda account_id, channel_name: (
            np.array([100.0, 120.0, 140.0]),
            np.array([10.0, 11.0, 12.0]),
        ),
    )
    monkeypatch.setattr(
        analysis,
        "fit_hill_model",
        lambda spend, conversions: HillFitResult(
            alpha=0.2,
            beta=1.0,
            kappa=500.0,
            max_yield=2000.0,
            r_squared=0.95,
            status="success",
        ),
    )
    monkeypatch.setattr(analysis, "get_current_spend", lambda account_id, channel_name: 140.0)
    monkeypatch.setattr(analysis, "save_model_params", lambda *args, **kwargs: None)
    monkeypatch.setattr(analysis, "calculate_marginal_cpa", lambda current_spend, params, **kwargs: 42.0)
    monkeypatch.setattr(analysis, "get_traffic_light", lambda marginal_cpa, target_cpa: "yellow")

    client = _build_client()
    response = client.post(
        "/api/analyze-channels",
        json={"account_id": "demo-account", "target_cpa": 50.0},
    )

    assert response.status_code == 200
    payload = response.json()
    assert len(payload["channels"]) == 1

    channel = payload["channels"][0]
    assert channel["channel_name"] == "Google Ads"
    assert channel["marginal_cpa"] == 42.0
    assert channel["target_cpa"] == 50.0
    assert channel["effective_target_cpa"] == 50.0
    assert channel["target_source"] == "default"
    assert channel["traffic_light"] == "yellow"


def test_analyze_channels_applies_channel_target_cpa_override(monkeypatch):
    monkeypatch.setattr(
        analysis,
        "fetch_channels_for_account",
        lambda account_id: ["Google Ads"],
    )
    monkeypatch.setattr(
        analysis,
        "fetch_daily_metrics",
        lambda account_id, channel_name: (
            np.array([100.0, 120.0, 140.0]),
            np.array([10.0, 11.0, 12.0]),
        ),
    )
    monkeypatch.setattr(
        analysis,
        "fit_hill_model",
        lambda spend, conversions: HillFitResult(
            alpha=0.2,
            beta=1.0,
            kappa=500.0,
            max_yield=2000.0,
            r_squared=0.95,
            status="success",
        ),
    )
    monkeypatch.setattr(analysis, "get_current_spend", lambda account_id, channel_name: 140.0)
    monkeypatch.setattr(analysis, "save_model_params", lambda *args, **kwargs: None)
    monkeypatch.setattr(analysis, "calculate_marginal_cpa", lambda current_spend, params, **kwargs: 42.0)
    monkeypatch.setattr(analysis, "get_traffic_light", lambda marginal_cpa, target_cpa: "green")

    client = _build_client()
    response = client.post(
        "/api/analyze-channels",
        json={
            "account_id": "demo-account",
            "target_cpa": 50.0,
            "target_cpa_overrides": [
                {"entity_type": "channel", "entity_key": "Google Ads", "target_cpa": 80.0},
            ],
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert len(payload["channels"]) == 1
    assert payload["channels"][0]["target_cpa"] == 80.0
    assert payload["channels"][0]["effective_target_cpa"] == 80.0
    assert payload["channels"][0]["target_source"] == "override"


def test_analyze_channels_rejects_invalid_target_override_payload():
    client = _build_client()
    response = client.post(
        "/api/analyze-channels",
        json={
            "account_id": "demo-account",
            "target_cpa": 50.0,
            "target_cpa_overrides": [
                {"entity_type": "channel", "entity_key": "", "target_cpa": -1.0},
            ],
        },
    )

    assert response.status_code == 422
