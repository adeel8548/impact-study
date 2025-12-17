-- Add expected_time field to profiles table for teacher attendance

ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS expected_time TIME;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_expected_time ON public.profiles(expected_time) WHERE role = 'teacher';
