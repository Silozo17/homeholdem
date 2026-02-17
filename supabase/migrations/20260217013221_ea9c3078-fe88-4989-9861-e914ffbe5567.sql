
-- player_xp table
CREATE TABLE public.player_xp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_xp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT player_xp_user_id_unique UNIQUE (user_id)
);

ALTER TABLE public.player_xp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read player_xp"
  ON public.player_xp FOR SELECT
  USING (true);

-- xp_events audit log
CREATE TABLE public.xp_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  xp_amount integer NOT NULL,
  reason text NOT NULL,
  reference_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own xp_events"
  ON public.xp_events FOR SELECT
  USING (auth.uid() = user_id);

-- Trigger function: on xp_events insert, upsert player_xp and recalculate level
CREATE OR REPLACE FUNCTION public.update_player_xp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _new_total integer;
  _new_level integer;
BEGIN
  INSERT INTO public.player_xp (user_id, total_xp, level, updated_at)
  VALUES (NEW.user_id, NEW.xp_amount, 1, now())
  ON CONFLICT (user_id) DO UPDATE
    SET total_xp = player_xp.total_xp + NEW.xp_amount,
        updated_at = now();

  SELECT total_xp INTO _new_total FROM public.player_xp WHERE user_id = NEW.user_id;
  _new_level := floor(sqrt(_new_total::numeric / 100)) + 1;

  UPDATE public.player_xp SET level = _new_level WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_player_xp
  AFTER INSERT ON public.xp_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_player_xp();

-- Enable realtime on player_xp
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_xp;
