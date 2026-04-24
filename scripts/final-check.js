
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    try {
        const { data: customers, error: err1 } = await supabase.from('customers').select('*').limit(5);
        console.log('Customers Sample:', customers);

        const { data: orders, error: err2 } = await supabase.from('orders').select('customer_id').limit(5);
        console.log('Orders Customer IDs:', orders?.map(o => o.customer_id));

        const { data: joint, error: err3 } = await supabase.from('orders').select('*, customers(*)').limit(1);
        console.log('Join Sample:', joint);

    } catch (err) {
        console.error(err.message);
    }
}

checkData();
