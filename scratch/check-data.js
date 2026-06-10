const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://ubgcwvnwyajrhvubkscm.supabase.co';
const supabaseKey = 'sb_publishable_9y01i8BkdMoQnSLl8438UQ_PBcElkxC';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    let { data: movements } = await supabase.from('inventory_movements').select('*').eq('user_id', 'e5940095-1560-4425-ab60-f8fc5f7874f4');
    console.log("Movements count:", movements?.length);
    let { data: pos } = await supabase.from('purchase_orders').select('*').eq('user_id', 'e5940095-1560-4425-ab60-f8fc5f7874f4');
    console.log("POs count:", pos?.length);
    let { data: ret } = await supabase.from('returns').select('*').eq('user_id', 'e5940095-1560-4425-ab60-f8fc5f7874f4');
    console.log("Returns count:", ret?.length);
}
check();
