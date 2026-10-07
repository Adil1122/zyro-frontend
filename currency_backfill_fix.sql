-- Corrects orders wrongly stamped as already converted.
--
-- The first version of currency_conversion_migration.sql set
--   total_amount_base = total_amount, fx_rate = 1, base_currency = 'PKR'
-- for every row with no base amount. For an order charged in another currency
-- that records, say, $699.95 as Rs 699.95 — and because the row then looks
-- converted, the recalculation pass skipped it.
--
-- Clearing the figure for those rows makes the recalculation pick them up.
-- Run this once, then recalculate from Settings - Connected Stores.

UPDATE orders
SET total_amount_base = NULL,
    fx_rate = NULL
WHERE fx_rate = 1
  AND currency IS NOT NULL
  AND UPPER(currency) <> UPPER(COALESCE(base_currency, 'PKR'));

SELECT
    UPPER(COALESCE(currency, 'PKR'))        AS currency,
    COUNT(*)                                AS orders,
    COUNT(total_amount_base)                AS converted,
    COUNT(*) - COUNT(total_amount_base)     AS awaiting_conversion
FROM orders
GROUP BY 1
ORDER BY 1;
