
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSchema() {
    try {
        // Check columns by fetching one row if possible
        const { data, error } = await supabase.from('customers').select('*').limit(1);
        console.log('Customers Column names:', data && data.length > 0 ? Object.keys(data[0]) : 'No data to show columns');

        // Alternative: use rpc if available (unlikely)
        // Check if there is ANY data in orders that has a matching customer in customers
        const { data: matched, error: matchErr } = await supabase.rpc('get_table_columns', { table_name: 'customers' });
        console.log('Matched:', matched);

    } catch (err) {
        console.error(err.message);
    }
}

inspectSchema();
