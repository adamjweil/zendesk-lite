-- Drop existing policies first
DROP POLICY IF EXISTS "Enable insert for organizations during signup" ON organizations;
DROP POLICY IF EXISTS "Enable insert for profiles during signup" ON profiles;
DROP POLICY IF EXISTS "Public can read organizations" ON organizations;

-- Create new policies
CREATE POLICY "Enable insert for organizations during signup"
    ON organizations
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Enable insert for profiles during signup"
    ON profiles
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Public can read organizations"
    ON organizations
    FOR SELECT
    USING (true);

-- Double check that RLS is enabled but not blocking inserts
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions to authenticated and anon roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON organizations TO anon, authenticated;
GRANT ALL ON profiles TO anon, authenticated;
GRANT ALL ON invitations TO anon, authenticated; 