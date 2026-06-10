const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ubgcwvnwyajrhvubkscm.supabase.co';
const supabaseKey = 'sb_publishable_9y01i8BkdMoQnSLl8438UQ_PBcElkxC';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const tables = ['inventory_movements', 'purchase_orders', 'suppliers', 'returns', 'products'];
    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) console.log(table, 'error:', error.message);
        else {
            console.log(table, 'exists');
            if (data.length > 0) {
                console.log(Object.keys(data[0]));
            } else {
                console.log("No data for", table);
            }
        }
    }
}
check();
