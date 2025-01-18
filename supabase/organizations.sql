-- Create organizations table
CREATE TABLE organizations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add organization_id to profiles
ALTER TABLE profiles
ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- Create invitations table
CREATE TABLE invitations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    email TEXT NOT NULL,
    role TEXT DEFAULT 'agent' CHECK (role IN ('admin', 'agent', 'customer')),
    token TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
    invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create trigger for invitations updated_at
CREATE TRIGGER handle_invitations_updated_at
    BEFORE UPDATE ON invitations
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- Create trigger for organizations updated_at
CREATE TRIGGER handle_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- Update handle_new_user function to create organization for first user
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    organization_id UUID;
    invitation RECORD;
BEGIN
    -- Check if user was invited
    SELECT * INTO invitation
    FROM invitations
    WHERE email = NEW.email
    AND status = 'pending'
    AND expires_at > NOW()
    LIMIT 1;

    IF invitation.id IS NOT NULL THEN
        -- Accept invitation and create profile
        UPDATE invitations
        SET status = 'accepted'
        WHERE id = invitation.id;

        INSERT INTO public.profiles (
            id,
            full_name,
            role,
            organization_id,
            created_at,
            updated_at
        )
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
            invitation.role,
            invitation.organization_id,
            NOW(),
            NOW()
        );
    ELSE
        -- Create new organization and admin profile
        INSERT INTO organizations (name)
        VALUES (COALESCE(NEW.raw_user_meta_data->>'organization_name', 'My Organization'))
        RETURNING id INTO organization_id;

        INSERT INTO public.profiles (
            id,
            full_name,
            role,
            organization_id,
            created_at,
            updated_at
        )
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
            'admin',
            organization_id,
            NOW(),
            NOW()
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policies for organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own organization"
    ON organizations FOR SELECT
    USING (
        id IN (
            SELECT organization_id
            FROM profiles
            WHERE profiles.id = auth.uid()
        )
    );

CREATE POLICY "Organization admins can update their organization"
    ON organizations FOR UPDATE
    USING (
        id IN (
            SELECT organization_id
            FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Add RLS policies for invitations
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

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