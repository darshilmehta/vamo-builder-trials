-- Enable Supabase Realtime for tables queried by frontend pages
-- Run this migration against your Supabase project

-- Add tables to the realtime publication so clients can subscribe
-- to INSERT / UPDATE / DELETE events via Supabase Realtime channels.

ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reward_ledger;
ALTER PUBLICATION supabase_realtime ADD TABLE public.redemptions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.listings;
