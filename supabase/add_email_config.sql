-- Create email_configs table
CREATE TABLE IF NOT EXISTS email_configs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    provider TEXT NOT NULL DEFAULT 'sendgrid',
    provider_settings JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add RLS policies
ALTER TABLE email_configs ENABLE ROW LEVEL SECURITY;

-- Only organization admins can view their email configs
CREATE POLICY "Organization admins can view their email configs"
    ON email_configs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.organization_id = email_configs.organization_id
            AND profiles.role = 'admin'
        )
    );

-- Only organization admins can update their email configs
CREATE POLICY "Organization admins can update their email configs"
    ON email_configs FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.organization_id = email_configs.organization_id
            AND profiles.role = 'admin'
        )
    );

-- Create trigger for updated_at
CREATE TRIGGER handle_email_configs_updated_at
    BEFORE UPDATE ON email_configs
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at(); 