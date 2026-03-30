const supabase = require('./src/supabase');

async function listPublicTables() {
    const tables = ['products', 'suppliers', 'sales', 'sale_items', 'costs', 'appointments'];
    console.log('Checking existence of tables in public schema...');

    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('count').limit(1);
        if (error) {
            console.log(`[ ] ${table}: Does not exist in public or is inaccessible.`);
        } else {
            console.log(`[x] ${table}: Exists in public.`);
        }
    }
}

listPublicTables();
