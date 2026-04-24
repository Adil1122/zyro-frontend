
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSingleCustomer() {
    try {
        const { data, error } = await supabase.from('customers').select('name').eq('id', 17);
        console.log('Single Customer Check (ID 17):', data);
        if (error) console.error('Error:', error.message);
    } catch (err) {
        console.error(err.message);
    }
}

checkSingleCustomer();
