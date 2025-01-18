-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Tickets are viewable by authenticated users" ON tickets;
DROP POLICY IF EXISTS "Agents can create tickets" ON tickets;
DROP POLICY IF EXISTS "Agents can update tickets" ON tickets;
DROP POLICY IF EXISTS "Comments are viewable by authenticated users" ON comments;
DROP POLICY IF EXISTS "Authenticated users can create comments" ON comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON comments;

-- Recreate policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Tickets are viewable by authenticated users" ON tickets
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Agents can create tickets" ON tickets
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('agent', 'admin')
        )
    );

CREATE POLICY "Agents can update tickets" ON tickets
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('agent', 'admin')
        )
    );

CREATE POLICY "Comments are viewable by authenticated users" ON comments
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create comments" ON comments
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own comments" ON comments
    FOR UPDATE USING (author_id = auth.uid());

-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS handle_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS handle_tickets_updated_at ON tickets;
DROP TRIGGER IF EXISTS handle_comments_updated_at ON comments;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_updated_at();
DROP FUNCTION IF EXISTS handle_new_user();

-- Recreate functions and triggers
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_tickets_updated_at
    BEFORE UPDATE ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- Create improved user creation trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if profile already exists
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
        INSERT INTO public.profiles (
            id,
            full_name,
            role,
            created_at,
            updated_at
        )
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
            COALESCE(NEW.raw_user_meta_data->>'role', 'agent'),
            NOW(),
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user(); 