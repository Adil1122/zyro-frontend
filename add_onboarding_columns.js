const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load environment variables from .env.local manually
try {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    envContent.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const index = trimmed.indexOf('=');
            if (index !== -1) {
                const key = trimmed.substring(0, index).trim();
                let val = trimmed.substring(index + 1).trim();
                // Strip optional surrounding quotes
                if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                    val = val.substring(1, val.length - 1);
                }
                process.env[key] = val;
            }
        }
    });
} catch (err) {
    console.error('Failed to read .env.local file:', err.message);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addOnboardingColumns() {
    try {
        console.log('Checking and adding onboarding-related columns to users table...');
        
        const sqlStatements = [
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS business_type text;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_orders text;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_step integer DEFAULT 1;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS connected_source text;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS connected_courier text;"
        ];
        
        for (const sql of sqlStatements) {
            console.log(`Executing: ${sql}`);
            const { error } = await supabase.rpc('exec_sql', { sql_statement: sql });
            if (error) {
                console.error('Error executing SQL via RPC:', error);
            } else {
                console.log('✓ SQL statement executed successfully!');
            }
        }
        
        console.log('Done!');
    } catch (err) {
        console.error('Failed to execute onboarding script:', err);
    }
}

addOnboardingColumns();
