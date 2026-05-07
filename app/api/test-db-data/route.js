import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized: Missing User ID' }, { status: 401 });
    }

    try {
        console.log('=== ANALYZING DATABASE STRUCTURE ===');
        
        // Test basic connectivity
        const { data: testConnection, error: connectionError } = await supabase
            .from('users')
            .select('id')
            .limit(1);
        
        if (connectionError) {
            return NextResponse.json({ 
                error: 'Database connection failed',
                details: connectionError 
            }, { status: 500 });
        }

        console.log('✅ Database connected');

        // Get table counts first
        const results = {};

        // Customers analysis
        const { data: customers, error: customersError } = await supabase
            .from('customers')
            .select('*')
            .eq('user_id', userId);
        
        results.customers = {
            count: customers?.length || 0,
            error: customersError,
            sample: customers?.slice(0, 2),
            columns: customers?.[0] ? Object.keys(customers[0]) : []
        };

        // Products analysis  
        const { data: products, error: productsError } = await supabase
            .from('products')
            .select('*')
            .eq('user_id', userId);
        
        results.products = {
            count: products?.length || 0,
            error: productsError,
            sample: products?.slice(0, 2),
            columns: products?.[0] ? Object.keys(products[0]) : []
        };

        // Orders analysis
        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('*')
            .eq('user_id', userId);
        
        results.orders = {
            count: orders?.length || 0,
            error: ordersError,
            sample: orders?.slice(0, 2),
            columns: orders?.[0] ? Object.keys(orders[0]) : []
        };

        // Order items analysis
        const { data: orderItems, error: orderItemsError } = await supabase
            .from('order_items')
            .select('*');
        
        results.orderItems = {
            count: orderItems?.length || 0,
            error: orderItemsError,
            sample: orderItems?.slice(0, 3),
            columns: orderItems?.[0] ? Object.keys(orderItems[0]) : []
        };

        console.log('=== ANALYSIS RESULTS ===');
        console.log('Customers:', results.customers.count, 'records');
        console.log('Products:', results.products.count, 'records');  
        console.log('Orders:', results.orders.count, 'records');
        console.log('Order Items:', results.orderItems.count, 'records');

        return NextResponse.json({
            success: true,
            userId,
            analysis: results,
            summary: {
                totalRecords: results.customers.count + results.products.count + results.orders.count + results.orderItems.count,
                tablesWithData: [
                    results.customers.count > 0 ? 'customers' : null,
                    results.products.count > 0 ? 'products' : null,
                    results.orders.count > 0 ? 'orders' : null,
                    results.orderItems.count > 0 ? 'order_items' : null
                ].filter(Boolean)
            }
        });

    } catch (error) {
        console.error('Test data fetch error:', error);
        return NextResponse.json({ 
            error: 'Failed to fetch test data',
            details: error.message 
        }, { status: 500 });
    }
}
