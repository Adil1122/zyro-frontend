
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function trialAndError() {
    try {
        const tests = [
            '*, customers(name, city)',
            '*, customer(name, city)',
            '*, customer_id(name, city)',
            '*, customers!customer_id(name, city)',
            '*, customer:customer_id(name, city)'
        ];

        for (const t of tests) {
            const { data, error } = await supabase.from('orders').select(t).limit(1);
            if (error) {
                console.log(`Test [${t}] Error: ${error.message}`);
            } else {
                console.log(`Test [${t}] Success:`, data[0]);
            }
        }
    } catch (err) {
        console.error(err.message);
    }
}
trialAndError();
