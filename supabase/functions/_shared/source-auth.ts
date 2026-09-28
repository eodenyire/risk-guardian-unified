// deno-lint-ignore-file no-explicit-any
export interface Credentials {
  auth_type: "none" | "basic" | "bearer" | "api_key";
  secret: { username?: string; password?: string; token?: string; header_name?: string };
}

export async function loadCredentials(supabase: any, dataSourceId: string): Promise<Credentials> {
  const { data } = await supabase
    .from("data_source_credentials")
    .select("auth_type, secret")
    .eq("data_source_id", dataSourceId)
    .maybeSingle();
  return (data as Credentials) ?? { auth_type: "none", secret: {} };
}

export function authHeaders(c: Credentials): Record<string, string> {
  const s = c.secret ?? {};
  switch (c.auth_type) {
    case "basic":
      return { Authorization: `Basic ${btoa(`${s.username ?? ""}:${s.password ?? ""}`)}` };
    case "bearer":
      return { Authorization: `Bearer ${s.token ?? ""}` };
    case "api_key":
      return { [s.header_name || "x-api-key"]: s.token ?? "" };
    default:
      return {};
  }
}

export const json = (body: unknown, status = 200, cors: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
