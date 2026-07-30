import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
    try {
        const { type, data, userId } = await request.json();
        
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized: missing userId' }, { status: 401 });
        }

        if (!data || !Array.isArray(data) || data.length === 0) {
            return NextResponse.json({ error: 'No data to import' }, { status: 400 });
        }

        if (type === 'Products') {
            const skus = data.map(d => d.SKU).filter(Boolean);
            let existingProducts = [];
            
            if (skus.length > 0) {
                const { data: existing, error: fetchErr } = await supabase
                    .from('products')
                    .select('id, sku')
                    .eq('user_id', userId)
                    .in('sku', skus);
                
                if (!fetchErr && existing) {
                    existingProducts = existing;
                }
            }

            const parseBool = v => v && /^(true|yes|1)$/i.test(String(v).trim());

            const upsertData = data.map(item => {
                const existing = existingProducts.find(p => p.sku === item.SKU);
                const stock = parseInt(item.Stock) || 0;
                const reorder = parseInt(item.ReorderPoint) || 10;
                const record = {
                    user_id: userId,
                    name: item.Name || 'Unnamed Product',
                    sku: item.SKU,
                    barcode: item.Barcode || null,
                    stock,
                    reorder_point: reorder,
                    price: parseFloat(item.Price) || 0,
                    cost_price: parseFloat(item.Cost) || 0,
                    category: item.Category || null,
                    status: stock > reorder ? 'In Stock' : stock > 0 ? 'Low Stock' : 'Out of Stock',
                    supplier_name: item.Supplier || null,
                    lead_time_days: item.LeadTimeDays ? parseInt(item.LeadTimeDays) : null,
                    publish_shopify: parseBool(item.PublishShopify),
                    publish_daraz: parseBool(item.PublishDaraz),
                    publish_woocommerce: parseBool(item.PublishWooCommerce),
                };
                if (existing) {
                    record.id = existing.id;
                }
                return record;
            });

            const { error: upsertErr } = await supabase
                .from('products')
                .upsert(upsertData, { onConflict: 'id' });
                
            if (upsertErr) throw upsertErr;
            
            return NextResponse.json({ success: true, count: upsertData.length });
        }
        else if (type === 'Suppliers') {
            const insertData = data.map(item => ({
                user_id: userId,
                name: item.Name || 'Unnamed Supplier',
                email: item.Email || null,
                lead_time_days: parseInt(item.LeadTimeDays) || 0,
                status: item.Status || 'Active'
            }));

            const { error: insertErr } = await supabase
                .from('suppliers')
                .insert(insertData);

            if (insertErr) throw insertErr;
            return NextResponse.json({ success: true, count: insertData.length });
        }
        else if (type === 'Movements') {
            const insertData = data.map(item => ({
                user_id: userId,
                movement_type: item.Type || 'Adjustment',
                quantity: parseInt(item.Quantity) || 0,
                reason: item.Reason || null,
                reference: item.Reference || null,
                user_name: item.User || 'System'
            }));
            
            // Note: properly importing movements requires product_id lookup from SKU
            // For simplicity and matching the schema without a heavy mapping step in MVP:
            const { error: insertErr } = await supabase
                .from('inventory_movements')
                .insert(insertData);

            if (insertErr) throw insertErr;
            return NextResponse.json({ success: true, count: insertData.length });
        }
        else if (type === 'Purchase Orders') {
            // Resolve supplier names → IDs
            const supplierNames = [...new Set(data.map(d => d.Supplier).filter(Boolean))];
            const supplierMap = {};
            if (supplierNames.length > 0) {
                const { data: suppliers } = await supabase
                    .from('suppliers')
                    .select('id, name')
                    .eq('user_id', userId)
                    .in('name', supplierNames);
                (suppliers || []).forEach(s => { supplierMap[s.name] = s.id; });
            }

            const insertData = data.map(item => {
                let parsedItems;
                try {
                    parsedItems = item.Items ? JSON.parse(item.Items) : [];
                } catch {
                    parsedItems = item.Items
                        ? [{ name: String(item.Items), quantity: 1, unitPrice: 0 }]
                        : [];
                }
                return {
                    user_id: userId,
                    po_number: item.PONumber || `PO-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
                    supplier_id: supplierMap[item.Supplier] || null,
                    items: parsedItems,
                    total_amount: parseFloat(item.Total) || 0,
                    status: item.Status || 'draft',
                    notes: null,
                };
            });

            const { error: insertErr } = await supabase
                .from('purchase_orders')
                .insert(insertData);

            if (insertErr) throw insertErr;
            return NextResponse.json({ success: true, count: insertData.length });
        }
        else if (type === 'Returns') {
            // Resolve product names → IDs
            const itemNames = [...new Set(data.map(d => d.Item).filter(Boolean))];
            const productMap = {};
            if (itemNames.length > 0) {
                const { data: products } = await supabase
                    .from('products')
                    .select('id, name')
                    .eq('user_id', userId)
                    .in('name', itemNames);
                (products || []).forEach(p => { productMap[p.name] = p.id; });
            }

            const insertData = data.map(item => ({
                user_id: userId,
                rma_number: item.RMANumber || `RMA-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
                reason: item.Reason || null,
                condition: item.Condition || null,
                status: item.Status || 'Pending',
                product_id: productMap[item.Item] || null,
            }));

            const { error: insertErr } = await supabase
                .from('returns')
                .insert(insertData);

            if (insertErr) throw insertErr;
            return NextResponse.json({ success: true, count: insertData.length });
        }
        else {
            return NextResponse.json({ error: `Unknown import type: ${type}` }, { status: 400 });
        }

    } catch (error) {
        console.error('Import error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
