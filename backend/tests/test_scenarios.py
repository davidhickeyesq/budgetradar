from datetime import datetime
from types import SimpleNamespace
import uuid

import numpy as np
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.models.schemas import MarginalCpaResult
from app.routers import scenarios
from app.routers.analysis import ChannelComputation
from app.services.hill_function import HillFitResult


def _build_client() -> TestClient:
    app = FastAPI()
    app.include_router(scenarios.router)
    return TestClient(app)


def _channel_computation(
    channel_name: str,
    current_spend: float,
    marginal_cpa: float | None,
    traffic_light: str,
    fit_result: HillFitResult | None = None,
) -> ChannelComputation:
    return ChannelComputation(
        result=MarginalCpaResult(
            channel_name=channel_name,
            current_spend=current_spend,
            marginal_cpa=marginal_cpa,
            target_cpa=50.0,
            traffic_light=traffic_light,
            recommendation="",
            model_params=None,
            curve_points=[],
            current_point=None,
        ),
        fit_result=fit_result,
        spend_history=np.array([current_spend], dtype=float),
        prior_adstock_state=0.0,
    )


def test_recommend_scenario_returns_deterministic_10_percent_moves(monkeypatch):
    shared_fit = HillFitResult(
        alpha=0.0,
        beta=1.0,
        kappa=100.0,
        max_yield=1000.0,
        r_squared=0.95,
        status="success",
    )

    monkeypatch.setattr(
        scenarios,
        "compute_account_channel_analysis",
        lambda account_id, target_cpa: [
            _channel_computation("Search", 100.0, 30.0, "green", fit_result=shared_fit),
            _channel_computation("Display", 100.0, 70.0, "red", fit_result=shared_fit),
        ],
    )

    client = _build_client()
    response = client.post(
        "/api/scenarios/recommend",
        json={
            "account_id": str(uuid.uuid4()),
            "target_cpa": 50.0,
            "budget_delta_percent": 0,
            "locked_channels": [],
        },
    )

    assert response.status_code == 200
    payload = response.json()
    recommendations = {row["channel_name"]: row for row in payload["recommendations"]}

    assert recommendations["Search"]["action"] == "increase"
    assert recommendations["Search"]["recommended_spend"] == 110.0
    assert recommendations["Display"]["action"] == "decrease"
    assert recommendations["Display"]["recommended_spend"] == 90.0
    assert payload["projected_summary"]["total_spend_delta"] == 0.0


def test_recommend_scenario_honors_threshold_actions_and_locks(monkeypatch):
    shared_fit = HillFitResult(
        alpha=0.0,
        beta=1.0,
        kappa=100.0,
        max_yield=1000.0,
        r_squared=0.95,
        status="success",
    )

    monkeypatch.setattr(
        scenarios,
        "compute_account_channel_analysis",
        lambda account_id, target_cpa: [
            _channel_computation("Search", 100.0, 40.0, "green", fit_result=shared_fit),
            _channel_computation("Brand", 100.0, 50.0, "yellow", fit_result=shared_fit),
            _channel_computation("Display", 100.0, 62.0, "red", fit_result=shared_fit),
            _channel_computation("Organic", 100.0, None, "grey", fit_result=None),
        ],
    )

    client = _build_client()
    response = client.post(
        "/api/scenarios/recommend",
        json={
            "account_id": str(uuid.uuid4()),
            "target_cpa": 50.0,
            "budget_delta_percent": 0,
            "locked_channels": ["Search"],
        },
    )

    assert response.status_code == 200
    payload = response.json()
    recommendations = {row["channel_name"]: row for row in payload["recommendations"]}

    assert recommendations["Search"]["action"] == "locked"
    assert recommendations["Brand"]["action"] in {"maintain", "increase"}
    assert recommendations["Display"]["action"] == "decrease"
    assert recommendations["Organic"]["action"] == "insufficient_data"
    assert "110% threshold" in recommendations["Display"]["rationale"]


def test_scenario_save_and_list_roundtrip(monkeypatch):
    account_id = str(uuid.uuid4())
    in_memory_records: list[SimpleNamespace] = []

    def fake_save_scenario(account_id: str, name: str, budget_allocation: dict):
        record = SimpleNamespace(
            id=uuid.uuid4(),
            account_id=uuid.UUID(account_id),
            name=name,
            budget_allocation=budget_allocation,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        in_memory_records.append(record)
        return record

    def fake_list_scenarios(query_account_id: str):
        return [record for record in in_memory_records if str(record.account_id) == query_account_id]

    monkeypatch.setattr(scenarios, "save_scenario", fake_save_scenario)
    monkeypatch.setattr(scenarios, "list_scenarios", fake_list_scenarios)

    client = _build_client()
    create_response = client.post(
        "/api/scenarios",
        json={
            "account_id": account_id,
            "name": "Test Scenario",
            "budget_allocation": {
                "scenario_name": "Test Scenario",
                "recommendations": [],
                "projected_summary": {},
            },
        },
    )

    assert create_response.status_code == 200
    created = create_response.json()
    assert created["name"] == "Test Scenario"
    assert created["account_id"] == account_id

    list_response = client.get(f"/api/scenarios/{account_id}")
    assert list_response.status_code == 200

    listed = list_response.json()["scenarios"]
    assert len(listed) == 1
    assert listed[0]["id"] == created["id"]
    assert listed[0]["name"] == "Test Scenario"
