-- Add team_id column to tickets table
ALTER TABLE tickets
ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_tickets_team_id ON tickets(team_id);

-- Update RLS policy to allow team members to view and update tickets
CREATE POLICY "Team members can view assigned tickets"
ON tickets
FOR SELECT
USING (
    team_id IN (
        SELECT team_id
        FROM team_members
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Team members can update assigned tickets"
ON tickets
FOR UPDATE
USING (
    team_id IN (
        SELECT team_id
        FROM team_members
        WHERE user_id = auth.uid()
    )
); 