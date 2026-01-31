-- Add is_unlocked column to events table
ALTER TABLE public.events 
ADD COLUMN is_unlocked BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.events.is_unlocked IS 
  'When true, this event is accessible for voting/RSVP even if previous events are incomplete';

-- Cleanup: Delete all votes for February 2026 event
DELETE FROM event_date_votes 
WHERE date_option_id IN (
  SELECT id FROM event_date_options 
  WHERE event_id = '004fe7cf-b645-479e-9d2b-d3a978813986'
);

-- Cleanup: Delete all RSVPs for February 2026 event
DELETE FROM event_rsvps 
WHERE event_id = '004fe7cf-b645-479e-9d2b-d3a978813986';