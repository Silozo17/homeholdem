-- Add composite indexes for performance optimization

-- Index for RSVP count queries filtered by event and status
CREATE INDEX IF NOT EXISTS idx_event_rsvps_event_status 
ON public.event_rsvps (event_id, status, is_waitlisted);

-- Index for prize pool calculations filtered by session and transaction type
CREATE INDEX IF NOT EXISTS idx_game_transactions_session_type 
ON public.game_transactions (game_session_id, transaction_type);

-- Index for pending notifications batch processing query
CREATE INDEX IF NOT EXISTS idx_pending_notifications_scheduled 
ON public.pending_notifications (scheduled_for, is_processed) 
WHERE is_processed = false AND superseded_by IS NULL;