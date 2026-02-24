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
| `conversions` | Number | Daily attributed conversions (supports decimals). | `4500.00` |

## Optional Columns

| Column Name | Type | Description | Example |
|-------------|------|-------------|---------|
| `impressions` | Integer | Daily impression count | `25000` |

## Example CSV

```csv
date,channel_name,spend,conversions,impressions
2025-01-01,Google Ads,1000.50,5600.00,25000
2025-01-02,Google Ads,1100.00,5800.00,26000
```

## Validation Rules
1. **Dates:** Must be valid calendar dates in exact `YYYY-MM-DD` format.
2. **Required Fields:** `date`, `channel_name`, `spend`, and `conversions` are required for every row.
3. **Numeric Values:** `spend` and `conversions` must be valid non-negative numbers.
4. **Optional Impressions:** When provided, `impressions` must be a non-negative integer.
5. **Validation Behavior:** Import is all-or-nothing. If any row is invalid, the API returns `400` with row-level error details.
6. **Duplicates:** If you upload data for a date/channel/account combination that already exists, the existing record will be **updated** (overwritten) with the new values. This allows for correcting data errors by re-uploading.

## Common Errors
- `Missing required columns`: Ensure check spelling of headers exactly.
- `CSV validation failed`: Response includes row-level errors such as invalid dates, missing channel names, or invalid numeric fields.
- `Invalid date format`: Use exact `YYYY-MM-DD` (e.g. `2025-01-01`, NOT `01/01/2025`).
- `Invalid numeric`: Use plain numeric values (no currency symbols like `$`).
