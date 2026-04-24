
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCount() {
    try {
        const { count, error } = await supabase.from('customers').select('*', { count: 'exact', head: true });
        console.log('Customers Count:', count, 'Error:', error?.message || 'None');
    } catch (err) {
        console.error(err.message);
    }
}

checkCount();
