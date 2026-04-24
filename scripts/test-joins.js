
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testJoins() {
    try {
        console.log('Testing explicit join...');
        // If there is no FK, we might need to specify the column
        const { data, error } = await supabase
            .from('orders')
            .select('order_id, customer_id, customers!customer_id(name)') // Join using specific column
            .limit(1);

        console.log('Explicit Join Result:', data);
        if (error) console.error('Explicit Join Error:', error.message);

        console.log('Testing normal join...');
        const { data: data2, error: error2 } = await supabase
            .from('orders')
            .select('order_id, customers(name)')
            .limit(1);
        console.log('Normal Join Result:', data2);

    } catch (err) {
        console.error(err.message);
    }
}

testJoins();
