from app.services.hill_function import (
    HillFitResult,
    evaluate_data_quality,
)


def _successful_fit(r_squared: float) -> HillFitResult:
    return HillFitResult(
        alpha=0.3,
        beta=1.1,
        kappa=150.0,
        max_yield=1200.0,
        r_squared=r_squared,
        status="success",
    )


def test_evaluate_data_quality_threshold_edges():
    threshold = 0.65

    below = evaluate_data_quality(
        _successful_fit(0.649),
        min_confidence_r_squared=threshold,
    )
    at_threshold = evaluate_data_quality(
        _successful_fit(0.65),
        min_confidence_r_squared=threshold,
    )
    above = evaluate_data_quality(
        _successful_fit(0.651),
        min_confidence_r_squared=threshold,
    )

    assert below.state == "low_confidence"
    assert at_threshold.state == "ok"
    assert above.state == "ok"


def test_evaluate_data_quality_maps_insufficient_history_status():
    result = evaluate_data_quality(
        HillFitResult(
            alpha=0.0,
            beta=0.0,
            kappa=0.0,
            max_yield=0.0,
            r_squared=0.0,
            status="insufficient_data: 14 days < 21 required",
        ),
        min_confidence_r_squared=0.65,
    )

    assert result.state == "insufficient_history"
    assert result.reason is not None
    assert "14 days < 21 required" in result.reason
