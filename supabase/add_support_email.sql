-- Add support_email column to organizations table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'organizations' 
        AND column_name = 'support_email'
    ) THEN
        ALTER TABLE organizations 
        ADD COLUMN support_email TEXT UNIQUE;
    END IF;
END $$; 