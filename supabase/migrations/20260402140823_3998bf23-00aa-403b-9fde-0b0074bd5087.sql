
-- Risk Types (17 PRTs)
CREATE TABLE public.risk_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  risk_level TEXT NOT NULL DEFAULT 'medium',
  risk_score INTEGER NOT NULL DEFAULT 50,
  trend TEXT NOT NULL DEFAULT 'stable',
  owner TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Risk Register
CREATE TABLE public.risk_register (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_type_id UUID REFERENCES public.risk_types(id),
  title TEXT NOT NULL,
  description TEXT,
  risk_level TEXT NOT NULL DEFAULT 'medium',
  likelihood INTEGER NOT NULL DEFAULT 3,
  impact INTEGER NOT NULL DEFAULT 3,
  risk_score INTEGER GENERATED ALWAYS AS (likelihood * impact) STORED,
  source TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'open',
  owner TEXT,
  mitigation TEXT,
  residual_risk_level TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Data Sources
CREATE TABLE public.data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  connection_config JSONB NOT NULL DEFAULT '{}',
  integration_status TEXT NOT NULL DEFAULT 'disconnected',
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT NOT NULL DEFAULT 'never',
  records_synced INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sync Log
CREATE TABLE public.sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_source_id UUID REFERENCES public.data_sources(id),
  sync_type TEXT NOT NULL DEFAULT 'full',
  target_system TEXT,
  records_processed INTEGER NOT NULL DEFAULT 0,
  records_failed INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  error_details JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Allow public read for now (no auth yet)
ALTER TABLE public.risk_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read risk_types" ON public.risk_types FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public read risk_register" ON public.risk_register FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public insert risk_register" ON public.risk_register FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow public update risk_register" ON public.risk_register FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete risk_register" ON public.risk_register FOR DELETE TO anon, authenticated USING (true);
CREATE POLICY "Allow public read data_sources" ON public.data_sources FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public read sync_log" ON public.sync_log FOR SELECT TO anon, authenticated USING (true);
