-- Update the profile role to admin
UPDATE profiles 
SET role = 'admin'
WHERE id = '11649ad4-d8fb-47e5-b234-b5174f8cf128';

-- Update the user metadata role to admin
UPDATE auth.users
SET 
    raw_user_meta_data = jsonb_build_object(
        'email', 'adamjweil@gmail.com',
        'email_verified', true,
        'full_name', 'Adam',
        'phone_verified', false,
        'role', 'admin'
    )
WHERE id = '11649ad4-d8fb-47e5-b234-b5174f8cf128'; 