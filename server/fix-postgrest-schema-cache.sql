-- Fix PostgREST schema cache issue for practitioner online status
-- The 'online' column exists but PostgREST cache doesn't recognize it
-- This migration adds 'is_online' as an alias column

-- First, check if 'is_online' already exists
DO $$
BEGIN
  -- Add is_online column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'practitioners' AND column_name = 'is_online'
  ) THEN
    -- Add is_online column that mirrors the online column
    ALTER TABLE practitioners ADD COLUMN is_online BOOLEAN DEFAULT false;
    
    -- Copy existing data from online to is_online
    UPDATE practitioners SET is_online = online;
    
    -- Create a trigger to keep them in sync
    CREATE OR REPLACE FUNCTION sync_online_columns()
    RETURNS TRIGGER AS $trigger$
    BEGIN
      -- When is_online is updated, update online too
      IF TG_OP = 'UPDATE' THEN
        IF NEW.is_online IS DISTINCT FROM OLD.is_online THEN
          NEW.online = NEW.is_online;
        ELSIF NEW.online IS DISTINCT FROM OLD.online THEN
          NEW.is_online = NEW.online;
        END IF;
      END IF;
      RETURN NEW;
    END;
    $trigger$ LANGUAGE plpgsql;
    
    -- Create trigger to keep both columns in sync
    DROP TRIGGER IF EXISTS sync_online_status ON practitioners;
    CREATE TRIGGER sync_online_status
      BEFORE UPDATE ON practitioners
      FOR EACH ROW
      EXECUTE FUNCTION sync_online_columns();
    
    RAISE NOTICE 'Added is_online column and sync trigger to practitioners table';
  ELSE
    RAISE NOTICE 'is_online column already exists';
  END IF;
END $$;

-- Notify PostgREST to reload the schema cache
NOTIFY pgrst, 'reload schema';

-- Verify the fix
SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'practitioners' 
AND column_name IN ('online', 'is_online')
ORDER BY column_name;