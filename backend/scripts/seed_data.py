"""
Generate synthetic daily_metrics data for testing the Marginal Efficiency Radar.

Creates 60 days of data for Google Ads:
- Google Ads: High efficiency (green) - lots of headroom
"""

import numpy as np
from datetime import date, timedelta
import uuid
import sys
import os

# Add parent directory to path so we can import app modules
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.services.database import get_session
from app.models.db_models import Account, DailyMetric, MMMModel


def hill_function(spend: float, max_yield: float, beta: float, kappa: float) -> float:
    """Generate revenue using Hill function with noise."""
    if spend <= 0:
        return 0
    base = max_yield * (spend ** beta) / (kappa ** beta + spend ** beta)
    noise = np.random.normal(1, 0.05)
    return max(0, base * noise)


def generate_channel_data(
    channel_name: str,
    days: int,
    base_spend: float,
    spend_growth: float,
    max_yield: float,
    beta: float,
    kappa: float,
) -> list[dict]:
    """Generate daily metrics for a channel."""
    start_date = date.today() - timedelta(days=days)
    data = []
    
    for i in range(days):
        current_date = start_date + timedelta(days=i)
        
        daily_variance = np.random.uniform(0.8, 1.2)
        weekend_factor = 0.7 if current_date.weekday() >= 5 else 1.0
        
        spend = base_spend * (1 + spend_growth * i / days) * daily_variance * weekend_factor
        spend = round(spend, 2)
        
        revenue = hill_function(spend, max_yield, beta, kappa)
        revenue = round(revenue, 2)
        
        impressions = int(spend * np.random.uniform(80, 120))
        
        data.append({
            "date": current_date,
            "channel_name": channel_name,
            "spend": spend,
            "revenue": revenue,
            "impressions": impressions,
        })
    
    return data


def main():
    session = get_session()
    
    try:
        DEMO_ACCOUNT_ID = uuid.UUID("a8465a7b-bf39-4352-9658-4f1b8d05b381")
        print("Creating test account...")
        
        # Check if account exists with the correct ID
        existing_account = session.query(Account).filter(Account.id == DEMO_ACCOUNT_ID).first()
        
        if existing_account:
            account = existing_account
            print(f"Using existing account: {account.id}")
        else:
            # Handle case where "Demo Company" exists with different ID
            name_conflict = session.query(Account).filter(Account.name == "Demo Company").first()
            if name_conflict:
                print(f"Deleting old demo account {name_conflict.id} to enforce deterministic ID")
                # Cascade delete should handle metrics if configured, but let's be safe
                session.query(DailyMetric).filter(DailyMetric.account_id == name_conflict.id).delete()
                session.query(MMMModel).filter(MMMModel.account_id == name_conflict.id).delete()
                session.delete(name_conflict)
                session.commit()
            
            account = Account(id=DEMO_ACCOUNT_ID, name="Demo Company")
            session.add(account)
            session.commit()
            print(f"Created account: {account.id}")
        
        channels_config = [
            {
                "channel_name": "Google Ads",
                "days": 60,
                "base_spend": 1500,
                "spend_growth": 0.3,
                "max_yield": 8000,
                "beta": 0.8,
                "kappa": 3000,
            },
        ]
        
        total_metrics = 0
        
        for config in channels_config:
            print(f"Generating data for {config['channel_name']}...")
            channel_data = generate_channel_data(**config)
            
            # Check for existing data to avoid violations
            existing_dates = {
                row[0] for row in session.query(DailyMetric.date)
                .filter(DailyMetric.account_id == account.id)
                .filter(DailyMetric.channel_name == config['channel_name'])
                .all()
            }
            
            metrics = []
            for row in channel_data:
                if row["date"] not in existing_dates:
                    metrics.append(DailyMetric(
                        account_id=account.id,
                        date=row["date"],
                        channel_name=row["channel_name"],
                        spend=row["spend"],
                        revenue=row["revenue"],
                        impressions=row["impressions"],
                    ))
            
            if metrics:
                session.add_all(metrics)
                total_metrics += len(metrics)
        
        session.commit()
        
        print(f"✓ Seed data complete! Added {total_metrics} daily metrics.")
        print(f"\nAccount ID: {account.id}")
        print("\nUse this account_id to test the API:")
        print(f'  curl -X POST http://localhost:8000/api/analyze-channels \\')
        print(f'    -H "Content-Type: application/json" \\')
        print(f'    -d \'{{"account_id": "{account.id}", "target_cpa": 50}}\'')
        
    except Exception as e:
        session.rollback()
        print(f"Error seeding data: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()
