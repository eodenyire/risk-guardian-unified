-- 1. Extend risk_types into Principal Risk Types
ALTER TABLE public.risk_types
  ADD COLUMN IF NOT EXISTS prt_category text NOT NULL DEFAULT 'non_financial',
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 100;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.risk_types TO anon, authenticated;
GRANT ALL ON public.risk_types TO service_role;

DROP POLICY IF EXISTS "Allow public insert risk_types" ON public.risk_types;
DROP POLICY IF EXISTS "Allow public update risk_types" ON public.risk_types;
DROP POLICY IF EXISTS "Allow public delete risk_types" ON public.risk_types;
CREATE POLICY "Allow public insert risk_types" ON public.risk_types FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow public update risk_types" ON public.risk_types FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete risk_types" ON public.risk_types FOR DELETE TO anon, authenticated USING (true);

-- 2. Risk Sub Types
CREATE TABLE IF NOT EXISTS public.risk_sub_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_type_id uuid NOT NULL REFERENCES public.risk_types(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  description text,
  owner text,
  inherent_rating text NOT NULL DEFAULT 'medium',
  residual_rating text,
  status text NOT NULL DEFAULT 'active',
  display_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.risk_sub_types TO anon, authenticated;
GRANT ALL ON public.risk_sub_types TO service_role;
ALTER TABLE public.risk_sub_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read risk_sub_types" ON public.risk_sub_types FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public insert risk_sub_types" ON public.risk_sub_types FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow public update risk_sub_types" ON public.risk_sub_types FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete risk_sub_types" ON public.risk_sub_types FOR DELETE TO anon, authenticated USING (true);
CREATE TRIGGER trg_risk_sub_types_updated BEFORE UPDATE ON public.risk_sub_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. KRI -> sub type linkage
ALTER TABLE public.kri_register
  ADD COLUMN IF NOT EXISTS risk_sub_type_id uuid REFERENCES public.risk_sub_types(id) ON DELETE SET NULL;

-- 4. Risk Appetite
CREATE TABLE IF NOT EXISTS public.risk_appetite (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_type_id uuid REFERENCES public.risk_types(id) ON DELETE CASCADE,
  risk_sub_type_id uuid REFERENCES public.risk_sub_types(id) ON DELETE CASCADE,
  statement text NOT NULL,
  appetite_level text NOT NULL DEFAULT 'moderate',
  tolerance_limit numeric,
  metric_unit text DEFAULT '%',
  escalation_trigger text,
  approved_by text,
  approved_at timestamptz,
  review_frequency text NOT NULL DEFAULT 'annual',
  next_review_date date,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.risk_appetite TO anon, authenticated;
GRANT ALL ON public.risk_appetite TO service_role;
ALTER TABLE public.risk_appetite ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read risk_appetite" ON public.risk_appetite FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public insert risk_appetite" ON public.risk_appetite FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow public update risk_appetite" ON public.risk_appetite FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete risk_appetite" ON public.risk_appetite FOR DELETE TO anon, authenticated USING (true);
CREATE TRIGGER trg_risk_appetite_updated BEFORE UPDATE ON public.risk_appetite FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. RAG evaluation helper
CREATE OR REPLACE FUNCTION public.evaluate_rag(
  _value numeric, _green numeric, _amber numeric, _red numeric, _direction text
) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN _direction = 'lower_is_worse' THEN
      CASE WHEN _value <= _red THEN 'red'
           WHEN _value <= _amber THEN 'amber'
           ELSE 'green' END
    ELSE
      CASE WHEN _value >= _red THEN 'red'
           WHEN _value >= _amber THEN 'amber'
           ELSE 'green' END
  END;
$$;

-- 6. KRI observations time-series
CREATE TABLE IF NOT EXISTS public.kri_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kri_id uuid NOT NULL REFERENCES public.kri_register(id) ON DELETE CASCADE,
  observed_at timestamptz NOT NULL DEFAULT now(),
  value numeric NOT NULL,
  rag text,
  source text NOT NULL DEFAULT 'manual',
  notes text,
  breached boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_kri_observations_kri_time ON public.kri_observations (kri_id, observed_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kri_observations TO anon, authenticated;
GRANT ALL ON public.kri_observations TO service_role;
ALTER TABLE public.kri_observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read kri_observations" ON public.kri_observations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public insert kri_observations" ON public.kri_observations FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow public update kri_observations" ON public.kri_observations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete kri_observations" ON public.kri_observations FOR DELETE TO anon, authenticated USING (true);

-- 7. Auto-score observation + roll up to kri_register
CREATE OR REPLACE FUNCTION public.score_kri_observation()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE k RECORD; prev numeric; new_trend text;
BEGIN
  SELECT * INTO k FROM public.kri_register WHERE id = NEW.kri_id;
  IF k IS NULL THEN RETURN NEW; END IF;

  NEW.rag := public.evaluate_rag(NEW.value, k.green_threshold, k.amber_threshold, k.red_threshold, k.direction);
  NEW.breached := NEW.rag IN ('amber','red');

  SELECT value INTO prev FROM public.kri_observations
   WHERE kri_id = NEW.kri_id AND observed_at < NEW.observed_at
   ORDER BY observed_at DESC LIMIT 1;

  IF prev IS NULL OR prev = NEW.value THEN new_trend := 'stable';
  ELSIF NEW.value > prev THEN new_trend := CASE WHEN k.direction = 'lower_is_worse' THEN 'improving' ELSE 'worsening' END;
  ELSE new_trend := CASE WHEN k.direction = 'lower_is_worse' THEN 'worsening' ELSE 'improving' END;
  END IF;

  IF NEW.observed_at >= COALESCE(k.last_measured_at, '-infinity'::timestamptz) THEN
    UPDATE public.kri_register
       SET current_value = NEW.value,
           last_measured_at = NEW.observed_at,
           status = NEW.rag,
           trend = new_trend,
           updated_at = now()
     WHERE id = NEW.kri_id;
  END IF;

  RETURN NEW;
END; $$;

CREATE TRIGGER trg_score_kri_observation
BEFORE INSERT ON public.kri_observations
FOR EACH ROW EXECUTE FUNCTION public.score_kri_observation();

-- 8. Risk contagion / interconnectedness
CREATE TABLE IF NOT EXISTS public.risk_contagion_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_risk_type_id uuid NOT NULL REFERENCES public.risk_types(id) ON DELETE CASCADE,
  target_risk_type_id uuid NOT NULL REFERENCES public.risk_types(id) ON DELETE CASCADE,
  strength numeric NOT NULL DEFAULT 0.5,
  lag_days integer NOT NULL DEFAULT 0,
  direction text NOT NULL DEFAULT 'positive',
  method text NOT NULL DEFAULT 'manual',
  confidence numeric,
  rationale text,
  last_evaluated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_risk_type_id, target_risk_type_id, method)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.risk_contagion_links TO anon, authenticated;
GRANT ALL ON public.risk_contagion_links TO service_role;
ALTER TABLE public.risk_contagion_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read contagion" ON public.risk_contagion_links FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public insert contagion" ON public.risk_contagion_links FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow public update contagion" ON public.risk_contagion_links FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete contagion" ON public.risk_contagion_links FOR DELETE TO anon, authenticated USING (true);
CREATE TRIGGER trg_contagion_updated BEFORE UPDATE ON public.risk_contagion_links FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();