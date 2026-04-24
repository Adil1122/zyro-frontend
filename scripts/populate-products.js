const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function populate() {
    const products = [
        { id: 231, name: 'Premium Cotton Kurta', sku: 'K-001', stock_quantity: 45, price: 2500, category: 'Apparel' },
        { id: 2179, name: 'Designer Shalwar', sku: 'S-2179', stock_quantity: 8, price: 3550, category: 'Apparel' },
        { id: 2181, name: 'Festive Dupatta', sku: 'D-2181', stock_quantity: 0, price: 1200, category: 'Accessories' },
        { id: 101, name: 'Silk Waistcoat', sku: 'W-101', stock_quantity: 15, price: 4500, category: 'Apparel' },
        { id: 102, name: 'Embroidered Jutti', sku: 'J-102', stock_quantity: 25, price: 1800, category: 'Footwear' }
    ];

    const { data, error } = await supabase.from('products').insert(products);
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Inserted products:', data);
    }
}

populate();
