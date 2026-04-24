
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function deepInvestigation() {
    try {
        console.log('Testing plural join...');
        const { data: plural } = await supabase.from('orders').select('*, customers(*)').limit(5);
        console.log('Plural Result (customers):', plural?.map(o => ({ id: o.id, c: o.customers })));

        console.log('Testing singular join...');
        const { data: singular } = await supabase.from('orders').select('*, customer(*)').limit(5);
        console.log('Singular Result (customer):', singular?.map(o => ({ id: o.id, c: o.customer })));

        // Check if there is a 'user' join?
        const { data: userJoin } = await supabase.from('orders').select('*, users(*)').limit(5);
        console.log('User Result (users):', userJoin?.map(o => ({ id: o.id, c: o.users })));

    } catch (err) {
        console.error(err.message);
    }
}
deepInvestigation();
