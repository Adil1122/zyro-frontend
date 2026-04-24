
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectTables() {
    try {
        console.log('--- PRODUCTS ---');
        const { data: products } = await supabase.from('products').select('*').limit(3);
        console.log(products);

        console.log('\n--- ADS CAMPAIGNS ---');
        const { data: ads } = await supabase.from('ads_campaign').select('*').limit(3);
        console.log(ads);

    } catch (err) {
        console.error(err.message);
    }
}
inspectTables();
