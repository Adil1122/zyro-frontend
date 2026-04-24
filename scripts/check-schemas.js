
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchemas() {
    try {
        const { data, error } = await supabase.rpc('get_schemas'); // Often not allowed
        console.log('Schemas:', data);

        // Try another way: check if customers exists in any common schema
        // This is hard with anon key.

    } catch (err) {
        console.error(err.message);
    }
}
// checkSchemas();

async function checkCommonSchemas() {
    for (const schema of ['auth', 'storage', 'public']) {
        const { data, error } = await supabase.from('customers').select('count', { schema }).limit(0);
        console.log(`Schema ${schema} customers error:`, error?.message);
    }
}
checkCommonSchemas();
