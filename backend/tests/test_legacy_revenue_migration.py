from sqlalchemy import create_engine, inspect, text

from app.services import database


def _create_legacy_daily_metrics_table(engine) -> None:
    with engine.begin() as connection:
        connection.execute(
            text(
                """
                CREATE TABLE daily_metrics (
                    id TEXT PRIMARY KEY,
                    account_id TEXT NOT NULL,
                    date TEXT NOT NULL,
                    channel_name TEXT NOT NULL,
                    spend NUMERIC(10, 2) NOT NULL,
                    revenue NUMERIC(10, 2) NOT NULL
                )
                """
            )
        )
        connection.execute(
            text(
                """
                INSERT INTO daily_metrics (id, account_id, date, channel_name, spend, revenue)
                VALUES ('m1', 'a1', '2025-01-01', 'Google Ads', 100.00, 123.45)
                """
            )
        )


def test_migration_renames_revenue_column_and_preserves_data(monkeypatch, tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'legacy.sqlite'}")
    _create_legacy_daily_metrics_table(engine)

    monkeypatch.setattr(database, "get_engine", lambda: engine)

    migrated = database.migrate_daily_metrics_revenue_to_conversions()
    assert migrated is True

    inspector = inspect(engine)
    column_names = {column["name"] for column in inspector.get_columns("daily_metrics")}
    assert "conversions" in column_names
    assert "revenue" not in column_names

    with engine.connect() as connection:
        conversions = connection.execute(
            text("SELECT conversions FROM daily_metrics WHERE id = 'm1'")
        ).scalar_one()
    assert float(conversions) == 123.45

    migrated_again = database.migrate_daily_metrics_revenue_to_conversions()
    assert migrated_again is False
