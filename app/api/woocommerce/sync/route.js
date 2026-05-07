import { NextResponse } from 'next/server';
import { 
    getWooCommerceOrders, 
    getWooCommerceCustomers, 
    getWooCommerceProducts,
    isWooCommerceConfigured 
} from '@/lib/services/woocommerceService';
import { supabase } from '@/lib/supabase';


export async function POST(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized: Missing User ID' }, { status: 401 });
    }

    try {
        // Fetch user's WooCommerce credentials
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('wc_store_url, wc_consumer_key, wc_consumer_secret')
            .eq('id', userId)
            .single();

        if (userError || !user) {
            return NextResponse.json({ error: 'User not found or database error' }, { status: 404 });
        }

        const creds = {
            url: user.wc_store_url,
            key: user.wc_consumer_key,
            secret: user.wc_consumer_secret
        };

        if (!isWooCommerceConfigured(creds)) {
            return NextResponse.json({
                configured: false,
                message: 'WooCommerce credentials not configured in database',
            }, { status: 200 });
        }

        // Start sync process
        const syncResults = await syncWooCommerceData(userId, creds);
        
        return NextResponse.json({
            configured: true,
            success: true,
            results: syncResults
        });

    } catch (error) {
        console.error('[WooCommerce Sync Error]', error.message);
        return NextResponse.json(
            { configured: true, error: error.message },
            { status: 500 }
        );
    }
}

async function syncWooCommerceData(userId, creds) {
    const results = {
        customers: { inserted: 0, updated: 0, errors: 0 },
        products: { inserted: 0, updated: 0, errors: 0 },
        orders: { inserted: 0, updated: 0, errors: 0 }
    };

    try {
        // Sync Customers
        const customersResult = await syncCustomers(userId, creds);
        results.customers = customersResult;

        // Sync Products
        const productsResult = await syncProducts(userId, creds);
        results.products = productsResult;

        // Sync Orders
        const ordersResult = await syncOrders(userId, creds);
        results.orders = ordersResult;

    } catch (error) {
        console.error('Sync process error:', error);
        throw error;
    }

    return results;
}

async function syncCustomers(userId, creds) {
    const result = { inserted: 0, updated: 0, errors: 0 };
    let page = 1;
    const perPage = 100;

    try {
        while (true) {
            const response = await getWooCommerceCustomers({ creds, page, perPage });
            const customers = response.data || [];
            if (customers.length === 0) break;

            for (const customer of customers) {
                try {
                    const customerData = {
                        user_id: userId,
                        name: customer.name,
                        email: customer.email,
                        contact: customer.phone || customer.email,
                        city: customer.city || '',
                        total_orders: customer.ordersCount || 0,
                        total_spent: customer.totalSpent || 0,
                        status: 'active',
                        last_order_date: new Date().toISOString()
                    };

                    // Use upsert for better performance
                    await supabase
                        .from('customers')
                        .upsert(customerData, { 
                            onConflict: 'email', 
                            ignoreDuplicates: false 
                        });
                    
                    result.inserted++;
                } catch (error) {
                    console.error(`Error syncing customer ${customer.email}:`, error);
                    result.errors++;
                }
            }

            page++;
            if (page > response.meta.pagination.lastPage) break;
        }
    } catch (error) {
        console.error('Error fetching customers:', error);
        result.errors++;
    }

    return result;
}

async function syncProducts(userId, creds) {
    const result = { inserted: 0, updated: 0, errors: 0 };
    let page = 1;
    const perPage = 100;

    try {
        while (true) {
            const response = await getWooCommerceProducts({ creds, page, perPage });
            const products = response.data || [];
            if (products.length === 0) break;

            for (const product of products) {
                try {
                    const productData = {
                        user_id: userId,
                        name: product.name,
                        sku: product.sku || '',
                        price: product.price || 0,
                        stock: product.stock || 0,
                        category: product.category || 'Uncategorized',
                        status: product.status === 'instock' ? 'active' : 'inactive'
                    };

                    // Use upsert for better performance
                    await supabase
                        .from('products')
                        .upsert(productData, { 
                            onConflict: 'sku', 
                            ignoreDuplicates: false 
                        });
                    
                    result.inserted++;
                } catch (error) {
                    console.error(`Error syncing product ${product.sku}:`, error);
                    result.errors++;
                }
            }

            page++;
            if (page > response.meta.pagination.lastPage) break;
        }
    } catch (error) {
        console.error('Error fetching products:', error);
        result.errors++;
    }

    return result;
}

