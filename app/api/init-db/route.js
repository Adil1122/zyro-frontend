import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST() {
    try {
        // Initialize WooCommerce columns in users table
        const { error: wcColumnsError } = await supabase.rpc('exec_sql', {
            sql: `
                ALTER TABLE users ADD COLUMN IF NOT EXISTS wc_store_url text;
                ALTER TABLE users ADD COLUMN IF NOT EXISTS wc_consumer_key text;
                ALTER TABLE users ADD COLUMN IF NOT EXISTS wc_consumer_secret text;
            `
        });

        if (wcColumnsError) {
            console.error('Error adding WooCommerce columns:', wcColumnsError);
        }

        // Initialize customers table
        const { error: customersError } = await supabase.rpc('exec_sql', {
            sql: `
                CREATE TABLE IF NOT EXISTS customers (
                    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
                    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    name text,
                    email text,
                    phone text,
                    city text,
                    orders_count integer DEFAULT 0,
                    total_spent numeric DEFAULT 0,
                    platform text DEFAULT 'woocommerce',
                    platform_id integer,
                    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
                    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
                );
            `
        });

        if (customersError) {
            console.error('Error creating customers table:', customersError);
        }

        // Initialize products table
        const { error: productsError } = await supabase.rpc('exec_sql', {
            sql: `
                CREATE TABLE IF NOT EXISTS products (
                    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
                    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    name text,
                    sku text,
                    stock_quantity integer DEFAULT 0,
                    price numeric DEFAULT 0,
                    status text,
                    category text,
                    platform text DEFAULT 'woocommerce',
                    platform_id integer,
                    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
                    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
                );
            `
        });

        if (productsError) {
            console.error('Error creating products table:', productsError);
        }

        // Initialize orders table
        const { error: ordersError } = await supabase.rpc('exec_sql', {
            sql: `
                CREATE TABLE IF NOT EXISTS orders (
                    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
                    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    platform_order_id integer,
                    order_number text,
                    status text,
                    customer_name text,
                    customer_email text,
                    customer_phone text,
                    city text,
                    total_amount numeric DEFAULT 0,
                    currency text DEFAULT 'PKR',
                    payment_method text,
                    item_count integer DEFAULT 0,
                    platform text DEFAULT 'woocommerce',
                    order_date timestamp with time zone,
                    billing_address jsonb,
                    shipping_address jsonb,
                    items jsonb,
                    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
                    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
                );
            `
        });

        if (ordersError) {
            console.error('Error creating orders table:', ordersError);
        }

        // Create indexes
        const { error: indexesError } = await supabase.rpc('exec_sql', {
            sql: `
                CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
                CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
                CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
                CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
                CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
                CREATE INDEX IF NOT EXISTS idx_orders_platform_order_id ON orders(platform_order_id);
            `
        });

        if (indexesError) {
            console.error('Error creating indexes:', indexesError);
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Database schema initialized successfully' 
        });

    } catch (error) {
        console.error('Database initialization error:', error);
        return NextResponse.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
}
