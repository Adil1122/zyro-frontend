const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    const { data, error } = await supabase.from('products').select('*').limit(1);
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Products:', JSON.stringify(data, null, 2));
    }
}

test();
