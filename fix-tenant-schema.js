const supabase = require('./src/supabase');

async function fixSchema() {
    const tenantId = "ff06ffb4-1674-4f60-b3bf-2053d3438281";
    const schemaSlug = "vet_pura_sangre"; // Using underscore instead of hyphen

    console.log(`Fixing tenant ${tenantId}...`);

    // 1. Call RPC with underscores
    const { error: rpcError } = await supabase.rpc('crear_schema_tenant', {
        p_tenant_id: tenantId,
        p_schema: schemaSlug
    });

    if (rpcError) {
        console.error('Error calling RPC:', rpcError.message);
        return;
    }

    console.log(`Schema ${schemaSlug} created and assigned.`);

    // 2. Update the tenant's schema_name in the database just in case
    const { error: updateError } = await supabase
        .from('tenants')
        .update({ schema_name: schemaSlug })
        .eq('id', tenantId);

    if (updateError) {
        console.error('Error updating tenant schema_name:', updateError.message);
    } else {
        console.log('Tenant updated successfully.');
    }
}

fixSchema();
