
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInnerJoin() {
    try {
        console.log('Testing inner join...');
        const { data, error, count } = await supabase
            .from('orders')
            .select('*, customers!inner(name)', { count: 'exact' });

        console.log('Inner Join Result Count:', data?.length || 0);
        if (error) console.error('Inner Join Error:', error.message);
    } catch (err) {
        console.error(err.message);
    }
}

testInnerJoin();
