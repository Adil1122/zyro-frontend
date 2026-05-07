import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

async function testConnection() {
    try {
        console.log('Testing database connection...');
        
        // Test users table
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, email')
            .limit(1);
        
        console.log('Users table:', usersError ? 'Error' : 'OK', usersError || users);
        
        // Test customers table
        const { data: customers, error: customersError } = await supabase
            .from('customers')
            .select('id')
            .limit(1);
        
        console.log('Customers table:', customersError ? 'Error' : 'OK', customersError || customers);
        
        // Test products table
        const { data: products, error: productsError } = await supabase
            .from('products')
            .select('id')
            .limit(1);
        
        console.log('Products table:', productsError ? 'Error' : 'OK', productsError || products);
        
        // Test order_items table
        const { data: orderItems, error: orderItemsError } = await supabase
            .from('order_items')
            .select('id')
            .limit(1);
        
        console.log('Order_items table:', orderItemsError ? 'Error' : 'OK', orderItemsError || orderItems);
        
        // Test orders table
        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('id')
            .limit(1);
        
        console.log('Orders table:', ordersError ? 'Error' : 'OK', ordersError || orders);
        
    } catch (error) {
        console.error('Connection test failed:', error);
    }
}

testConnection();
