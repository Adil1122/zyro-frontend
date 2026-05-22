import { NextResponse } from 'next/server';
import { getPostExOrders, isPostExConfigured } from '@/lib/services/postexService';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Get user's PostEx API key
        const { data: user } = await supabase
            .from('users')
            .select('postex_api_key')
            .eq('id', userId)
            .single();

        const apiKey = user?.postex_api_key;

        if (!isPostExConfigured(apiKey)) {
            return NextResponse.json({
                error: 'PostEx API Key not configured',
            }, { status: 400 });
        }

        // Fetch all orders without pagination
        const result = await getPostExOrders({ apiKey, page: 1, perPage: 10000, status: 'any' });
        
        if (!result.configured || result.error) {
            return NextResponse.json({
                error: result.error || 'Failed to fetch PostEx orders',
            }, { status: 500 });
        }

        const orders = result.orders || [];
        let syncedOrders = 0;
        let syncedCustomers = 0;
        let syncedProducts = 0;
        let errors = [];

        console.log(`[PostEx Sync] Processing ${orders.length} orders`);

        for (const order of orders) {
            try {
                // 1. Sync or create customer
                let customerId = null;
                const { data: existingCustomer } = await supabase
                    .from('customers')
                    .select('id')
                    .eq('email', order.customerEmail)
                    .eq('user_id', userId)
                    .single();

                if (existingCustomer) {
                    customerId = existingCustomer.id;
                } else {
                    const customerData = {
                        name: order.customerName,
                        email: order.customerEmail,
                        contact: order.customerPhone,
                        city: order.city,
                        user_id: userId,
                        created_at: new Date().toISOString()
                    };

                    const { data: newCustomer, error: customerError } = await supabase
                        .from('customers')
                        .insert(customerData)
                        .select('id')
                        .single();

                    if (customerError) {
                        errors.push(`Failed to create customer for order ${order.id}: ${customerError.message}`);
                        continue;
                    }

                    customerId = newCustomer.id;
                    syncedCustomers++;
                }

                // 2. Sync products from order items
                const productIds = [];
                for (const item of order.items || []) {
                    const { data: existingProduct } = await supabase
                        .from('products')
                        .select('id')
                        .eq('name', item.name)
                        .eq('user_id', userId)
                        .single();

                    if (existingProduct) {
                        productIds.push(existingProduct.id);
                    } else {
                        const productData = {
                            name: item.name,
                            price: item.price,
                            user_id: userId,
                            created_at: new Date().toISOString()
                        };

                        const { data: newProduct, error: productError } = await supabase
                            .from('products')
                            .insert(productData)
                            .select('id')
                            .single();

                        if (productError) {
                            errors.push(`Failed to create product "${item.name}" for order ${order.id}: ${productError.message}`);
                            continue;
                        }

                        productIds.push(newProduct.id);
                        syncedProducts++;
                    }
                }

                // 3. Check if order already exists
                const { data: existingOrder } = await supabase
                    .from('orders')
                    .select('id')
                    .eq('order_id', order.id)
                    .eq('user_id', userId)
                    .single();

                if (!existingOrder) {
                    // 4. Create order
                    const orderData = {
                        order_id: order.id,
                        customer_id: customerId,
                        total_amount: order.total,
                        status: order.status,
                        created_at: order.date || new Date().toISOString(),
                        user_id: userId
                    };

                    const { data: newOrder, error: orderError } = await supabase
                        .from('orders')
                        .insert(orderData)
                        .select('id')
                        .single();

                    if (orderError) {
                        errors.push(`Failed to create order ${order.id}: ${orderError.message}`);
                        continue;
                    }

                    // 5. Create order items
                    for (let i = 0; i < order.items.length; i++) {
                        const item = order.items[i];
                        const orderItemData = {
                            order_id: newOrder.id,
                            product_id: productIds[i],
                            quantity: item.quantity,
                            price: item.price
                        };

                        const { error: orderItemError } = await supabase
                            .from('order_items')
                            .insert(orderItemData);

                        if (orderItemError) {
                            errors.push(`Failed to create order item for order ${order.id}: ${orderItemError.message}`);
                        }
                    }

                    syncedOrders++;
                }

            } catch (orderError) {
                errors.push(`Error processing order ${order.id}: ${orderError.message}`);
            }
        }

        // 6. Update or create PostEx courier entry
        try {
            const { data: existingCourier } = await supabase
                .from('couriers')
                .select('id')
                .eq('name', 'PostEx')
                .eq('user_id', userId)
                .single();

            if (!existingCourier) {
                const courierData = {
                    name: 'PostEx',
                    status: 'active',
                    user_id: userId,
                    created_at: new Date().toISOString()
                };

                await supabase.from('couriers').insert(courierData);
            }
        } catch (courierError) {
            errors.push(`Failed to update PostEx courier: ${courierError.message}`);
        }

        return NextResponse.json({
            success: true,
            syncedOrders,
            syncedCustomers,
            syncedProducts,
            totalOrders: orders.length,
            errors: errors.slice(0, 10), // Limit errors to prevent huge responses
            hasMoreErrors: errors.length > 10
        });

    } catch (error) {
        console.error('[PostEx Sync Error]', error.message);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
