// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { authHeaders, json, loadCredentials } from "../_shared/source-auth.ts";

/**
 * Bi-directional sync of mapped KRI data with ServiceNow and Smartsheet.
 * Body: { data_source_id, direction: "push" | "pull" }
 *
 * connection_config:
 *  kri_mappings: [{ kri_id, external_ref }]          // record number / row key
 *  sync: {
 *    // ServiceNow
 *    table: "sn_grc_indicator", key_field: "number", value_field: "u_value",
 *    // Smartsheet
 *    sheet_id: "123", key_column: "KRI", value_column: "Value",
 *    status_column: "Status", date_column: "Measured"
 *  }
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  const { data: userData } = await supabase.auth.getUser(token ?? "");
  if (!userData?.user) return json({ ok: false, error: "Sign in required" }, 401, corsHeaders);

  const started = new Date().toISOString();
  let sourceId: string | null = null;
  let direction = "push";
  const errors: { ref: string; error: string }[] = [];
  let processed = 0;

  try {
    const body = await req.json();
    sourceId = body.data_source_id;
    direction = body.direction === "pull" ? "pull" : "push";
    const { data: src, error } = await supabase.from("data_sources").select("*").eq("id", sourceId).single();
    if (error) throw error;
    if (!["servicenow", "smartsheets"].includes(src.source_type)) throw new Error("Only ServiceNow and Smartsheet sources can sync");

    const cfg = (src.connection_config ?? {}) as any;
    const sync = cfg.sync ?? {};
    const mappings: { kri_id: string; external_ref?: string }[] = cfg.kri_mappings ?? [];
    if (!mappings.length) throw new Error("No indicator mappings configured");

    const creds = await loadCredentials(supabase, src.id);
    const kriIds = mappings.map((m) => m.kri_id);
    const { data: kris } = await supabase.from("kri_register").select("id,name,current_value,status,last_measured_at,metric_unit").in("id", kriIds);
    const kriById = new Map((kris ?? []).map((k: any) => [k.id, k]));

    const insertObs = async (kriId: string, value: number, ref: string) => {
      const { error: e } = await supabase.from("kri_observations").insert({
        kri_id: kriId, value, observed_at: new Date().toISOString(), source: src.name,
        notes: `Pulled from ${src.source_type} (${ref})`,
      });
      if (e) throw e;
    };

    if (src.source_type === "servicenow") {
      const base = String(src.location ?? "").replace(/\/+$/, "");
      const table = sync.table || "sn_grc_indicator";
      const keyField = sync.key_field || "number";
      const valueField = sync.value_field || "u_value";
      const headers = { ...authHeaders(creds), Accept: "application/json", "Content-Type": "application/json" };

      for (const m of mappings) {
        const k: any = kriById.get(m.kri_id);
        const ref = m.external_ref || k?.name || m.kri_id;
        try {
          const q = `${base}/api/now/table/${table}?sysparm_limit=1&sysparm_query=${encodeURIComponent(`${keyField}=${ref}`)}`;
          const found = await fetch(q, { headers });
          if (!found.ok) throw new Error(`Lookup HTTP ${found.status}: ${(await found.text()).slice(0, 150)}`);
          const rec = (await found.json()).result?.[0];

          if (direction === "pull") {
            if (!rec) throw new Error("Record not found");
            const v = Number(rec[valueField]);
            if (!Number.isFinite(v)) throw new Error(`Field ${valueField} is not numeric`);
            await insertObs(m.kri_id, v, ref);
          } else {
            if (!k) throw new Error("KRI not found locally");
            const payload: Record<string, unknown> = {
              [keyField]: ref, [valueField]: k.current_value,
              u_status: k.status, u_measured_at: k.last_measured_at, short_description: k.name,
            };
            const res = rec
              ? await fetch(`${base}/api/now/table/${table}/${rec.sys_id}`, { method: "PATCH", headers, body: JSON.stringify(payload) })
              : await fetch(`${base}/api/now/table/${table}`, { method: "POST", headers, body: JSON.stringify(payload) });
            if (!res.ok) throw new Error(`Write HTTP ${res.status}: ${(await res.text()).slice(0, 150)}`);
          }
          processed++;
        } catch (e) {
          errors.push({ ref, error: e instanceof Error ? e.message : String(e) });
        }
      }
    } else {
      const sheetId = sync.sheet_id;
      if (!sheetId) throw new Error("Smartsheet sheet_id is not configured");
      const headers = { ...authHeaders({ ...creds, auth_type: creds.auth_type === "none" ? "bearer" : creds.auth_type }), "Content-Type": "application/json" };
      const sheetRes = await fetch(`https://api.smartsheet.com/2.0/sheets/${sheetId}`, { headers });
      if (!sheetRes.ok) throw new Error(`Sheet HTTP ${sheetRes.status}: ${(await sheetRes.text()).slice(0, 150)}`);
      const sheet = await sheetRes.json();
      const colId = (title: string) => sheet.columns?.find((c: any) => String(c.title).toLowerCase() === String(title).toLowerCase())?.id;
      const keyCol = colId(sync.key_column || "KRI");
      const valCol = colId(sync.value_column || "Value");
      const statusCol = colId(sync.status_column || "Status");
      const dateCol = colId(sync.date_column || "Measured");
      if (!keyCol || !valCol) throw new Error("Key or value column not found in sheet");

      const rowByKey = new Map<string, any>();
      for (const r of sheet.rows ?? []) {
        const cell = r.cells?.find((c: any) => c.columnId === keyCol);
        if (cell?.value != null) rowByKey.set(String(cell.value).trim().toLowerCase(), r);
      }

      const toAdd: any[] = [];
      const toUpdate: any[] = [];
      for (const m of mappings) {
        const k: any = kriById.get(m.kri_id);
        const ref = m.external_ref || k?.name || m.kri_id;
        try {
          const row = rowByKey.get(ref.trim().toLowerCase());
          if (direction === "pull") {
            if (!row) throw new Error("Row not found");
            const v = Number(row.cells?.find((c: any) => c.columnId === valCol)?.value);
            if (!Number.isFinite(v)) throw new Error("Value cell is not numeric");
            await insertObs(m.kri_id, v, ref);
            processed++;
          } else {
            if (!k) throw new Error("KRI not found locally");
            const cells: any[] = [{ columnId: keyCol, value: ref }, { columnId: valCol, value: k.current_value }];
            if (statusCol) cells.push({ columnId: statusCol, value: k.status });
            if (dateCol && k.last_measured_at) cells.push({ columnId: dateCol, value: k.last_measured_at.slice(0, 10) });
            if (row) toUpdate.push({ id: row.id, cells }); else toAdd.push({ toBottom: true, cells });
          }
        } catch (e) {
          errors.push({ ref, error: e instanceof Error ? e.message : String(e) });
        }
      }
      for (const [method, rows] of [["PUT", toUpdate], ["POST", toAdd]] as const) {
        if (!rows.length) continue;
        const res = await fetch(`https://api.smartsheet.com/2.0/sheets/${sheetId}/rows`, { method, headers, body: JSON.stringify(rows) });
        if (res.ok) processed += rows.length;
        else errors.push({ ref: `${rows.length} row(s)`, error: `${method} HTTP ${res.status}: ${(await res.text()).slice(0, 150)}` });
      }
    }

    const status = errors.length === 0 ? "success" : processed ? "partial" : "failed";
    await supabase.from("data_sources").update({
      last_sync_at: new Date().toISOString(), sync_status: status,
      records_synced: (src.records_synced ?? 0) + processed,
      integration_status: status === "failed" ? "error" : "connected",
      error_message: errors.length ? errors.slice(0, 3).map((e) => `${e.ref}: ${e.error}`).join("; ") : null,
    }).eq("id", src.id);
    await supabase.from("sync_log").insert({
      data_source_id: src.id, sync_type: direction === "pull" ? "inbound" : "outbound",
      target_system: src.source_type, records_processed: processed, records_failed: errors.length,
      status, error_details: errors.length ? { errors } : null, started_at: started, completed_at: new Date().toISOString(),
    });
    return json({ ok: status !== "failed", status, processed, errors }, 200, corsHeaders);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (sourceId) {
      await supabase.from("data_sources").update({ sync_status: "failed", error_message: msg }).eq("id", sourceId);
      await supabase.from("sync_log").insert({
        data_source_id: sourceId, sync_type: direction === "pull" ? "inbound" : "outbound",
        records_processed: processed, records_failed: 1, status: "failed",
        error_details: { errors: [{ ref: "sync", error: msg }] }, started_at: started, completed_at: new Date().toISOString(),
      });
    }
    return json({ ok: false, error: msg }, 200, corsHeaders);
  }
});
