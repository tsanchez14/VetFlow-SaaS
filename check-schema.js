const supabase = require('./src/supabase');

async function checkTenant() {
    const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('slug', 'pura-sangre')
        .single();

    if (error) {
        console.error('Error fetching tenant:', error.message);
        return;
    }

    console.log('Tenant Data:', JSON.stringify(data, null, 2));

    // Try to check if schema exists by querying something
    if (data.schema_name) {
        const { error: schemaError } = await supabase
            .schema(data.schema_name)
            .from('productos')
            .select('count')
            .limit(1);

        if (schemaError) {
            console.error(`Error accessing schema ${data.schema_name}:`, schemaError.message);
        } else {
            console.log(`Schema ${data.schema_name} is accessible.`);
        }
    } else {
        console.log('No schema_name assigned to this tenant.');
    }
}

checkTenant();
