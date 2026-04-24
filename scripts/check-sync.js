
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSync() {
    try {
        const { count, error } = await supabase.from('orders').select('*', { count: 'exact', head: true });
        console.log('Total Orders known to my client:', count);

        const { data } = await supabase.from('orders').select('id, order_id').order('id', { ascending: false }).limit(5);
        console.log('Latest Orders known to my client:', data);

    } catch (err) {
        console.error(err.message);
    }
}

checkSync();
