
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTypes() {
    try {
        console.log('Checking orders table columns...');
        const { data: cols1 } = await supabase.from('orders').select('*').limit(1);
        if (cols1 && cols1.length > 0) {
            console.log('Order customer_id type:', typeof cols1[0].customer_id);
        }

        console.log('Checking customers table columns...');
        // Try to find ANY record in customers
        const { data: cols2 } = await supabase.from('customers').select('*').limit(10);
        console.log('Customers found:', cols2.length);
        if (cols2 && cols2.length > 0) {
            console.log('Customer id type:', typeof cols2[0].id);
        }

    } catch (err) {
        console.error(err.message);
    }
}
checkTypes();
