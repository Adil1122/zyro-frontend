
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStructure() {
    try {
        const { data, error } = await supabase.from('orders').select('*, customers(*)').limit(1);
        if (data && data.length > 0) {
            console.log('Is array?', Array.isArray(data[0].customers));
            console.log('Raw customers field:', data[0].customers);
        }
    } catch (err) {
        console.error(err.message);
    }
}
checkStructure();
