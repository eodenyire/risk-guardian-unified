CREATE TABLE public.data_source_credentials (
  data_source_id uuid PRIMARY KEY REFERENCES public.data_sources(id) ON DELETE CASCADE,
  auth_type text NOT NULL DEFAULT 'none',
  secret jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.data_source_credentials TO service_role;
ALTER TABLE public.data_source_credentials ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.risk_insight_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid DEFAULT auth.uid(),
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, DELETE ON public.risk_insight_runs TO authenticated;
GRANT ALL ON public.risk_insight_runs TO service_role;
ALTER TABLE public.risk_insight_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read insight runs" ON public.risk_insight_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owners delete insight runs" ON public.risk_insight_runs FOR DELETE TO authenticated USING (created_by = auth.uid());