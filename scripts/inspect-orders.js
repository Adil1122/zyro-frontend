
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectOrders() {
    try {
        const { data, error } = await supabase.from('orders').select('*').limit(1);
        if (data && data.length > 0) {
            console.log('Orders Columns:', Object.keys(data[0]));
            console.log('Sample Order:', data[0]);
        } else {
            console.log('No orders found');
        }
    } catch (err) {
        console.error(err.message);
    }
}

inspectOrders();
