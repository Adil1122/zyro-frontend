
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkAll() {
    const tables = ['products', 'inventory', 'inventory_logs', 'items', 'orders', 'customers', 'ads_campaign'];
    for (const t of tables) {
        const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
        if (error) {
            console.log(`Table ${t} error: ${error.message}`);
        } else {
            console.log(`Table ${t} count: ${count}`);
        }
    }
}
checkAll();
