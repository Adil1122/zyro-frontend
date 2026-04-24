
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function seed() {
    const { data: customers } = await supabase.from('customers').select('id, name, city').limit(5);
    console.log('Customers:', customers);

    const { data: orders } = await supabase.from('orders').select('id, order_id, customer_id').limit(5);
    console.log('Orders:', orders);
}
seed();
