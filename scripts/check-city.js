
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
    try {
        const { data, error } = await supabase.from('customers').select('*').limit(0);
        console.log('Columns:', error ? error.message : 'No error');
        // Try to get columns from a specific RPC if possible
        const { data: cols } = await supabase.rpc('get_columns', { table_name: 'customers' });
        console.log('Columns RPC:', cols);
    } catch (err) {
        console.error(err.message);
    }
}
checkColumns();
