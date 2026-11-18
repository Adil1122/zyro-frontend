-- Clears the fabricated WhatsApp connection data.
--
-- Before the authorization fix, opening the Meta popup and closing it was enough
-- to write a "connected" record using hardcoded placeholders:
--   phone_number_id 1462001326987017, waba_id 1683429933404101,
--   display "+1 (555) 167-0097", verified_name "Dayemens Business Portfolio".
-- None of it was ever authorized, and 555 is a fictional US prefix.
--
-- Those rows also wrote users.wa_is_active = true and users.wa_phone_number_id,
-- which a now-removed fallback read as proof of a live connection — so the
-- dashboard kept showing Connected even after finalization failed.
--
-- Run after deploying the fix. Message history, templates, customers and
-- conversations are untouched.

-- 1. See what is about to be cleared.
SELECT id, user_id, phone_number_id, waba_id, display_phone_number, connection_status
  FROM whatsapp_connections
 WHERE phone_number_id = '1462001326987017'
    OR waba_id = '1683429933404101'
    OR display_phone_number LIKE '%555%167%0097%';

-- 2. Remove the fabricated connection rows.
DELETE FROM whatsapp_connections
 WHERE phone_number_id = '1462001326987017'
    OR waba_id = '1683429933404101'
    OR display_phone_number LIKE '%555%167%0097%';

-- 3. Clear the mirrored columns on users for the same placeholders. The token
--    column is included because anything stored against a fake connection is
--    not a usable credential.
UPDATE users
   SET wa_is_active = false,
       wa_phone_number_id = NULL,
       wa_waba_id = NULL,
       wa_merchant_phone = NULL
 WHERE wa_phone_number_id = '1462001326987017'
    OR wa_waba_id = '1683429933404101'
    OR wa_merchant_phone LIKE '%555%167%0097%';

-- 4. Any user still marked active without a verified connection row is stale:
--    only whatsapp_connections proves a real connection now.
UPDATE users u
   SET wa_is_active = false
 WHERE u.wa_is_active = true
   AND NOT EXISTS (
       SELECT 1 FROM whatsapp_connections c
        WHERE c.user_id = u.id AND c.connection_status = 'connected'
   );

-- 5. Confirm.
SELECT 'connections remaining' AS check, COUNT(*) AS n FROM whatsapp_connections
UNION ALL
SELECT 'connected connections', COUNT(*) FROM whatsapp_connections WHERE connection_status = 'connected'
UNION ALL
SELECT 'users marked wa_is_active', COUNT(*) FROM users WHERE wa_is_active = true;
