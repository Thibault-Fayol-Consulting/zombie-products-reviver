# Zombie Products Reviver

A Google Ads Script that identifies Shopping products with zero impressions and boosts their bids to attempt re-activation.

## What It Does

- Identifies products receiving zero impressions over the configured date range
- Increases MaxCpc by a configurable percentage to improve ad rank
- Enforces a hard CPC cap to prevent runaway bid increases
- Skips auto-bidding campaigns where MaxCpc is not available
- Sends an email report of all boosted products

## Compounding Risk Warning

Each time this script runs, it increases bids by the configured percentage. If scheduled repeatedly, bids compound:

| Run | CPC (20% boost, starting at 1.00) |
|-----|----------------------------------|
| 1 | 1.20 |
| 2 | 1.44 |
| 3 | 1.73 |
| 4 | 2.07 |
| 5 | 2.49 |

The MAX_CPC_CAP prevents bids from exceeding a hard limit. Monitor results and pause the script once products start receiving impressions.

## Setup

1. In Google Ads, go to Tools > Bulk Actions > Scripts
2. Click + to create a new script
3. Paste the contents of main_en.gs (or main_fr.gs for French)
4. Update the CONFIG block with your settings
5. Authorize the script when prompted
6. Set TEST_MODE to false when ready to apply bid changes
7. Schedule to run weekly (or run manually)

## CONFIG Reference

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| TEST_MODE | boolean | true | When true, logs only. When false, applies bid changes and sends email. |
| EMAIL | string | - | Email address for report notifications. |
| CPC_BOOST_PERCENT | number | 20 | Percentage to increase CPC (20 = +20%). |
| MAX_CPC_CAP | number | 5.0 | Hard cap on MaxCpc to prevent runaway bids. |
| DATE_RANGE | string | LAST_30_DAYS | GAQL date range to check for zero impressions. |
| MIN_CURRENT_CPC | number | 0.01 | Skip products with CPC below this threshold. |

## How It Works

1. Queries shopping_performance_view for products with zero impressions
2. Iterates through Shopping product groups matching the criteria
3. For each product: checks MaxCpc (skips null/auto-bid), applies boost, enforces cap
4. Sends an email report listing all boosted products with old and new CPC values

## Requirements

- Google Ads account with active Shopping campaigns using manual or enhanced CPC
- Script authorization for email

## Languages

- main_en.gs - English
- main_fr.gs - French

## License

MIT - Thibault Fayol Consulting
