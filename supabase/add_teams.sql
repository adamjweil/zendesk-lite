-- Create teams table
CREATE TABLE teams (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    leader_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create team_members junction table for many-to-many relationship
CREATE TABLE team_members (
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    PRIMARY KEY (team_id, user_id)
);

-- Add indexes for better query performance
CREATE INDEX idx_teams_organization_id ON teams(organization_id);
CREATE INDEX idx_teams_leader_id ON teams(leader_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);

-- Enable RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Teams policies
CREATE POLICY "Users can view teams in their organization"
    ON teams FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id
            FROM profiles
            WHERE profiles.id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage teams"
    ON teams FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id
            FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Team members policies
CREATE POLICY "Users can view team members in their organization"
    ON team_members FOR SELECT
    USING (
        team_id IN (
            SELECT id
            FROM teams
            WHERE organization_id IN (
                SELECT organization_id
                FROM profiles
                WHERE profiles.id = auth.uid()
            )
        )
    );

CREATE POLICY "Admins can manage team members"
    ON team_members FOR ALL
    USING (
        team_id IN (
            SELECT id
            FROM teams
            WHERE organization_id IN (
                SELECT organization_id
                FROM profiles
                WHERE profiles.id = auth.uid()
                AND profiles.role = 'admin'
            )
        )
    );

-- Create trigger for teams updated_at
CREATE TRIGGER handle_teams_updated_at
    BEFORE UPDATE ON teams
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at(); 