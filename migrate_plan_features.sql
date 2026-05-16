-- Migration script to move features from JSON column to plan_features table

-- First, create the plan_features table
CREATE TABLE IF NOT EXISTS plan_features (
    id SERIAL PRIMARY KEY,
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    feature_name VARCHAR(255) NOT NULL,
    value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(plan_id, feature_name)
);

-- Enable RLS if needed (adjust based on your RLS setup)
-- ALTER TABLE plan_features ENABLE ROW LEVEL SECURITY;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_plan_features_plan_id ON plan_features(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_features_feature_name ON plan_features(feature_name);

-- Insert features from existing plans table (assuming features column contains JSON)
-- This is a sample migration - adjust based on your actual data structure

-- Example: If your features JSON looks like {"auto_order_confirmation": true, "connected_stores": "1"}
-- You would need to parse and insert each feature

-- For now, let's insert the hardcoded features from the frontend
-- This assumes you have plans with names like 'Starter', 'Growth', 'Professional'

-- Get all existing plans and insert features
DO $$
DECLARE
    plan_record RECORD;
    plan_id_val UUID;
BEGIN
    -- Clear any existing data in plan_features
    DELETE FROM plan_features;
    
    -- Insert features for each plan
    FOR plan_record IN SELECT id, LOWER(name) as plan_name FROM plans LOOP
        plan_id_val := plan_record.id;
        
        -- Auto order confirmation feature
        INSERT INTO plan_features (plan_id, feature_name, value) 
        VALUES (plan_id_val, 'auto_order_confirmation', 'true')
        ON CONFLICT (plan_id, feature_name) DO NOTHING;
        
        -- Courier booking automation feature
        IF plan_record.plan_name = 'starter' THEN
            INSERT INTO plan_features (plan_id, feature_name, value) 
            VALUES (plan_id_val, 'courier_booking_automation', 'self-serve')
            ON CONFLICT (plan_id, feature_name) DO NOTHING;
        ELSIF plan_record.plan_name = 'growth' THEN
            INSERT INTO plan_features (plan_id, feature_name, value) 
            VALUES (plan_id_val, 'courier_booking_automation', '+ team books on behalf')
            ON CONFLICT (plan_id, feature_name) DO NOTHING;
        ELSIF plan_record.plan_name = 'professional' OR plan_record.plan_name = 'pro' THEN
            INSERT INTO plan_features (plan_id, feature_name, value) 
            VALUES (plan_id_val, 'courier_booking_automation', 'true')
            ON CONFLICT (plan_id, feature_name) DO NOTHING;
        END IF;
        
        -- Connected stores feature
        IF plan_record.plan_name = 'starter' THEN
            INSERT INTO plan_features (plan_id, feature_name, value) 
            VALUES (plan_id_val, 'connected_stores', '1')
            ON CONFLICT (plan_id, feature_name) DO NOTHING;
        ELSIF plan_record.plan_name = 'growth' THEN
            INSERT INTO plan_features (plan_id, feature_name, value) 
            VALUES (plan_id_val, 'connected_stores', '3')
            ON CONFLICT (plan_id, feature_name) DO NOTHING;
        ELSIF plan_record.plan_name = 'professional' OR plan_record.plan_name = 'pro' THEN
            INSERT INTO plan_features (plan_id, feature_name, value) 
            VALUES (plan_id_val, 'connected_stores', 'Unlimited')
            ON CONFLICT (plan_id, feature_name) DO NOTHING;
        END IF;
        
        -- Order dashboard feature
        INSERT INTO plan_features (plan_id, feature_name, value) 
        VALUES (plan_id_val, 'order_dashboard', 'true')
        ON CONFLICT (plan_id, feature_name) DO NOTHING;
        
        -- WhatsApp AI Chatbot feature
        IF plan_record.plan_name IN ('growth', 'professional', 'pro') THEN
            INSERT INTO plan_features (plan_id, feature_name, value) 
            VALUES (plan_id_val, 'whatsapp_ai_chatbot', 'true')
            ON CONFLICT (plan_id, feature_name) DO NOTHING;
        ELSE
            INSERT INTO plan_features (plan_id, feature_name, value) 
            VALUES (plan_id_val, 'whatsapp_ai_chatbot', 'false')
            ON CONFLICT (plan_id, feature_name) DO NOTHING;
        END IF;
        
        -- Daily courier receipts feature
        IF plan_record.plan_name IN ('growth', 'professional', 'pro') THEN
            INSERT INTO plan_features (plan_id, feature_name, value) 
            VALUES (plan_id_val, 'daily_courier_receipts', 'true')
            ON CONFLICT (plan_id, feature_name) DO NOTHING;
        ELSE
            INSERT INTO plan_features (plan_id, feature_name, value) 
            VALUES (plan_id_val, 'daily_courier_receipts', 'false')
            ON CONFLICT (plan_id, feature_name) DO NOTHING;
        END IF;
        
        -- Inventory management feature
        IF plan_record.plan_name = 'professional' OR plan_record.plan_name = 'pro' THEN
            INSERT INTO plan_features (plan_id, feature_name, value) 
            VALUES (plan_id_val, 'inventory_management', 'true')
            ON CONFLICT (plan_id, feature_name) DO NOTHING;
        ELSE
            INSERT INTO plan_features (plan_id, feature_name, value) 
            VALUES (plan_id_val, 'inventory_management', 'false')
            ON CONFLICT (plan_id, feature_name) DO NOTHING;
        END IF;
        
        -- Sync products feature
        IF plan_record.plan_name = 'professional' OR plan_record.plan_name = 'pro' THEN
            INSERT INTO plan_features (plan_id, feature_name, value) 
            VALUES (plan_id_val, 'sync_products', 'true')
            ON CONFLICT (plan_id, feature_name) DO NOTHING;
        ELSE
            INSERT INTO plan_features (plan_id, feature_name, value) 
            VALUES (plan_id_val, 'sync_products', 'false')
            ON CONFLICT (plan_id, feature_name) DO NOTHING;
        END IF;
        
        -- Meta Ads stats feature
        IF plan_record.plan_name = 'professional' OR plan_record.plan_name = 'pro' THEN
            INSERT INTO plan_features (plan_id, feature_name, value) 
            VALUES (plan_id_val, 'meta_ads_stats', 'true')
            ON CONFLICT (plan_id, feature_name) DO NOTHING;
        ELSE
            INSERT INTO plan_features (plan_id, feature_name, value) 
            VALUES (plan_id_val, 'meta_ads_stats', 'false')
            ON CONFLICT (plan_id, feature_name) DO NOTHING;
        END IF;
        
        -- Google Ads stats feature
        IF plan_record.plan_name = 'professional' OR plan_record.plan_name = 'pro' THEN
            INSERT INTO plan_features (plan_id, feature_name, value) 
            VALUES (plan_id_val, 'google_ads_stats', 'true')
            ON CONFLICT (plan_id, feature_name) DO NOTHING;
        ELSE
            INSERT INTO plan_features (plan_id, feature_name, value) 
            VALUES (plan_id_val, 'google_ads_stats', 'false')
            ON CONFLICT (plan_id, feature_name) DO NOTHING;
        END IF;
        
        -- Dedicated account manager feature
        IF plan_record.plan_name = 'professional' OR plan_record.plan_name = 'pro' THEN
            INSERT INTO plan_features (plan_id, feature_name, value) 
            VALUES (plan_id_val, 'dedicated_account_manager', 'true')
            ON CONFLICT (plan_id, feature_name) DO NOTHING;
        ELSE
            INSERT INTO plan_features (plan_id, feature_name, value) 
            VALUES (plan_id_val, 'dedicated_account_manager', 'false')
            ON CONFLICT (plan_id, feature_name) DO NOTHING;
        END IF;
        
    END LOOP;
END $$;

-- After migration, you can safely remove the features column from plans table
-- Uncomment the following line after verifying the migration worked correctly:
-- ALTER TABLE plans DROP COLUMN IF EXISTS features;

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_plan_features_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at
CREATE TRIGGER plan_features_updated_at
    BEFORE UPDATE ON plan_features
    FOR EACH ROW
    EXECUTE FUNCTION update_plan_features_updated_at();

COMMIT;
