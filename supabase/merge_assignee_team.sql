-- Check if new columns exist and add them if they don't
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'tickets' AND column_name = 'assignee_type') THEN
        ALTER TABLE tickets
        ADD COLUMN assignee_type TEXT CHECK (assignee_type IN ('user', 'team'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'tickets' AND column_name = 'assigned_to') THEN
        ALTER TABLE tickets
        ADD COLUMN assigned_to UUID;
    END IF;
END $$;

-- Migrate existing assignments (only if old columns exist)
DO $$ 
BEGIN 
    -- Check if old assignee_id column exists and migrate user assignments
    IF EXISTS (SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'tickets' AND column_name = 'assignee_id') THEN
        UPDATE tickets
        SET assignee_type = 'user',
            assigned_to = assignee_id
        WHERE assignee_type IS NULL 
          AND assignee_id IS NOT NULL;
    END IF;

    -- Check if old team_id column exists and migrate team assignments
    IF EXISTS (SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'tickets' AND column_name = 'team_id') THEN
        UPDATE tickets
        SET assignee_type = 'team',
            assigned_to = team_id
        WHERE assignee_type IS NULL 
          AND team_id IS NOT NULL;
    END IF;
END $$;

-- Drop old RLS policies
DROP POLICY IF EXISTS "Team members can view assigned tickets" ON tickets;
DROP POLICY IF EXISTS "Team members can update assigned tickets" ON tickets;

-- Create new RLS policies for the unified assignment system
DROP POLICY IF EXISTS "Members can view assigned tickets" ON tickets;
DROP POLICY IF EXISTS "Members can update assigned tickets" ON tickets;

CREATE POLICY "Members can view assigned tickets"
ON tickets FOR SELECT
USING (
  (assignee_type = 'user' AND assigned_to = auth.uid()) OR
  (assignee_type = 'team' AND assigned_to IN (
    SELECT team_id 
    FROM team_members 
    WHERE user_id = auth.uid()
  ))
);

CREATE POLICY "Members can update assigned tickets"
ON tickets FOR UPDATE
USING (
  (assignee_type = 'user' AND assigned_to = auth.uid()) OR
  (assignee_type = 'team' AND assigned_to IN (
    SELECT team_id 
    FROM team_members 
    WHERE user_id = auth.uid()
  ))
);

-- Drop existing foreign key constraints if they exist
ALTER TABLE tickets
DROP CONSTRAINT IF EXISTS tickets_assignee_id_fkey,
DROP CONSTRAINT IF EXISTS tickets_team_id_fkey;

-- Check if old columns exist before dropping them
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'tickets' AND column_name = 'assignee_id') THEN
        ALTER TABLE tickets DROP COLUMN assignee_id;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'tickets' AND column_name = 'team_id') THEN
        ALTER TABLE tickets DROP COLUMN team_id;
    END IF;
END $$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS validate_ticket_assignment ON tickets;
DROP FUNCTION IF EXISTS validate_ticket_assignment();

-- Add trigger to validate assignment type matches the reference
CREATE OR REPLACE FUNCTION validate_ticket_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- If no assignment, both fields should be null
  IF NEW.assignee_type IS NULL AND NEW.assigned_to IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- If assigning, both fields should be set
  IF NEW.assignee_type IS NULL OR NEW.assigned_to IS NULL THEN
    RAISE EXCEPTION 'Both assignee_type and assigned_to must be set together';
  END IF;

  -- Validate user assignment
  IF NEW.assignee_type = 'user' THEN
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = NEW.assigned_to) THEN
      RAISE EXCEPTION 'Invalid user assignment: user does not exist';
    END IF;
  END IF;

  -- Validate team assignment
  IF NEW.assignee_type = 'team' THEN
    IF NOT EXISTS (SELECT 1 FROM teams WHERE id = NEW.assigned_to) THEN
      RAISE EXCEPTION 'Invalid team assignment: team does not exist';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_ticket_assignment
BEFORE INSERT OR UPDATE ON tickets
FOR EACH ROW
EXECUTE FUNCTION validate_ticket_assignment();

-- Drop existing index if it exists
DROP INDEX IF EXISTS idx_tickets_assignee;

-- Create indexes for better performance
CREATE INDEX idx_tickets_assignee ON tickets(assignee_type, assigned_to);

-- Drop view if it exists
DROP VIEW IF EXISTS ticket_assignments;

-- Create views to maintain compatibility with existing queries
CREATE OR REPLACE VIEW ticket_assignments AS
SELECT 
  t.id as ticket_id,
  CASE 
    WHEN t.assignee_type = 'user' THEN p.id
    ELSE NULL
  END as assignee_id,
  CASE 
    WHEN t.assignee_type = 'team' THEN teams.id
    ELSE NULL
  END as team_id,
  t.assignee_type,
  t.assigned_to,
  p.full_name as assignee_name,
  teams.name as team_name
FROM tickets t
LEFT JOIN profiles p ON t.assignee_type = 'user' AND t.assigned_to = p.id
LEFT JOIN teams ON t.assignee_type = 'team' AND t.assigned_to = teams.id; 