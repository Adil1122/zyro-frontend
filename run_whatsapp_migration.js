const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Native .env.local loader to avoid external dependencies
function loadEnv() {
    try {
        if (fs.existsSync('.env.local')) {
            const envContent = fs.readFileSync('.env.local', 'utf8');
            envContent.split(/\r?\n/).forEach(line => {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
                    const parts = trimmed.split('=');
                    const key = parts[0].trim();
                    const value = parts.slice(1).join('=').trim();
                    process.env[key] = value;
                }
            });
            console.log('✓ Loaded environment variables from .env.local');
        } else {
            console.warn('.env.local file not found');
        }
    } catch (err) {
        console.error('Error loading .env.local:', err.message);
    }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    try {
        console.log('Starting WhatsApp columns migration...');
        
        // Read the migration SQL file
        const migrationSQL = fs.readFileSync('./setup_whatsapp_columns.sql', 'utf8');
        
        // Split the SQL into individual statements
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
        
        console.log('WhatsApp Migration completed!');
        
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
