-- Add has_seen_onboarding column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS has_seen_onboarding boolean DEFAULT false;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_has_seen_onboarding ON public.profiles(has_seen_onboarding);
