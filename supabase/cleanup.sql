-- Delete all invitations
DELETE FROM invitations;

-- Delete all profiles (this will cascade to related data)
DELETE FROM profiles;

-- Delete all organizations
DELETE FROM organizations;

-- Delete all auth.users
DELETE FROM auth.users; 