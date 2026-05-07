const { supabase } = require('./lib/supabase');

async function testDatabaseData() {
    try {
        console.log('Testing database data...');
        
        const userId = '1';
        
        // Test customers
        const { data: customers, error: customersError } = await supabase
            .from('customers')
            .select('*')
            .eq('user_id', userId)
            .limit(3);
        
        console.log('=== CUSTOMERS ===');
        console.log('Error:', customersError);
        console.log('Count:', customers?.length || 0);
        console.log('Sample:', customers?.[0]);
        
        // Test products
        const { data: products, error: productsError } = await supabase
            .from('products')
            .select('*')
            .eq('user_id', userId)
            .limit(3);
        
        console.log('\n=== PRODUCTS ===');
        console.log('Error:', productsError);
        console.log('Count:', products?.length || 0);
        console.log('Sample:', products?.[0]);
        
        // Test orders
        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('*')
            .eq('user_id', userId)
            .limit(3);
        
        console.log('\n=== ORDERS ===');
        console.log('Error:', ordersError);
        console.log('Count:', orders?.length || 0);
        console.log('Sample:', orders?.[0]);
        
        // Test order items
        const { data: orderItems, error: orderItemsError } = await supabase
            .from('order_items')
            .select('*')
            .limit(5);
        
        console.log('\n=== ORDER ITEMS ===');
        console.log('Error:', orderItemsError);
        console.log('Count:', orderItems?.length || 0);
        console.log('Sample:', orderItems?.[0]);
        
    } catch (error) {
        console.error('Test error:', error);
    }
}

testDatabaseData();
