
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSpecific() {
    try {
        const ids = [24, 22, 23, 21, 13, 12];
        for (const id of ids) {
            const { data, error } = await supabase.from('customers').select('*').eq('id', id);
            console.log(`ID ${id}:`, data, error?.message || 'No error');
        }
    } catch (err) {
        console.error(err.message);
    }
}

testSpecific();
