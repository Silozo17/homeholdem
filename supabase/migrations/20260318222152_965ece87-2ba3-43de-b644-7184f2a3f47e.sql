
CREATE OR REPLACE FUNCTION public.promote_event_waitlist(_event_id UUID)
RETURNS SETOF UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_total_capacity INT;
  v_going_count INT;
  v_next RECORD;
  v_promoted UUID[] := '{}';
BEGIN
  -- Caller must be authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Caller must be a club member for this event
  IF NOT is_event_club_member(auth.uid(), _event_id) THEN
    RAISE EXCEPTION 'Not a club member for this event';
  END IF;

  -- Advisory lock per event to prevent races
  PERFORM pg_advisory_xact_lock(hashtext(_event_id::text));

  -- Get capacity
  SELECT (e.max_tables * e.seats_per_table)
  INTO v_total_capacity
  FROM events e
  WHERE e.id = _event_id;

  IF v_total_capacity IS NULL THEN
    RETURN;
  END IF;

  -- Loop: promote waitlisted users until full or none left
  LOOP
    -- Count current going (non-waitlisted)
    SELECT count(*) INTO v_going_count
    FROM event_rsvps
    WHERE event_id = _event_id
      AND status = 'going'
      AND is_waitlisted = false;

    IF v_going_count >= v_total_capacity THEN
      EXIT;
    END IF;

    -- Get next waitlisted user
    SELECT user_id, waitlist_position INTO v_next
    FROM event_rsvps
    WHERE event_id = _event_id
      AND status = 'going'
      AND is_waitlisted = true
    ORDER BY waitlist_position ASC NULLS LAST
    LIMIT 1;

    IF NOT FOUND THEN
      EXIT;
    END IF;

    -- Promote
    UPDATE event_rsvps
    SET is_waitlisted = false, waitlist_position = NULL
    WHERE event_id = _event_id AND user_id = v_next.user_id;

    v_promoted := array_append(v_promoted, v_next.user_id);
  END LOOP;

  -- Reindex remaining waitlist positions to 1..N
  WITH ranked AS (
    SELECT user_id, ROW_NUMBER() OVER (ORDER BY waitlist_position ASC NULLS LAST) AS new_pos
    FROM event_rsvps
    WHERE event_id = _event_id
      AND is_waitlisted = true
  )
  UPDATE event_rsvps er
  SET waitlist_position = ranked.new_pos
  FROM ranked
  WHERE er.event_id = _event_id AND er.user_id = ranked.user_id;

  RETURN QUERY SELECT unnest(v_promoted);
END;
$$;

GRANT EXECUTE ON FUNCTION public.promote_event_waitlist(UUID) TO authenticated;
