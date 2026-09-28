import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { json } from "../_shared/source-auth.ts";
import { createResponsesCall } from "../_shared/responses.ts";

const cors = { ...corsHeaders, "Access-Control-Expose-Headers": "X-Lovable-AIG-Run-ID" };

const SYSTEM = `You are a senior bank risk analyst (Basel, CBK prudential guidelines, ISO 31000).
Given KRI observations and control details, identify EMERGING risk patterns (deteriorating trends,
threshold breaches, clusters across risk types, control weaknesses amplifying exposure, contagion)
and recommend prioritised follow-up actions.
Respond with ONLY a JSON object, no prose, no code fences, matching:
{"summary": string,
 "overall_rating": "low"|"moderate"|"high"|"critical",
 "patterns": [{"title": string, "severity": "low"|"medium"|"high"|"critical", "risk_types": string[], "evidence": string, "trend": "emerging"|"escalating"|"persistent"|"improving"}],
 "actions": [{"priority": number, "action": string, "owner": string, "due_in_days": number, "rationale": string, "linked_pattern": string}]}
Order actions by priority (1 = most urgent). Keep at most 6 patterns and 8 actions. Be specific and cite figures.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  const { data: userData } = await supabase.auth.getUser(token ?? "");
  if (!userData?.user) return json({ error: "Sign in required" }, 401, cors);

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return json({ error: "AI is not configured" }, 500, cors);

  try {
    const input = await req.json();
    const { observations = [], controls = [], context = "", include_register = true } = input ?? {};

    let register: unknown[] = [];
    let registerControls: unknown[] = [];
    if (include_register) {
      const [{ data: k }, { data: c }] = await Promise.all([
        supabase.from("kri_register").select("name,current_value,metric_unit,green_threshold,amber_threshold,red_threshold,direction,status,trend,last_measured_at,risk_types(name)").limit(120),
        supabase.from("controls").select("name,control_type,effectiveness,status,last_tested_at,next_test_due,risk_types(name)").limit(120),
      ]);
      register = k ?? [];
      registerControls = c ?? [];
    }

    const userPrompt = JSON.stringify({
      analyst_context: context,
      analyst_observations: observations,
      analyst_controls: controls,
      kri_register: register,
      control_library: registerControls,
      as_of: new Date().toISOString().slice(0, 10),
    });

    const { result, runIdFetch } = createResponsesCall(
      req,
      { baseURL: "https://ai.gateway.lovable.dev/v1", apiKey, model: "openai/gpt-6-astra" },
      [{ role: "system", content: SYSTEM }, { role: "user", content: userPrompt }],
    );

    let text: string;
    try {
      text = await result.text;
    } catch (e) {
      const status = (e as { statusCode?: number })?.statusCode ?? 500;
      const msg = status === 402 ? "AI credits are exhausted. Add credits in workspace billing to continue."
        : status === 429 ? "AI is busy right now. Please try again in a minute."
        : e instanceof Error ? e.message : "AI request failed";
      return json({ error: msg }, status, cors);
    }
    if (!text?.trim()) return json({ error: "The AI returned no analysis" }, 502, cors);

    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned.slice(cleaned.indexOf("{"), cleaned.lastIndexOf("}") + 1));
    } catch {
      return json({ error: "Could not read the AI analysis. Please try again." }, 502, cors);
    }

    const { data: saved } = await supabase.from("risk_insight_runs")
      .insert({ created_by: userData.user.id, input: { observations, controls, context }, result: parsed })
      .select("id, created_at").single();

    const headers: Record<string, string> = { ...cors, "Content-Type": "application/json" };
    const runId = runIdFetch.getRunId();
    if (runId) headers["X-Lovable-AIG-Run-ID"] = runId;
    return new Response(JSON.stringify({ result: parsed, run: saved }), { headers });
  } catch (e) {
    if ((e as Error)?.name === "AbortError") return json({ error: "Cancelled" }, 499, cors);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500, cors);
  }
});
