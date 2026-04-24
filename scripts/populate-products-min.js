const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function populate() {
    const products = [
        { id: 231, name: 'Premium Cotton Kurta', stock: 45, price: 2500 },
        { id: 2179, name: 'Designer Shalwar', stock: 8, price: 3550 },
        { id: 2181, name: 'Festive Dupatta', stock: 0, price: 1200 }
    ];

    console.log('Inserting products into public.products...');
    const { data, error } = await supabase.from('products').insert(products);
    if (error) {
        console.error('Error Details:', JSON.stringify(error, null, 2));
    } else {
        console.log('Inserted products successfully.');
    }
}

populate();
