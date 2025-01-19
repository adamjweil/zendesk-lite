-- Create policy to allow authenticated users to view user emails
CREATE POLICY "Allow authenticated users to view user emails"
    ON auth.users
    FOR SELECT
    TO authenticated
    USING (true);

-- Grant necessary permissions
GRANT SELECT ON auth.users TO authenticated; 