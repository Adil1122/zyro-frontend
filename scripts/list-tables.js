
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listAllTables() {
    try {
        // Query pg_catalog for all tables in common schemas
        const { data, error } = await supabase.from('information_schema.tables').select('table_name, table_schema');
        console.log('All Tables:', data);
        if (error) {
            console.log('Permission denied on information_schema. Trying alternative...');
            // Try common names
            const tables = ['orders', 'customers', 'customer', 'user', 'users', 'profile', 'profiles', 'orders_items'];
            for (const t of tables) {
                const { data: d, error: e } = await supabase.from(t).select('count', { count: 'exact' }).limit(0);
                if (!e) console.log(`Table exists: ${t}`);
            }
        }
    } catch (err) {
        console.error(err.message);
    }
}

listAllTables();
