-- Drop ALL existing invitation policies
DROP POLICY IF EXISTS "Organization admins can view invitations" ON invitations;
DROP POLICY IF EXISTS "Organization admins can create invitations" ON invitations;
DROP POLICY IF EXISTS "Organization admins can update invitations" ON invitations;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON invitations;
DROP POLICY IF EXISTS "Enable select for authenticated users" ON invitations;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON invitations;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON invitations;

-- Create more restrictive policies for invitations
CREATE POLICY "Organization admins can view invitations"
    ON invitations FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id
            FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Organization admins can create invitations"
    ON invitations FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id
            FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Organization admins can update invitations"
    ON invitations FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id
            FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Organization admins can delete invitations"
    ON invitations FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id
            FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Make sure RLS is enabled
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON invitations TO authenticated;
GRANT ALL ON invitations TO service_role;

-- Verify the table exists in public schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role; 