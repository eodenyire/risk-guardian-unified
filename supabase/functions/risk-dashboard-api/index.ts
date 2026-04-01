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

    const { action } = await req.json();

    if (action === 'risk_summary') {
      const { data: riskTypes } = await supabase.from('risk_types').select('*').order('risk_score', { ascending: false });

      const highCount = riskTypes?.filter(r => r.risk_level === 'high' || r.risk_level === 'critical').length || 0;
      const mediumCount = riskTypes?.filter(r => r.risk_level === 'medium').length || 0;
      const lowCount = riskTypes?.filter(r => r.risk_level === 'low').length || 0;

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            total_prt: riskTypes?.length || 0,
            high_risk: highCount,
            medium_risk: mediumCount,
            low_risk: lowCount,
            risk_types: riskTypes,
            avg_score: Math.round((riskTypes?.reduce((sum, r) => sum + r.risk_score, 0) || 0) / (riskTypes?.length || 1)),
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'integration_status') {
      const { data: sources } = await supabase.from('data_sources').select('*').order('name');
      const { data: recentSyncs } = await supabase
        .from('sync_log')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(20);

      return new Response(
        JSON.stringify({ success: true, data: { sources, recent_syncs: recentSyncs } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'kri_overview') {
      const { data: kris } = await supabase.from('kri').select('*, risk_types(name)');
      return new Response(
        JSON.stringify({ success: true, data: { kris, total: kris?.length || 0 } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'controls_overview') {
      const { data: controls } = await supabase.from('controls').select('*, risk_types(name)');
      return new Response(
        JSON.stringify({ success: true, data: { controls, total: controls?.length || 0 } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'rcsa_overview') {
      const { data: rcsas } = await supabase.from('rcsa').select('*, risk_types(name)');
      const completed = rcsas?.filter(r => r.status === 'approved').length || 0;
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            rcsas,
            total: rcsas?.length || 0,
            completed,
            completion_rate: rcsas?.length ? Math.round((completed / rcsas.length) * 100) : 0,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use: risk_summary, integration_status, kri_overview, controls_overview, rcsa_overview' }),
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
