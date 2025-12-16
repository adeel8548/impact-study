-- Add joining_date column to students table
ALTER TABLE IF EXISTS public.students
ADD COLUMN IF NOT EXISTS joining_date DATE;

-- Add joining_date column to profiles table (for teachers)
ALTER TABLE IF EXISTS public.profiles
ADD COLUMN IF NOT EXISTS joining_date DATE;

-- Add phone column to profiles table if it doesn't exist (for teachers)
ALTER TABLE IF EXISTS public.profiles
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add incharge_class_ids column to profiles table if it doesn't exist (for teachers)
ALTER TABLE IF EXISTS public.profiles
ADD COLUMN IF NOT EXISTS incharge_class_ids UUID[];
