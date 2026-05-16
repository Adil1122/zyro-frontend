const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    try {
        console.log('Starting plan features migration...');
        
        // Read the migration SQL file
        const migrationSQL = fs.readFileSync('./migrate_plan_features.sql', 'utf8');
        
        // Split the SQL into individual statements (basic approach)
        const statements = migrationSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt && !stmt.startsWith('--'));
        
        console.log(`Found ${statements.length} SQL statements to execute`);
        
        // Execute each statement
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            console.log(`Executing statement ${i + 1}/${statements.length}...`);
            
            try {
                const { error } = await supabase.rpc('exec_sql', { sql_statement: statement });
                
                if (error) {
                    console.error(`Error executing statement ${i + 1}:`, error);
                    console.log('Statement:', statement);
                } else {
                    console.log(`✓ Statement ${i + 1} executed successfully`);
                }
            } catch (err) {
                console.error(`Error executing statement ${i + 1}:`, err);
                console.log('Statement:', statement);
            }
        }
        
        console.log('Migration completed!');
        
        // Verify the migration worked
        console.log('Verifying migration...');
        const { data: planFeatures, error: verificationError } = await supabase
            .from('plan_features')
            .select('*')
            .limit(5);
            
        if (verificationError) {
            console.error('Error verifying migration:', verificationError);
        } else {
            console.log('✓ Migration verification successful');
            console.log('Sample plan_features data:', planFeatures);
        }
        
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

// Alternative approach using direct SQL execution
async function runMigrationDirect() {
    try {
        console.log('Starting plan features migration (direct approach)...');
        
        // Create plan_features table
        const { error: createError } = await supabase
            .from('plan_features')
            .select('*')
            .limit(1);
            
        if (createError && createError.code === 'PGRST116') {
            // Table doesn't exist, we need to create it via SQL
            console.log('Creating plan_features table...');
            // Note: You'll need to run the SQL manually or via admin panel
            console.log('Please run migrate_plan_features.sql manually in your Supabase SQL editor');
        } else {
            console.log('plan_features table already exists');
        }
        
        // Get existing plans
        const { data: plans, error: plansError } = await supabase
            .from('plans')
            .select('*');
            
        if (plansError) {
            console.error('Error fetching plans:', plansError);
            return;
        }
        
        console.log(`Found ${plans.length} plans`);
        
        // Insert features for each plan
        for (const plan of plans) {
            const planName = plan.name.toLowerCase();
            console.log(`Processing plan: ${plan.name}`);
            
            const features = [
                { name: 'auto_order_confirmation', value: 'true' },
                { name: 'order_dashboard', value: 'true' },
                { name: 'whatsapp_ai_chatbot', value: planName.includes('growth') || planName.includes('professional') || planName.includes('pro') ? 'true' : 'false' },
                { name: 'daily_courier_receipts', value: planName.includes('growth') || planName.includes('professional') || planName.includes('pro') ? 'true' : 'false' },
                { name: 'inventory_management', value: planName.includes('professional') || planName.includes('pro') ? 'true' : 'false' },
                { name: 'sync_products', value: planName.includes('professional') || planName.includes('pro') ? 'true' : 'false' },
                { name: 'meta_ads_stats', value: planName.includes('professional') || planName.includes('pro') ? 'true' : 'false' },
                { name: 'google_ads_stats', value: planName.includes('professional') || planName.includes('pro') ? 'true' : 'false' },
                { name: 'dedicated_account_manager', value: planName.includes('professional') || planName.includes('pro') ? 'true' : 'false' },
                { name: 'courier_booking_automation', value: planName === 'starter' ? 'self-serve' : planName === 'growth' ? '+ team books on behalf' : 'true' },
                { name: 'connected_stores', value: planName === 'starter' ? '1' : planName === 'growth' ? '3' : 'Unlimited' }
            ];
            
            for (const feature of features) {
                const { error: insertError } = await supabase
                    .from('plan_features')
                    .upsert({
                        plan_id: plan.id,
                        feature_name: feature.name,
                        value: feature.value
                    }, {
                        onConflict: 'plan_id,feature_name'
                    });
                    
                if (insertError) {
                    console.error(`Error inserting feature ${feature.name} for plan ${plan.name}:`, insertError);
                }
            }
        }
        
        console.log('Migration completed successfully!');
        
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

// Run the direct migration approach
runMigrationDirect();
