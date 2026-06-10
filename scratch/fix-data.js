const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://ubgcwvnwyajrhvubkscm.supabase.co';
const supabaseKey = 'sb_publishable_9y01i8BkdMoQnSLl8438UQ_PBcElkxC';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fix() {
    const userId = 'e5940095-1560-4425-ab60-f8fc5f7874f4';
    console.log("Fixing user_ids...");
    await supabase.from('purchase_orders').update({ user_id: userId }).neq('user_id', userId);
    await supabase.from('returns').update({ user_id: userId }).neq('user_id', userId);
    await supabase.from('inventory_movements').update({ user_id: userId }).neq('user_id', userId);
    await supabase.from('suppliers').update({ user_id: userId }).neq('user_id', userId);
    await supabase.from('products').update({ user_id: userId }).neq('user_id', userId);
    console.log("Fixed!");
}
fix();
