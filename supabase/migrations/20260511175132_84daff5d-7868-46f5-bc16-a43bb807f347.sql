CREATE TABLE public.kri_register (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_type_id UUID REFERENCES public.risk_types(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  metric_unit TEXT NOT NULL DEFAULT '%',
  current_value NUMERIC NOT NULL DEFAULT 0,
  green_threshold NUMERIC NOT NULL DEFAULT 0,
  amber_threshold NUMERIC NOT NULL DEFAULT 0,
  red_threshold NUMERIC NOT NULL DEFAULT 0,
  direction TEXT NOT NULL DEFAULT 'higher_is_worse',
  frequency TEXT NOT NULL DEFAULT 'monthly',
  owner TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'green',
  trend TEXT NOT NULL DEFAULT 'stable',
  last_measured_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.kri_register ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read kri_register" ON public.kri_register FOR SELECT USING (true);
CREATE POLICY "Allow public insert kri_register" ON public.kri_register FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update kri_register" ON public.kri_register FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete kri_register" ON public.kri_register FOR DELETE USING (true);

CREATE OR REPLACE FUNCTION public.update_kri_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_kri_register_updated_at
BEFORE UPDATE ON public.kri_register
FOR EACH ROW EXECUTE FUNCTION public.update_kri_updated_at();

CREATE INDEX idx_kri_register_status ON public.kri_register(status);
CREATE INDEX idx_kri_register_risk_type ON public.kri_register(risk_type_id);
