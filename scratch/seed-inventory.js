const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ubgcwvnwyajrhvubkscm.supabase.co';
const supabaseKey = 'sb_publishable_9y01i8BkdMoQnSLl8438UQ_PBcElkxC';
const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
    console.log("Seeding dummy data...");

    let userId = 'e5940095-1560-4425-ab60-f8fc5f7874f4';

    const suppliers = [
        { user_id: userId, name: 'Derma Beauty Ltd', contact_phone: '+92 321 5544332', email: 'orders@dermabeauty.pk', lead_time_days: 4, status: 'Active' },
        { user_id: userId, name: 'Glow Supplies Co', contact_phone: '+92 333 7788991', email: 'hello@glowsupplies.com', lead_time_days: 6, status: 'Active' },
        { user_id: userId, name: 'Karachi Skin Co', contact_phone: '+92 322 1122334', email: 'sales@karachiskin.pk', lead_time_days: 2, status: 'Active' }
    ];
    let { data: sData, error: sErr } = await supabase.from('suppliers').insert(suppliers).select();

    const products = [
        { user_id: userId, name: 'Rose Glow Serum 30ml', sku: 'RGS-30', stock: 50, price: 1990, cost_price: 780, status: 'In stock', category: 'Skincare' },
        { user_id: userId, name: 'Vit C Face Wash 100ml', sku: 'VCW-100', stock: 4, price: 1510, cost_price: 620, status: 'Low Stock', category: 'Skincare' },
        { user_id: userId, name: 'Anti-Aging Cream 50ml', sku: 'AAC-50', stock: 0, price: 5990, cost_price: 2400, status: 'Out of Stock', category: 'Skincare' },
        { user_id: userId, name: 'Hyaluronic Booster 15ml', sku: 'HAB-15', stock: 23, price: 2990, cost_price: 1200, status: 'In stock', category: 'Skincare' },
        { user_id: userId, name: 'Aloe Vera Gel 200ml', sku: 'AVG-200', stock: 87, price: 990, cost_price: 380, status: 'In stock', category: 'Skincare' },
        { user_id: userId, name: 'Hidden Product', sku: 'HID-01', stock: 10, price: 100, cost_price: 50, status: 'Hidden', category: 'Other' },
    ];
    let { data: pData, error: pErr } = await supabase.from('products').upsert(products, { onConflict: 'sku' }).select();
    if (pErr) console.error("Products Error:", pErr);
    
    let extraProducts = [];
    for(let i=1; i<=25; i++) {
        extraProducts.push({ user_id: userId, name: `Dummy Product ${i}`, sku: `DUM-${i}`, stock: 10+i, price: 100+i, cost_price: 50, status: 'In stock', category: 'Misc' });
    }
    await supabase.from('products').upsert(extraProducts, { onConflict: 'sku' });

    if (pData && pData.length > 0) {
        const pos = [
            { user_id: userId, po_number: 'PO-0237', supplier_id: sData ? sData[0]?.id : null, status: 'In transit', expected_date: new Date(Date.now() + 86400000).toISOString(), total_amount: 84500 },
            { user_id: userId, po_number: 'PO-0236', supplier_id: sData ? sData[1]?.id : null, status: 'Confirmed', expected_date: new Date(Date.now() + 3*86400000).toISOString(), total_amount: 56200 },
            { user_id: userId, po_number: 'PO-0235', supplier_id: sData ? sData[2]?.id : null, status: 'Draft', expected_date: new Date(Date.now() + 5*86400000).toISOString(), total_amount: 43800 }
        ];
        let { error: poErr } = await supabase.from('purchase_orders').insert(pos);
        if (poErr) console.error("PO Error:", poErr);

        const movements = [
            { user_id: userId, product_id: pData[0].id, movement_type: 'Sale', quantity: -2, reason: 'Order placed', reference: '#1247', user_name: 'System' },
            { user_id: userId, product_id: pData[1].id, movement_type: 'Sale', quantity: -1, reason: 'Order placed', reference: '#1246', user_name: 'System' },
            { user_id: userId, product_id: pData[3].id, movement_type: 'Receipt', quantity: 50, reason: 'PO received', reference: 'PO-0234', user_name: 'Fatima Ali' },
            { user_id: userId, product_id: pData[4].id, movement_type: 'Receipt', quantity: 30, reason: 'PO received', reference: 'PO-0234', user_name: 'Fatima Ali' },
            { user_id: userId, product_id: pData[0].id, movement_type: 'Return', quantity: 1, reason: 'Return (sellable)', reference: 'RMA-089', user_name: 'Fatima Ali' },
            { user_id: userId, product_id: pData[2].id, movement_type: 'Adjustment', quantity: -3, reason: 'Damaged in packing', reference: 'Manual', user_name: 'Ahmad Khan' }
        ];
        let { error: mErr } = await supabase.from('inventory_movements').insert(movements);
        if (mErr) console.error("Movements Error:", mErr);

        const returns = [
            { user_id: userId, rma_number: 'RMA-093', order_id: null, product_id: pData[1].id, customer_id: null, reason: 'Wrong size', condition: 'Sealed', status: 'Inspected' },
            { user_id: userId, rma_number: 'RMA-091', order_id: null, product_id: pData[3].id, customer_id: null, reason: 'Damaged in transit', condition: 'Opened', status: 'Written off' },
            { user_id: userId, rma_number: 'RMA-090', order_id: null, product_id: pData[4].id, customer_id: null, reason: 'Wrong item', condition: 'Sealed', status: 'Restocked' },
            { user_id: userId, rma_number: 'RMA-094', order_id: null, product_id: pData[2].id, customer_id: null, reason: 'Customer changed mind', condition: 'Sealed', status: 'Pending' }
        ];
        let { error: rErr } = await supabase.from('returns').insert(returns);
        if (rErr) console.error("Returns Error:", rErr);
    }

    console.log("Seeding complete.");
}
seed();
