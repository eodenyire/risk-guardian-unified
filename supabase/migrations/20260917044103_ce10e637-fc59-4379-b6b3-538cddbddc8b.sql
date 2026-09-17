CREATE TABLE public.prt_gap_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_type_id uuid NOT NULL REFERENCES public.risk_types(id) ON DELETE CASCADE,
  as_of_date date NOT NULL DEFAULT current_date,
  dimension text NOT NULL DEFAULT 'maturity',
  bucket text NOT NULL,
  bucket_order integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'KES',
  exposure numeric NOT NULL DEFAULT 0,
  offset_amount numeric NOT NULL DEFAULT 0,
  limit_value numeric,
  notes text,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prt_gap_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prt_gap_entries TO anon;
GRANT ALL ON public.prt_gap_entries TO service_role;

ALTER TABLE public.prt_gap_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read prt_gap_entries" ON public.prt_gap_entries FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public insert prt_gap_entries" ON public.prt_gap_entries FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow public update prt_gap_entries" ON public.prt_gap_entries FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete prt_gap_entries" ON public.prt_gap_entries FOR DELETE TO anon, authenticated USING (true);

CREATE TRIGGER update_prt_gap_entries_updated_at BEFORE UPDATE ON public.prt_gap_entries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_prt_gap_entries_risk_type ON public.prt_gap_entries(risk_type_id, dimension, bucket_order);

-- Credit risk: IFRS 9 staging ladder (KES millions)
INSERT INTO public.prt_gap_entries (risk_type_id, dimension, bucket, bucket_order, exposure, offset_amount, limit_value, notes, source)
SELECT id, 'stage', b.bucket, b.ord, b.exp, b.off, b.lim, b.note, 'seed'
FROM public.risk_types, (VALUES
  ('Stage 1 — Performing', 1, 412000, 3300, 450000, 'ECL 12-month provision'),
  ('Stage 2 — Significant increase', 2, 58400, 4700, 60000, 'Lifetime ECL, not impaired'),
  ('Stage 3 — Credit impaired', 3, 31200, 17900, 28000, 'NPL book, lifetime ECL'),
  ('Watchlist / early warning', 4, 19600, 900, 25000, 'Pre-Stage 2 monitoring')
) AS b(bucket, ord, exp, off, lim, note)
WHERE code = 'CR';

-- Market risk: VaR utilisation by trading desk
INSERT INTO public.prt_gap_entries (risk_type_id, dimension, bucket, bucket_order, exposure, offset_amount, limit_value, notes, source)
SELECT id, 'desk', b.bucket, b.ord, b.exp, b.off, b.lim, b.note, 'seed'
FROM public.risk_types, (VALUES
  ('FX Trading', 1, 186, 42, 250, '1-day 99% VaR'),
  ('Fixed Income', 2, 312, 88, 400, '1-day 99% VaR'),
  ('Equities', 3, 74, 15, 120, '1-day 99% VaR'),
  ('Derivatives', 4, 141, 51, 150, '1-day 99% VaR'),
  ('Money Market', 5, 63, 9, 150, '1-day 99% VaR')
) AS b(bucket, ord, exp, off, lim, note)
WHERE code = 'MR';

-- Liquidity risk: contractual maturity ladder
INSERT INTO public.prt_gap_entries (risk_type_id, dimension, bucket, bucket_order, exposure, offset_amount, limit_value, notes, source)
SELECT id, 'maturity', b.bucket, b.ord, b.exp, b.off, b.lim, b.note, 'seed'
FROM public.risk_types, (VALUES
  ('Overnight', 1, 96000, 78000, -20000, 'Cash inflows vs outflows'),
  ('2-7 days', 2, 42000, 51000, -20000, 'Cash inflows vs outflows'),
  ('8-30 days', 3, 68000, 74500, -25000, 'Cash inflows vs outflows'),
  ('1-3 months', 4, 88000, 96000, -30000, 'Cash inflows vs outflows'),
  ('3-6 months', 5, 74000, 61000, -30000, 'Cash inflows vs outflows'),
  ('6-12 months', 6, 92000, 58000, -35000, 'Cash inflows vs outflows'),
  ('1-5 years', 7, 148000, 82000, -50000, 'Cash inflows vs outflows'),
  ('Over 5 years', 8, 96000, 204000, -120000, 'Cash inflows vs outflows')
) AS b(bucket, ord, exp, off, lim, note)
WHERE code = 'LR';

-- Operational risk: loss events by Basel event type
INSERT INTO public.prt_gap_entries (risk_type_id, dimension, bucket, bucket_order, exposure, offset_amount, limit_value, notes, source)
SELECT id, 'band', b.bucket, b.ord, b.exp, b.off, b.lim, b.note, 'seed'
FROM public.risk_types, (VALUES
  ('Internal fraud', 1, 128, 46, 150, 'Gross loss YTD vs recoveries'),
  ('External fraud', 2, 412, 137, 400, 'Gross loss YTD vs recoveries'),
  ('Execution & process failure', 3, 286, 92, 300, 'Gross loss YTD vs recoveries'),
  ('Business disruption', 4, 94, 21, 120, 'Gross loss YTD vs recoveries'),
  ('Clients, products & practices', 5, 176, 38, 200, 'Gross loss YTD vs recoveries')
) AS b(bucket, ord, exp, off, lim, note)
WHERE code = 'OR';

-- Capital adequacy: RWA composition
INSERT INTO public.prt_gap_entries (risk_type_id, dimension, bucket, bucket_order, exposure, offset_amount, limit_value, notes, source)
SELECT id, 'band', b.bucket, b.ord, b.exp, b.off, b.lim, b.note, 'seed'
FROM public.risk_types, (VALUES
  ('Credit RWA', 1, 386000, 0, 420000, 'Risk weighted assets'),
  ('Market RWA', 2, 42000, 0, 55000, 'Risk weighted assets'),
  ('Operational RWA', 3, 61000, 0, 70000, 'Risk weighted assets')
) AS b(bucket, ord, exp, off, lim, note)
WHERE code = 'CAP';