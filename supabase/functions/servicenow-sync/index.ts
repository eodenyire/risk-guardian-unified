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

    const { action, source_id, incident_type } = await req.json();

    if (action === 'sync_pull') {
      // Pull GRC data from ServiceNow
      const serviceNowUrl = Deno.env.get('SERVICENOW_INSTANCE_URL');
      const serviceNowUser = Deno.env.get('SERVICENOW_USERNAME');
      const serviceNowPass = Deno.env.get('SERVICENOW_PASSWORD');

      if (!serviceNowUrl) {
        return new Response(
          JSON.stringify({ error: 'SERVICENOW_INSTANCE_URL not configured. Add it in Cloud → Secrets.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: syncLog } = await supabase
        .from('sync_log')
        .insert({
          data_source_id: source_id,
          sync_type: 'pull',
          target_system: 'servicenow',
          status: 'in_progress',
        })
        .select()
        .single();

      // TODO: Replace with actual ServiceNow GRC API calls
      // Tables to sync: sn_grc_risk, sn_grc_control, sn_grc_issue, sn_grc_indicator
      // const response = await fetch(`${serviceNowUrl}/api/now/table/sn_grc_risk`, {
      //   headers: {
      //     'Authorization': `Basic ${btoa(`${serviceNowUser}:${serviceNowPass}`)}`,
      //     'Content-Type': 'application/json'
      //   }
      // });

      if (syncLog) {
        await supabase
          .from('sync_log')
          .update({ status: 'success', completed_at: new Date().toISOString(), records_processed: 0 })
          .eq('id', syncLog.id);
      }

      return new Response(
        JSON.stringify({ success: true, message: 'ServiceNow GRC sync initiated', sync_id: syncLog?.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'sync_push') {
      // Push risk data back to ServiceNow GRC
      const { data: risks } = await supabase.from('risk_register').select('*');
      const { data: controls } = await supabase.from('controls').select('*');

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Data ready for ServiceNow push',
          risks_count: risks?.length || 0,
          controls_count: controls?.length || 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'push_incident') {
      // Create incident in ServiceNow from risk event
      return new Response(
        JSON.stringify({ success: true, message: 'Incident creation endpoint ready', incident_type }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'status') {
      const { data: source } = await supabase
        .from('data_sources')
        .select('*')
        .eq('source_type', 'servicenow')
        .single();

      return new Response(
        JSON.stringify({ success: true, source }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use: sync_pull, sync_push, push_incident, status' }),
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
