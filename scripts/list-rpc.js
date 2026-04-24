
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listRPC() {
    try {
        const { data, error } = await supabase.from('pg_proc').select('proname');
        console.log('Functions:', data);
    } catch (err) {
        console.error(err.message);
    }
}
listRPC();
