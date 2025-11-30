import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# --- Configuration: The Hidden Truth ---
# We define the "True" nature of each channel. Your model should discover this.
CHANNELS = [
    {
        "name": "Facebook_Prospecting",
        "status": "SATURATED (Red)",
        "daily_spend_mean": 5000, 
        "spend_volatility": 0.2, # 20% variance day-to-day
        "true_roas_limit": 0.5,  # At high spend, ROAS drops to 0.5
        "curve_steepness": 2.0,  # Fast saturation
        "noise_level": 0.05      # Very clean data (Easy to model)
    },
    {
        "name": "Google_Brand_Search",
        "status": "EFFICIENT (Green)",
        "daily_spend_mean": 1000,
        "spend_volatility": 0.1,
        "true_roas_limit": 4.0,  # High return
        "curve_steepness": 0.8,  # Linear-ish (Hard to saturate)
        "noise_level": 0.02
    },
    {
        "name": "TikTok_Experimental",
        "status": "NOISY (Grey/Yellow)",
        "daily_spend_mean": 2000,
        "spend_volatility": 0.8, # Huge spikes in spend
        "true_roas_limit": 1.2,
        "curve_steepness": 1.5,
        "noise_level": 0.3       # Huge noise (Hard to fit)
    }
]

DAYS = 90
START_DATE = datetime.now() - timedelta(days=DAYS)

data_rows = []

for channel in CHANNELS:
    # 1. Create Time Series
    dates = [START_DATE + timedelta(days=i) for i in range(DAYS)]
    
    # 2. Generate Spend (Random Walk)
    spend = np.random.normal(channel['daily_spend_mean'], 
                             channel['daily_spend_mean'] * channel['spend_volatility'], 
                             DAYS)
    spend = np.maximum(spend, 100) # No negative spend
    
    # 3. Apply The "God" Logic (Hill Function)
    # Revenue = Spend * ROAS_Multiplier (Diminishing as spend goes up)
    
    # We simulate diminishing returns by damping the revenue as spend increases
    # Simple simulation logic: Revenue = Scale * Spend ^ (1/Steepness)
    # This ensures that as Spend goes up, Revenue goes up SLOWER.
    
    scale_factor = channel['true_roas_limit'] * (channel['daily_spend_mean'] ** (1 - 1/channel['curve_steepness']))
    base_revenue = scale_factor * (spend ** (1/channel['curve_steepness']))
    
    # 4. Add Realism (Noise & Seasonality)
    noise = np.random.normal(0, channel['noise_level'] * base_revenue, DAYS)
    
    # Add a "Weekly Cycle" (Sales are higher on Weekends)
    seasonality = np.array([1.2 if d.weekday() >= 5 else 0.9 for d in dates])
    
    final_revenue = (base_revenue * seasonality) + noise
    final_revenue = np.maximum(final_revenue, 0)

    for d, s, r in zip(dates, spend, final_revenue):
        data_rows.append({
            "Date": d.strftime('%Y-%m-%d'),
            "Channel Name": channel['name'],
            "Spend": round(s, 2),
            "Revenue": round(r, 2)
        })

# Export
df = pd.DataFrame(data_rows)
df.to_csv("marketing_simulation.csv", index=False)
print(f"Generated {len(df)} rows. File saved as 'marketing_simulation.csv'")
print("Upload this to your dashboard to test the Math Engine.")