
CREATE TABLE public.poker_table_watchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid NOT NULL REFERENCES poker_tables(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(table_id, user_id)
);

ALTER TABLE public.poker_table_watchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own watches"
  ON public.poker_table_watchers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add watches"
  ON public.poker_table_watchers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove watches"
  ON public.poker_table_watchers FOR DELETE
  USING (auth.uid() = user_id);
