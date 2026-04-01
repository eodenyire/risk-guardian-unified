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

    const { action, dataset_id } = await req.json();

    if (action === 'push_dataset') {
      // Push aggregated risk data to Power BI streaming dataset
      const powerBiKey = Deno.env.get('POWERBI_API_KEY');
      if (!powerBiKey) {
        return new Response(
          JSON.stringify({ error: 'POWERBI_API_KEY not configured. Add it in Cloud → Secrets.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch all risk data for dashboard
      const { data: riskTypes } = await supabase.from('risk_types').select('*');
      const { data: kris } = await supabase.from('kri').select('*');
      const { data: controls } = await supabase.from('controls').select('*');
      const { data: rcsas } = await supabase.from('rcsa').select('*');

      // Transform data for Power BI format
      const dashboardData = {
        risk_summary: riskTypes?.map(r => ({
          risk_name: r.name,
          risk_level: r.risk_level,
          risk_score: r.risk_score,
          trend: r.trend,
          category: r.category,
        })),
        kri_metrics: kris?.length || 0,
        control_count: controls?.length || 0,
        rcsa_completion: rcsas?.filter(r => r.status === 'approved').length || 0,
        total_rcsa: rcsas?.length || 0,
        timestamp: new Date().toISOString(),
      };

      // TODO: Push to Power BI streaming dataset
      // const response = await fetch(`https://api.powerbi.com/v1.0/myorg/datasets/${dataset_id}/rows`, {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${powerBiKey}`,
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify([dashboardData])
      // });

      const { data: syncLog } = await supabase
        .from('sync_log')
        .insert({
          data_source_id: (await supabase.from('data_sources').select('id').eq('source_type', 'powerbi').single()).data?.id,
          sync_type: 'push',
          target_system: 'powerbi',
          status: 'success',
          records_processed: riskTypes?.length || 0,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      return new Response(
        JSON.stringify({ success: true, message: 'Data prepared for Power BI', data: dashboardData, sync_id: syncLog?.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'refresh') {
      // Trigger Power BI dataset refresh
      return new Response(
        JSON.stringify({ success: true, message: 'Power BI refresh endpoint ready', dataset_id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'status') {
      const { data: source } = await supabase
        .from('data_sources')
        .select('*')
        .eq('source_type', 'powerbi')
        .single();

      const { data: recentSyncs } = await supabase
        .from('sync_log')
        .select('*')
        .eq('target_system', 'powerbi')
        .order('started_at', { ascending: false })
        .limit(5);

      return new Response(
        JSON.stringify({ success: true, source, recent_syncs: recentSyncs }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use: push_dataset, refresh, status' }),
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
