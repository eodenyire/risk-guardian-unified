ALTER TABLE public.risk_contagion_links
  ADD COLUMN IF NOT EXISTS transmission_channel text NOT NULL DEFAULT 'operational',
  ADD COLUMN IF NOT EXISTS process text,
  ADD COLUMN IF NOT EXISTS inherent_score numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS residual_score numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weight numeric NOT NULL DEFAULT 1;