-- Register every platform_id the application actually writes.
--
-- orders.platform_id is a foreign key into external_platforms, which held only
-- ids 1, 2 and 3. The code writes 6 for Shopify, 5 for Daraz and 4/7/9 for
-- couriers, so each of those inserts failed with
--   violates foreign key constraint "orders_platform_id_fkey"
-- and the order was never stored. Shopify and Daraz could report a connected
-- store while being structurally incapable of saving an order.
--
-- The table's labels for 2 and 3 also contradicted the code: it called them
-- Shopify and Daraz, while the application writes 2 for PostEx and 3 for TCS.
-- Existing rows keep their ids, so no order changes meaning; only the labels are
-- corrected. Nothing in the codebase reads these names — the FK is the only
-- consumer — so renaming is safe.

INSERT INTO external_platforms (id, name) VALUES
    (4, 'Leopards'),
    (5, 'Daraz'),
    (6, 'Shopify'),
    (7, 'Trax / M&P'),
    (9, 'DHL')
ON CONFLICT (id) DO NOTHING;

UPDATE external_platforms SET name = 'PostEx' WHERE id = 2 AND name = 'Shopify';
UPDATE external_platforms SET name = 'TCS'    WHERE id = 3 AND name = 'Daraz';

-- Explicit ids were inserted, so move any identity sequence past them or the
-- next generated id would collide.
DO $$
DECLARE
    seq text;
BEGIN
    seq := pg_get_serial_sequence('external_platforms', 'id');
    IF seq IS NOT NULL THEN
        PERFORM setval(seq, GREATEST((SELECT MAX(id) FROM external_platforms), 1));
    END IF;
END $$;

SELECT id, name FROM external_platforms ORDER BY id;
