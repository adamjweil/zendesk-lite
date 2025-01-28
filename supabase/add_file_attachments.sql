-- Create file_attachments table
CREATE TABLE file_attachments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    content_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE file_attachments ENABLE ROW LEVEL SECURITY;

-- Create policies for file_attachments
CREATE POLICY "Users can view file attachments in their organization"
    ON file_attachments FOR SELECT
    USING (
        ticket_id IN (
            SELECT id FROM tickets
            WHERE tickets.organization_id IN (
                SELECT organization_id FROM profiles
                WHERE profiles.id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can upload file attachments to tickets in their organization"
    ON file_attachments FOR INSERT
    WITH CHECK (
        ticket_id IN (
            SELECT id FROM tickets
            WHERE tickets.organization_id IN (
                SELECT organization_id FROM profiles
                WHERE profiles.id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can delete their own file attachments"
    ON file_attachments FOR DELETE
    USING (
        uploaded_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Create index for faster lookups
CREATE INDEX idx_file_attachments_ticket_id ON file_attachments(ticket_id);

-- Create trigger for updated_at
CREATE TRIGGER handle_file_attachments_updated_at
    BEFORE UPDATE ON file_attachments
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at(); 