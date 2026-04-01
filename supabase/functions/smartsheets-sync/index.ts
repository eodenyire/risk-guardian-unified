import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, source_id, config } = await req.json();

    // SmartSheets API integration
    // In production, this would call the SmartSheets API using stored credentials
    // For now, it demonstrates the data flow pattern

    if (action === 'sync_pull') {
      // Pull data from SmartSheets into our risk tables
      const smartsheetsApiKey = Deno.env.get('SMARTSHEETS_API_KEY');
      if (!smartsheetsApiKey) {
        return new Response(
          JSON.stringify({ error: 'SMARTSHEETS_API_KEY not configured. Add it in Cloud → Secrets.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log sync attempt
      const { data: syncLog } = await supabase
        .from('sync_log')
        .insert({
          data_source_id: source_id,
          sync_type: 'pull',
          target_system: 'smartsheets',
          status: 'in_progress',
        })
        .select()
        .single();

      // TODO: Replace with actual SmartSheets API call
      // const response = await fetch(`https://api.smartsheet.com/2.0/sheets/${sheetId}`, {
      //   headers: { 'Authorization': `Bearer ${smartsheetsApiKey}` }
      // });

      // Update sync status
      if (syncLog) {
        await supabase
          .from('sync_log')
          .update({ status: 'success', completed_at: new Date().toISOString(), records_processed: 0 })
          .eq('id', syncLog.id);
      }

      return new Response(
        JSON.stringify({ success: true, message: 'SmartSheets sync initiated', sync_id: syncLog?.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'sync_push') {
      // Push data from our system to SmartSheets
      const { data: risks } = await supabase.from('risk_register').select('*');

      return new Response(
        JSON.stringify({ success: true, message: 'Data ready for SmartSheets push', record_count: risks?.length || 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'status') {
      const { data: source } = await supabase
        .from('data_sources')
        .select('*')
        .eq('source_type', 'smartsheets')
        .single();

      return new Response(
        JSON.stringify({ success: true, source }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use: sync_pull, sync_push, status' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
