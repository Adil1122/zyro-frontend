
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkTables() {
    const tables = ['wa_conversations', 'wa_messages', 'support_tickets', 'couriers', 'ads_campaign'];
    for (const t of tables) {
        const { error } = await supabase.from(t).select('count', { count: 'exact' }).limit(0);
        if (error) console.log(`Table MISSING or ERROR on: ${t} - ${error.message}`);
        else console.log(`Table exists: ${t}`);
    }
}
checkTables();
