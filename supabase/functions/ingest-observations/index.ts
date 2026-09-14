import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

/**
 * Pulls fresh KRI observations from every registered data source.
 *
 * A data source declares its KRI mappings inside connection_config:
 *   {
 *     "base_url": "https://...",            // optional, prefixes relative paths
 *     "headers": { "x-api-key": "..." },    // optional
 *     "kri_mappings": [
 *       { "kri_id": "uuid", "path": "/metrics/npl", "field": "value" },
 *       { "kri_id": "uuid", "value": 4.2 }   // static / pushed value
 *     ]
 *   }
 *
 * Every retrieved value is written to kri_observations; the database trigger
 * scores it against the KRI thresholds and refreshes current_value,
 * last_measured_at, status and trend.
 */

interface Mapping {
  kri_id: string;
  path?: string;
  field?: string;
  value?: number;
}

const pick = (payload: unknown, field?: string): number | null => {
  if (typeof payload === "number") return payload;
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as Record<string, unknown>;
  const parts = (field ?? "value").split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (!cur || typeof cur !== "object") return null;
    cur = (cur as Record<string, unknown>)[p];
  }
  const n = Number(cur);
  return Number.isFinite(n) ? n : null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    let onlySourceId: string | null = null;
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (typeof body?.data_source_id === "string") onlySourceId = body.data_source_id;
    }

    let q = supabase.from("data_sources").select("*");
    if (onlySourceId) q = q.eq("id", onlySourceId);
    const { data: sources, error: srcErr } = await q;
    if (srcErr) throw srcErr;

    const summary: Record<string, unknown>[] = [];

    for (const source of sources ?? []) {
      const started = new Date().toISOString();
      const cfg = (source.connection_config ?? {}) as Record<string, unknown>;
      const mappings = (cfg.kri_mappings as Mapping[] | undefined) ?? [];
      const baseUrl = typeof cfg.base_url === "string" ? cfg.base_url : "";
      const headers = (cfg.headers as Record<string, string> | undefined) ?? {};

      let processed = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const m of mappings) {
        try {
          let value: number | null = null;

          if (typeof m.value === "number") {
            value = m.value;
          } else if (m.path) {
            const url = m.path.startsWith("http") ? m.path : `${baseUrl}${m.path}`;
            const res = await fetch(url, { headers });
            if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
            const json = await res.json();
            value = pick(json, m.field);
          }

          if (value === null) throw new Error(`no numeric value for KRI ${m.kri_id}`);

          const { error } = await supabase.from("kri_observations").insert({
            kri_id: m.kri_id,
            value,
            observed_at: new Date().toISOString(),
            source: source.name,
            notes: `Automated ingestion from ${source.source_type}`,
          });
          if (error) throw error;
          processed++;
        } catch (e) {
          failed++;
          errors.push(e instanceof Error ? e.message : String(e));
        }
      }

      const status = failed === 0 ? (processed ? "success" : "skipped") : processed ? "partial" : "failed";

      await supabase.from("data_sources").update({
        last_sync_at: new Date().toISOString(),
        sync_status: status,
        records_synced: (source.records_synced ?? 0) + processed,
        error_message: errors.length ? errors.slice(0, 3).join("; ") : null,
      }).eq("id", source.id);

      await supabase.from("sync_log").insert({
        data_source_id: source.id,
        sync_type: "inbound",
        target_system: "kri_observations",
        records_processed: processed,
        records_failed: failed,
        status,
        error_details: errors.length ? { errors } : null,
        started_at: started,
        completed_at: new Date().toISOString(),
      });

      summary.push({ source: source.name, processed, failed, status });
    }

    return new Response(JSON.stringify({ ok: true, sources: summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
