-- Drop existing function first
DROP FUNCTION IF EXISTS public.get_organization_users();

-- Create a function to get profiles with emails
CREATE OR REPLACE FUNCTION public.get_organization_users()
RETURNS SETOF json
SECURITY DEFINER
AS $$
DECLARE
    current_org_id uuid;
BEGIN
    -- First get the current user's organization_id
    SELECT profiles.organization_id INTO current_org_id
    FROM public.profiles
    WHERE profiles.id = auth.uid();

    -- Then return the user data as JSON
    RETURN QUERY
    SELECT 
        json_build_object(
            'id', p.id,
            'full_name', p.full_name,
            'title', p.title,
            'phone', p.phone,
            'avatar_url', p.avatar_url,
            'role', p.role,
            'organization_id', p.organization_id,
            'created_at', p.created_at,
            'updated_at', p.updated_at,
            'email', u.email,
            'organization', json_build_object(
                'id', o.id,
                'name', o.name,
                'website', o.website,
                'description', o.description
            )
        )
    FROM 
        public.profiles p
        LEFT JOIN auth.users u ON p.id = u.id
        LEFT JOIN public.organizations o ON p.organization_id = o.id
    WHERE 
        p.organization_id = current_org_id
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql; 