async function syncOrders(userId, creds) {
    const result = { inserted: 0, updated: 0, errors: 0 };
    let page = 1;
    const perPage = 100;

    try {
        while (true) {
            const response = await getWooCommerceOrders({ creds, page, perPage });
            const orders = response.orders || [];
            if (orders.length === 0) break;

            for (const order of orders) {
                try {
                    // Get or create customer
                    let customerId = null;
                    if (order.customerEmail) {
                        const customerData = {
                            user_id: userId,
                            name: order.customerName || 'Guest',
                            email: order.customerEmail,
                            contact: order.customerPhone || order.customerEmail,
                            city: order.city || '',
                            total_orders: 1,
                            total_spent: order.total || 0,
                            status: 'active',
                            last_order_date: order.date || new Date().toISOString()
                        };

                        // Check if customer already exists by email
                        const { data: existingCustomer, error: customerCheckError } = await supabase
                            .from('customers')
                            .select('id')
                            .eq('user_id', userId)
                            .eq('email', order.customerEmail)
                            .maybeSingle();

                        if (existingCustomer?.id) {
                            customerId = existingCustomer.id;
                            // Update existing customer
                            await supabase
                                .from('customers')
                                .update(customerData)
                                .eq('id', existingCustomer.id);
                        } else {
                            // Insert new customer
                            const { data: newCustomer, error: customerInsertError } = await supabase
                                .from('customers')
                                .insert(customerData)
                                .select('id')
                                .single();
                            
                            if (customerInsertError) {
                                console.error('Customer insert error:', customerInsertError);
                                throw customerInsertError;
                            }
                            
                            customerId = newCustomer?.id;
                            if (!customerId) {
                                throw new Error('Failed to insert customer - no ID returned');
                            }
                        }
                    }

                    // Insert/update order using upsert for performance
                    const orderData = {
                        user_id: userId,
                        customer_id: customerId,
                        order_id: order.number.toString(),
                        platform_id: 1, // WooCommerce platform ID from external_platforms table
                        status: order.status,
                        total_amount: order.total || 0
                    };

                    // Check if order already exists by order_id
                    const { data: existingOrder, error: checkError } = await supabase
                        .from('orders')
                        .select('id')
                        .eq('user_id', userId)
                        .eq('order_id', order.number.toString())
                        .maybeSingle(); // Use maybeSingle() instead of single()

                    let orderId;
                    if (existingOrder?.id) {
                        orderId = existingOrder.id;
                        // Update existing order
                        await supabase
                            .from('orders')
                            .update(orderData)
                            .eq('id', existingOrder.id);
                    } else {
                        // Insert new order
                        const { data: newOrder, error: insertError } = await supabase
                            .from('orders')
                            .insert(orderData)
                            .select('id')
                            .single();
                        
                        if (insertError) {
                            console.error('Order insert error:', insertError);
                            throw insertError;
                        }
                        
                        orderId = newOrder?.id;
                        if (!orderId) {
                            throw new Error('Failed to insert order - no ID returned');
                        }
                    }

                    // Prepare order items for batch insert
                    const orderItems = [];
                    for (const item of order.items || []) {
                        // Find product by SKU to get product_id
                        let productId = null;
                        if (item.sku) {
                            const { data: product } = await supabase
                                .from('products')
                                .select('id')
                                .eq('user_id', userId)
                                .eq('sku', item.sku)
                                .single();
                            
                            if (product) {
                                productId = product.id;
                            }
                        }

                        orderItems.push({
                            order_id: orderId,
                            product_id: productId,
                            quantity: item.quantity || 1,
                            price: item.price || 0
                        });
                    }

                    if (orderItems.length > 0) {
                        await supabase
                            .from('order_items')
                            .insert(orderItems);
                    }

                    result.inserted++;
                } catch (error) {
                    console.error(`Error syncing order ${order.number}:`, error);
                    result.errors++;
                }
            }

            page++;
            if (page > response.pagination.totalPages) break;
        }
    } catch (error) {
        console.error('Error fetching orders:', error);
        result.errors++;
    }

    return result;
}
