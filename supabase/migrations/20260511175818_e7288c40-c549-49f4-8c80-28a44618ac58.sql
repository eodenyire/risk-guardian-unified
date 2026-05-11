CREATE TABLE public.controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  risk_type_id UUID REFERENCES public.risk_types(id) ON DELETE SET NULL,
  control_type TEXT NOT NULL DEFAULT 'preventive',
  frequency TEXT NOT NULL DEFAULT 'monthly',
  owner TEXT,
  effectiveness TEXT NOT NULL DEFAULT 'effective',
  status TEXT NOT NULL DEFAULT 'active',
  source TEXT NOT NULL DEFAULT 'manual',
  last_tested_at TIMESTAMPTZ,
  next_test_due TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.controls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read controls" ON public.controls FOR SELECT USING (true);
CREATE POLICY "Allow public insert controls" ON public.controls FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update controls" ON public.controls FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete controls" ON public.controls FOR DELETE USING (true);

CREATE TRIGGER trg_controls_updated_at
BEFORE UPDATE ON public.controls
FOR EACH ROW EXECUTE FUNCTION public.update_kri_updated_at();

CREATE TABLE public.rcsa_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  business_unit TEXT NOT NULL,
  period TEXT NOT NULL,
  risk_type_id UUID REFERENCES public.risk_types(id) ON DELETE SET NULL,
  inherent_score INTEGER NOT NULL DEFAULT 0,
  control_score INTEGER NOT NULL DEFAULT 0,
  residual_score INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  assessor TEXT,
  approver TEXT,
  due_date DATE,
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rcsa_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read rcsa" ON public.rcsa_assessments FOR SELECT USING (true);
CREATE POLICY "Allow public insert rcsa" ON public.rcsa_assessments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update rcsa" ON public.rcsa_assessments FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete rcsa" ON public.rcsa_assessments FOR DELETE USING (true);

CREATE TRIGGER trg_rcsa_updated_at
BEFORE UPDATE ON public.rcsa_assessments
FOR EACH ROW EXECUTE FUNCTION public.update_kri_updated_at();

CREATE INDEX idx_controls_risk_type ON public.controls(risk_type_id);
CREATE INDEX idx_rcsa_risk_type ON public.rcsa_assessments(risk_type_id);
CREATE INDEX idx_rcsa_status ON public.rcsa_assessments(status);

ALTER TABLE public.data_sources ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.data_sources ADD COLUMN IF NOT EXISTS location TEXT;

CREATE POLICY "Allow public insert data_sources" ON public.data_sources FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update data_sources" ON public.data_sources FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete data_sources" ON public.data_sources FOR DELETE USING (true);
