-- Drop the existing trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Recreate the function with better error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    organization_id UUID;
    invitation RECORD;
BEGIN
    -- Check if user was invited (has organization_id in metadata)
    IF NEW.raw_user_meta_data->>'organization_id' IS NOT NULL THEN
        -- User was invited, create profile with provided organization_id
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
            COALESCE(NEW.raw_user_meta_data->>'role', 'agent'),
            (NEW.raw_user_meta_data->>'organization_id')::UUID,
            NOW(),
            NOW()
        );

        -- Update invitation status if it exists
        UPDATE public.invitations
        SET status = 'accepted'
        WHERE email = NEW.email
        AND organization_id = (NEW.raw_user_meta_data->>'organization_id')::UUID
        AND status = 'pending'
        AND expires_at > NOW();

    ELSE
        -- Create new organization and admin profile
        INSERT INTO public.organizations (name)
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
EXCEPTION WHEN OTHERS THEN
    -- Log the error (Supabase will capture this in the logs)
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Make sure the function has the necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Ensure the public schema is in the search_path
ALTER DATABASE postgres SET search_path TO public, extensions; 