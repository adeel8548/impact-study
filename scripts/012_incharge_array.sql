-- Add new column `incharge_class_ids` (uuid[]) to profiles and migrate existing values
BEGIN;

ALTER TABLE IF EXISTS profiles
  ADD COLUMN IF NOT EXISTS incharge_class_ids uuid[];

-- If an existing single incharge_class_id exists, copy it into the array column
UPDATE profiles
SET incharge_class_ids = ARRAY[incharge_class_id]
WHERE incharge_class_id IS NOT NULL
  AND (incharge_class_ids IS NULL OR array_length(incharge_class_ids,1) = 0);

COMMIT;
