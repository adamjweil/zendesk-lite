-- Add organization_id column to tickets table (initially nullable)
ALTER TABLE tickets
ADD COLUMN organization_id UUID REFERENCES organizations(id);

-- Update existing tickets with organization_id from their creators
UPDATE tickets
SET organization_id = (
  SELECT organization_id
  FROM profiles
  WHERE profiles.id = tickets.creator_id
);

-- Make organization_id NOT NULL after updating existing records
ALTER TABLE tickets
ALTER COLUMN organization_id SET NOT NULL;

-- Add RLS policy for tickets based on organization
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tickets in their organization"
  ON tickets
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create tickets in their organization"
  ON tickets
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- Index for better query performance
CREATE INDEX tickets_organization_id_idx ON tickets(organization_id); 