
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testProducts() {
    const cols = ['name', 'title', 'price', 'cost', 'stock', 'quantity', 'category_id', 'sku'];
    for (const c of cols) {
        const { error } = await supabase.from('products').select(c).limit(1);
        if (!error) console.log(`Column exists: ${c}`);
    }
}
testProducts();
