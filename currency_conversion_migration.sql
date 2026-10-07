-- Multi-currency support.
--
-- A Shopify store can sell in any currency. Until now every amount was treated
-- as PKR, so a USD order was labelled "Rs 699.95" and added straight into a PKR
-- total — wrong symbol, and a meaningless sum once currencies mixed.
--
-- The order keeps its original amount and currency. The converted figure is
-- stored alongside it with the rate used, so reported history stays fixed.
-- Converting at display time would mean recomputing with today's rate and last
-- month's revenue changing every morning.

ALTER TABLE users ADD COLUMN IF NOT EXISTS base_currency TEXT NOT NULL DEFAULT 'PKR';

ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_amount_base NUMERIC(14,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fx_rate NUMERIC(18,8);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS base_currency TEXT;

-- Only orders actually charged in PKR can be stamped as already converted.
-- Anything in another currency is left null so the recalculation pass converts
-- it properly; claiming rate 1 would record a USD order as the same number of
-- rupees.
UPDATE orders
SET total_amount_base = total_amount,
    fx_rate = 1,
    base_currency = 'PKR'
WHERE total_amount_base IS NULL
  AND COALESCE(UPPER(currency), 'PKR') = 'PKR';

-- Daily rates, cached so a sync never depends on the FX service being reachable
-- and so a historical order is converted at the rate for its own date.
CREATE TABLE IF NOT EXISTS fx_rates (
    base_currency  TEXT        NOT NULL,
    quote_currency TEXT        NOT NULL,
    rate           NUMERIC(18,8) NOT NULL CHECK (rate > 0),
    rate_date      DATE        NOT NULL,
    source         TEXT        NOT NULL DEFAULT 'open.er-api.com',
    fetched_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (base_currency, quote_currency, rate_date)
);

CREATE INDEX IF NOT EXISTS fx_rates_lookup_idx
    ON fx_rates (base_currency, quote_currency, rate_date DESC);
