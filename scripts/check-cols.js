const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase.from('products').insert({ id: 9999, name: 'Test' });
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Success');
        await supabase.from('products').delete().eq('id', 9999);
    }
}

check();
