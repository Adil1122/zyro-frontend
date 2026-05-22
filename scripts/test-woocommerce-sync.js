const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
    const envFileContent = fs.readFileSync(envPath, 'utf8');
    envFileContent.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
            const key = match[1];
            let value = match[2] || '';
            if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
            if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
            process.env[key] = value;
        }
    });
}

const WooCommerceRestApi = require('@woocommerce/woocommerce-rest-api').default;
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testSync() {
    try {
        // Get user credentials (let's use the user ID from the product we saw: e5940095-1560-4425-ab60-f8fc5f7874f4)
        const userId = 'e5940095-1560-4425-ab60-f8fc5f7874f4';
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('wc_store_url, wc_consumer_key, wc_consumer_secret')
            .eq('id', userId)
            .single();

        if (userError || !user) {
            console.error('User not found:', userError);
            return;
        }

        console.log('User WooCommerce Credentials:', {
            url: user.wc_store_url,
            key: user.wc_consumer_key ? 'Set' : 'Not Set',
            secret: user.wc_consumer_secret ? 'Set' : 'Not Set'
        });

        const api = new WooCommerceRestApi({
            url: user.wc_store_url,
            consumerKey: user.wc_consumer_key,
            consumerSecret: user.wc_consumer_secret,
            version: 'wc/v3',
            queryStringAuth: true
        });

        console.log('Fetching products from WooCommerce...');
        const response = await api.get('products', { per_page: 10 });
        console.log(`Fetched ${response.data.length} products from WooCommerce.`);

        console.log('\nSample WooCommerce product from API:');
        if (response.data.length > 0) {
            const p = response.data[0];
            console.log({
                id: p.id,
                name: p.name,
                sku: p.sku,
                stock_status: p.stock_status,
                price: p.price
            });
        }

        console.log('\nTrying to upsert products to Supabase...');
        for (const product of response.data) {
            const productData = {
                user_id: userId,
                name: product.name,
                sku: product.sku || '',
                price: parseFloat(product.price || 0),
                stock: product.stock_quantity || 0,
                category: (product.categories || []).map(cat => cat.name).join(', ') || 'Uncategorized',
                status: product.stock_status === 'instock' ? 'active' : 'inactive'
            };

            const { data, error } = await supabase
                .from('products')
                .upsert(productData, { 
                    onConflict: 'sku', 
                    ignoreDuplicates: false 
                })
                .select();

            if (error) {
                console.error(`Error upserting product ${product.name}:`, error);
            } else {
                console.log(`Upserted product ${product.name}, result ID:`, data?.[0]?.id, 'SKU:', data?.[0]?.sku);
            }
        }

    } catch (err) {
        console.error('Error in testSync:', err);
    }
}

testSync();
