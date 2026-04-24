
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function inspectAdsCampaign() {
    // Try to get one record or metadata
    const { data, error } = await supabase.from('ads_campaign').select('*').limit(1);
    if (error) {
        console.log('Error fetching ads_campaign:', error.message);
    } else {
        console.log('Columns in ads_campaign (via select *):', Object.keys(data[0] || {}));
    }
}
inspectAdsCampaign();
