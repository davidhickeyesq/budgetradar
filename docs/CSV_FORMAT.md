# CSV Import Format Specification

## File Requirements
- **Format:** Comma-Separated Values (`.csv`)
- **Headers:** Case-sensitive, exact match required.
- **Encoding:** UTF-8 recommended

## Required Columns

| Column Name | Type | Description | Example |
|-------------|------|-------------|---------|
| `date` | Date | YYYY-MM-DD format (ISO 8601) | `2025-01-31` |
| `channel_name` | String | Name of the marketing channel | `Google Ads` |
| `spend` | Number | Daily spend amount. No currency symbols. | `1250.50` |
| `revenue` | Number | Daily attributed revenue. No currency symbols. | `4500.00` |

## Optional Columns

| Column Name | Type | Description | Example |
|-------------|------|-------------|---------|
| `impressions` | Integer | Daily impression count | `25000` |

## Example CSV

```csv
date,channel_name,spend,revenue,impressions
2025-01-01,Google Ads,1000.50,5600.00,25000
2025-01-01,Meta Ads,850.25,3200.00,21000
2025-01-02,Google Ads,1100.00,5800.00,26000
2025-01-02,Meta Ads,900.00,3400.00,22000
```

## Validation Rules
1. **Dates:** Must be valid calendar dates.
2. **Numeric Values:** `spend` and `revenue` must be non-negative. Empty values will be treated as 0.
3. **Duplicates:** If you upload data for a date/channel/account combination that already exists, the existing record will be **updated** (overwritten) with the new values. This allows for correcting data errors by re-uploading.

## Common Errors
- `Missing required columns`: Ensure check spelling of headers exactly.
- `Invalid date format`: Use YYYY-MM-DD (e.g. 2025-01-01, NOT 01/01/2025).
- `Invalid numeric`: Remove '$', ',' or other symbols from spend/revenue columns.
