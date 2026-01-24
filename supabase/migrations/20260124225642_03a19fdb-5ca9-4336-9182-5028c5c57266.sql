-- Add address column to event_host_volunteers table
ALTER TABLE public.event_host_volunteers
ADD COLUMN address TEXT;