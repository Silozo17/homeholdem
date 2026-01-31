-- Enable required extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;

-- Schedule the pending notifications processor to run every minute
SELECT cron.schedule(
  'process-pending-notifications',
  '* * * * *',
  $$
  SELECT net.http_post(
    url:='https://kmsthmtbvuxmpjzmwybj.supabase.co/functions/v1/process-pending-notifications',
    headers:=jsonb_build_object(
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imttc3RobXRidnV4bXBqem13eWJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwODc0MjMsImV4cCI6MjA4NDY2MzQyM30.tJ3p7xFwi_l_ZhVeLQWfIeFhL9CGK3Nq_MSSPyOraZA',
      'Content-Type', 'application/json'
    ),
    body:='{}'::jsonb
  ) as request_id;
  $$
);