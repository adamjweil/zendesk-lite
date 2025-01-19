-- Drop existing update policy
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Create new policies for profile updates
CREATE POLICY "Users can update their own profile"
    ON profiles
    FOR UPDATE
    USING (
        auth.uid() = id
        OR
        EXISTS (
            SELECT 1
            FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Grant necessary permissions
GRANT ALL ON profiles TO authenticated; 