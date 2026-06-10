const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
let supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    try {
        const env = fs.readFileSync('.env.local', 'utf8');
        env.split('\n').forEach(line => {
            if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
            if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
        });
    } catch (e) {
        console.error("Could not read .env.local", e);
    }
}

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log("Checking schema...");
    for (const table of ['products', 'orders', 'customers', 'users']) {
        const { data: rowData, error } = await supabase.from(table).select('id').limit(1);
        if (error) {
            console.log(`Error on ${table}:`, error.message);
            continue;
        }
        if (rowData && rowData.length > 0) {
            console.log(`${table}.id is type ${typeof rowData[0].id} - Example: ${rowData[0].id}`);
            // if string, check if UUID format
            if (typeof rowData[0].id === 'string') {
                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rowData[0].id);
                console.log(`  -> Is UUID format? ${isUuid}`);
            }
        } else {
            console.log(`${table} is empty or doesn't exist`);
        }
    }
}

checkSchema();
