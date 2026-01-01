-- Create a table to track Firebase sync status
CREATE TABLE IF NOT EXISTS firebase_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  synced_at TIMESTAMP WITH TIME ZONE
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_firebase_sync_log_teacher_id ON firebase_sync_log(teacher_id);
CREATE INDEX IF NOT EXISTS idx_firebase_sync_log_status ON firebase_sync_log(status);

-- Function to log sync action
CREATE OR REPLACE FUNCTION log_firebase_sync(
  p_teacher_id UUID,
  p_action TEXT,
  p_status TEXT DEFAULT 'PENDING',
  p_error TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_sync_id UUID;
BEGIN
  INSERT INTO firebase_sync_log (teacher_id, action, status, error_message)
  VALUES (p_teacher_id, p_action, p_status, p_error)
  RETURNING id INTO v_sync_id;
  
  RETURN v_sync_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for INSERT
CREATE OR REPLACE FUNCTION trigger_sync_teacher_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the sync action
  PERFORM log_firebase_sync(NEW.id, 'INSERT', 'PENDING');
  
  -- Send event to Supabase Realtime (will be picked up by Edge Function)
  PERFORM
    pg_notify(
      'firebase_sync_channel',
      json_build_object(
        'event', 'teacher_inserted',
        'teacher_id', NEW.id,
        'teacher_name', NEW.name,
        'teacher_email', NEW.email,
        'role', NEW.role,
        'timestamp', NOW()
      )::text
    );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for DELETE
CREATE OR REPLACE FUNCTION trigger_sync_teacher_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the sync action
  PERFORM log_firebase_sync(OLD.id, 'DELETE', 'PENDING');
  
  -- Send event to Supabase Realtime
  PERFORM
    pg_notify(
      'firebase_sync_channel',
      json_build_object(
        'event', 'teacher_deleted',
        'teacher_id', OLD.id,
        'teacher_name', OLD.name,
        'timestamp', NOW()
      )::text
    );
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger for INSERT
DROP TRIGGER IF EXISTS sync_teacher_insert ON profiles;
CREATE TRIGGER sync_teacher_insert
  AFTER INSERT ON profiles
  FOR EACH ROW
  WHEN (NEW.role = 'teacher')
  EXECUTE FUNCTION trigger_sync_teacher_insert();

-- Trigger for DELETE
DROP TRIGGER IF EXISTS sync_teacher_delete ON profiles;
CREATE TRIGGER sync_teacher_delete
  AFTER DELETE ON profiles
  FOR EACH ROW
  WHEN (OLD.role = 'teacher')
  EXECUTE FUNCTION trigger_sync_teacher_delete();

-- Function to mark sync as successful
CREATE OR REPLACE FUNCTION mark_firebase_sync_success(p_sync_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE firebase_sync_log
  SET status = 'SUCCESS', synced_at = NOW()
  WHERE id = p_sync_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark sync as failed
CREATE OR REPLACE FUNCTION mark_firebase_sync_failed(p_sync_id UUID, p_error TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE firebase_sync_log
  SET status = 'FAILED', error_message = p_error, synced_at = NOW()
  WHERE id = p_sync_id;
END;
$$ LANGUAGE plpgsql;
