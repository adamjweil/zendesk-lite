-- Drop ALL existing invitation policies
DROP POLICY IF EXISTS "Organization admins can view invitations" ON invitations;
DROP POLICY IF EXISTS "Organization admins can create invitations" ON invitations;
DROP POLICY IF EXISTS "Organization admins can update invitations" ON invitations;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON invitations;
DROP POLICY IF EXISTS "Enable select for authenticated users" ON invitations;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON invitations;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON invitations;

-- Create more permissive policies for invitations
CREATE POLICY "Enable insert for authenticated users"
    ON invitations FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Enable select for authenticated users"
    ON invitations FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable update for authenticated users"
    ON invitations FOR UPDATE
    TO authenticated
    USING (true);

-- Add DELETE policy for invitations
CREATE POLICY "Enable delete for authenticated users"
    ON invitations FOR DELETE
    TO authenticated
    USING (true);

-- Make sure RLS is enabled
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON invitations TO authenticated;
GRANT ALL ON invitations TO service_role;

-- Verify the table exists in public schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role; 