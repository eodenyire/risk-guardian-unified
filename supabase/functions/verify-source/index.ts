import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { authHeaders, json, loadCredentials, type Credentials } from "../_shared/source-auth.ts";

/**
 * Saves (optionally) a data source's credentials into the locked credentials
 * store and verifies connectivity. Credentials are never returned to the client.
 * Body: { data_source_id, credentials?: Credentials, verify?: boolean }
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Require a signed-in user
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  const { data: userData } = await supabase.auth.getUser(token ?? "");
  if (!userData?.user) return json({ ok: false, error: "Sign in required" }, 401, corsHeaders);

  try {
    const { data_source_id, credentials, verify = true } = await req.json();
    if (!data_source_id) return json({ ok: false, error: "data_source_id is required" }, 400, corsHeaders);

    if (credentials) {
      const c = credentials as Credentials;
      const { error } = await supabase.from("data_source_credentials").upsert({
        data_source_id, auth_type: c.auth_type ?? "none", secret: c.secret ?? {}, updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    }
    if (!verify) return json({ ok: true, saved: true }, 200, corsHeaders);

    const { data: src, error: srcErr } = await supabase.from("data_sources").select("*").eq("id", data_source_id).single();
    if (srcErr) throw srcErr;
    const creds = await loadCredentials(supabase, data_source_id);
    const cfg = (src.connection_config ?? {}) as Record<string, unknown>;
    const loc = String(src.location ?? cfg.base_url ?? "").replace(/\/+$/, "");
    const started = new Date().toISOString();
    const checks: { step: string; ok: boolean; detail: string }[] = [];

    const probe = async (step: string, url: string, headers: Record<string, string>) => {
      try {
        const res = await fetch(url, { headers: { Accept: "application/json", ...headers } });
        const ok = res.ok;
        const detail = ok ? `HTTP ${res.status}` : `HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`;
        checks.push({ step, ok, detail });
      } catch (e) {
        checks.push({ step, ok: false, detail: e instanceof Error ? e.message : String(e) });
      }
    };

    switch (src.source_type) {
      case "servicenow":
        if (!loc.startsWith("https://")) checks.push({ step: "Instance URL", ok: false, detail: "Location must be the instance URL, e.g. https://acme.service-now.com" });
        else await probe("ServiceNow authentication", `${loc}/api/now/table/sys_user?sysparm_limit=1&sysparm_fields=sys_id`, authHeaders(creds));
        break;
      case "smartsheets": {
        await probe("Smartsheet authentication", "https://api.smartsheet.com/2.0/users/me", authHeaders({ ...creds, auth_type: creds.auth_type === "none" ? "bearer" : creds.auth_type }));
        const sheetId = (cfg.sync as Record<string, unknown> | undefined)?.sheet_id;
        if (sheetId) await probe("Sheet access", `https://api.smartsheet.com/2.0/sheets/${sheetId}?pageSize=1`, authHeaders({ ...creds, auth_type: "bearer" }));
        break;
      }
      case "linux_share":
      case "windows_share":
        checks.push({ step: "Network reachability", ok: false, detail: "Internal file shares are not reachable from the cloud. Use Import Excel/CSV or expose the file through an API/SharePoint link." });
        break;
      default:
        if (!/^https?:\/\//.test(loc)) checks.push({ step: "Location", ok: false, detail: "Location must be an http(s) URL" });
        else await probe("Endpoint reachable", loc, { ...((cfg.headers as Record<string, string>) ?? {}), ...authHeaders(creds) });
    }

    const mappings = (cfg.kri_mappings as unknown[] | undefined) ?? [];
    checks.push({ step: "Indicator mappings", ok: mappings.length > 0, detail: mappings.length ? `${mappings.length} indicator(s) mapped` : "No indicators mapped yet" });

    const connOk = checks.filter((c) => c.step !== "Indicator mappings").every((c) => c.ok);
    const errMsg = connOk ? null : checks.filter((c) => !c.ok).map((c) => `${c.step}: ${c.detail}`).join("; ");

    await supabase.from("data_sources").update({
      integration_status: connOk ? "connected" : "error",
      error_message: errMsg,
    }).eq("id", data_source_id);
    await supabase.from("sync_log").insert({
      data_source_id, sync_type: "verify", target_system: src.source_type,
      records_processed: 0, records_failed: connOk ? 0 : 1, status: connOk ? "success" : "failed",
      error_details: connOk ? null : { checks }, started_at: started, completed_at: new Date().toISOString(),
    });

    return json({ ok: connOk, checks }, 200, corsHeaders);
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500, corsHeaders);
  }
});
