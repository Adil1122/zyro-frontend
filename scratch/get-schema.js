const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://ubgcwvnwyajrhvubkscm.supabase.co';
const supabaseKey = 'sb_publishable_9y01i8BkdMoQnSLl8438UQ_PBcElkxC';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase.rpc('exec_sql', {
        sql: `SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name IN ('inventory_movements', 'purchase_orders', 'suppliers', 'returns');`
    });
    console.log(error || data);
}
check();
