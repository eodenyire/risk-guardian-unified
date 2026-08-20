CREATE TABLE public.irrbb_gap_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  as_of_date date NOT NULL DEFAULT CURRENT_DATE,
  currency text NOT NULL DEFAULT 'KES',
  bucket text NOT NULL,
  bucket_order integer NOT NULL DEFAULT 0,
  rate_sensitive_assets numeric NOT NULL DEFAULT 0,
  rate_sensitive_liabilities numeric NOT NULL DEFAULT 0,
  off_balance_sheet numeric NOT NULL DEFAULT 0,
  notes text,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.irrbb_gap_entries TO anon, authenticated;
GRANT ALL ON public.irrbb_gap_entries TO service_role;
ALTER TABLE public.irrbb_gap_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read irrbb_gap_entries" ON public.irrbb_gap_entries FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public insert irrbb_gap_entries" ON public.irrbb_gap_entries FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow public update irrbb_gap_entries" ON public.irrbb_gap_entries FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete irrbb_gap_entries" ON public.irrbb_gap_entries FOR DELETE TO anon, authenticated USING (true);
CREATE TRIGGER trg_irrbb_gap_updated BEFORE UPDATE ON public.irrbb_gap_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.irrbb_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric text NOT NULL,
  scenario text NOT NULL DEFAULT 'parallel_up_200',
  basis text NOT NULL DEFAULT 'pct_tier1',
  currency text NOT NULL DEFAULT 'ALL',
  limit_value numeric NOT NULL DEFAULT 0,
  green_threshold numeric NOT NULL DEFAULT 0,
  amber_threshold numeric NOT NULL DEFAULT 0,
  red_threshold numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT '%',
  owner text,
  status text NOT NULL DEFAULT 'active',
  escalation text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.irrbb_limits TO anon, authenticated;
GRANT ALL ON public.irrbb_limits TO service_role;
ALTER TABLE public.irrbb_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read irrbb_limits" ON public.irrbb_limits FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public insert irrbb_limits" ON public.irrbb_limits FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow public update irrbb_limits" ON public.irrbb_limits FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete irrbb_limits" ON public.irrbb_limits FOR DELETE TO anon, authenticated USING (true);
CREATE TRIGGER trg_irrbb_limits_updated BEFORE UPDATE ON public.irrbb_limits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.irrbb_scenario_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  as_of_date date NOT NULL DEFAULT CURRENT_DATE,
  currency text NOT NULL DEFAULT 'KES',
  scenario text NOT NULL,
  delta_eve numeric NOT NULL DEFAULT 0,
  delta_nii numeric NOT NULL DEFAULT 0,
  eve_pct_tier1 numeric NOT NULL DEFAULT 0,
  nii_pct_income numeric NOT NULL DEFAULT 0,
  breached boolean NOT NULL DEFAULT false,
  notes text,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.irrbb_scenario_results TO anon, authenticated;
GRANT ALL ON public.irrbb_scenario_results TO service_role;
ALTER TABLE public.irrbb_scenario_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read irrbb_scenario_results" ON public.irrbb_scenario_results FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public insert irrbb_scenario_results" ON public.irrbb_scenario_results FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow public update irrbb_scenario_results" ON public.irrbb_scenario_results FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete irrbb_scenario_results" ON public.irrbb_scenario_results FOR DELETE TO anon, authenticated USING (true);
CREATE TRIGGER trg_irrbb_scenarios_updated BEFORE UPDATE ON public.irrbb_scenario_results FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();