
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testCols() {
    const cols = ['campaign_name', 'name', 'title', 'budget', 'daily_budget', 'spent', 'status', 'state', 'is_active', 'platform'];
    for (const c of cols) {
        const { error } = await supabase.from('ads_campaign').select(c).limit(1);
        if (!error) console.log(`Column exists: ${c}`);
        else if (error.code !== '42703') console.log(`Column ${c} error:`, error.message);
    }
}
testCols();
