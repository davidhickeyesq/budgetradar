"""
Generate synthetic daily_metrics data for testing the Marginal Efficiency Radar.

Creates 60 days of data for 4 channels with different efficiency profiles:
- Google Ads: High efficiency (green) - lots of headroom
- Meta Ads: Optimal (yellow) - at the efficiency wall
- TikTok Ads: Saturated (red) - past diminishing returns
- LinkedIn Ads: New channel (grey) - only 14 days of data
"""

import numpy as np
from datetime import date, timedelta
from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")


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
            "date": current_date.isoformat(),
            "channel_name": channel_name,
            "spend": spend,
            "revenue": revenue,
            "impressions": impressions,
        })
    
    return data


def main():
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("Error: Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env")
        return
    
    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("Creating test account...")
    account_response = client.table("accounts").insert({
        "name": "Demo Company",
    }).execute()
    
    account_id = account_response.data[0]["id"]
    print(f"Created account: {account_id}")
    
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
        {
            "channel_name": "Meta Ads",
            "days": 60,
            "base_spend": 1200,
            "spend_growth": 0.4,
            "max_yield": 5000,
            "beta": 1.2,
            "kappa": 1800,
        },
        {
            "channel_name": "TikTok Ads",
            "days": 60,
            "base_spend": 800,
            "spend_growth": 0.6,
            "max_yield": 2500,
            "beta": 1.8,
            "kappa": 600,
        },
        {
            "channel_name": "LinkedIn Ads",
            "days": 14,
            "base_spend": 400,
            "spend_growth": 0.2,
            "max_yield": 1500,
            "beta": 1.0,
            "kappa": 800,
        },
    ]
    
    all_metrics = []
    
    for config in channels_config:
        print(f"Generating data for {config['channel_name']}...")
        channel_data = generate_channel_data(**config)
        
        for row in channel_data:
            row["account_id"] = account_id
        
        all_metrics.extend(channel_data)
    
    print(f"Inserting {len(all_metrics)} rows into daily_metrics...")
    
    batch_size = 100
    for i in range(0, len(all_metrics), batch_size):
        batch = all_metrics[i:i + batch_size]
        client.table("daily_metrics").insert(batch).execute()
        print(f"  Inserted rows {i + 1} to {min(i + batch_size, len(all_metrics))}")
    
    print("\n✓ Seed data complete!")
    print(f"\nAccount ID: {account_id}")
    print("\nUse this account_id to test the API:")
    print(f'  curl -X POST http://localhost:8000/api/analyze-channels \\')
    print(f'    -H "Content-Type: application/json" \\')
    print(f'    -d \'{{"account_id": "{account_id}", "target_cpa": 50}}\'')


if __name__ == "__main__":
    main()
