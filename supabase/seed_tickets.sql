-- Get a random user ID from the profiles table with role 'agent' or 'admin'
CREATE OR REPLACE FUNCTION get_random_agent_id() RETURNS UUID AS $$
DECLARE
  agent_id UUID;
BEGIN
  SELECT id INTO agent_id
  FROM profiles
  WHERE role IN ('agent', 'admin')
  ORDER BY random()
  LIMIT 1;
  RETURN agent_id;
END;
$$ LANGUAGE plpgsql;

-- Get a random user ID from the profiles table
CREATE OR REPLACE FUNCTION get_random_user_id() RETURNS UUID AS $$
DECLARE
  user_id UUID;
BEGIN
  SELECT id INTO user_id
  FROM profiles
  ORDER BY random()
  LIMIT 1;
  RETURN user_id;
END;
$$ LANGUAGE plpgsql;

-- Insert sample tickets
INSERT INTO tickets (subject, description, status, priority, category, creator_id, assignee_id, created_at, updated_at)
VALUES
  ('Login page not working', 'Users are unable to log in to the application. The login button appears to be unresponsive.', 'new', 'high', 'Bug', get_random_user_id(), get_random_agent_id(), NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'),
  ('Need help with account setup', 'I am trying to set up my account but I am getting an error message.', 'open', 'medium', 'Support', get_random_user_id(), get_random_agent_id(), NOW() - INTERVAL '29 days', NOW() - INTERVAL '29 days'),
  ('Feature request: Dark mode', 'Would love to see a dark mode option in the application.', 'pending', 'low', 'Feature Request', get_random_user_id(), get_random_agent_id(), NOW() - INTERVAL '28 days', NOW() - INTERVAL '28 days'),
  ('Cannot upload files', 'Getting an error when trying to upload files larger than 2MB.', 'new', 'high', 'Bug', get_random_user_id(), get_random_agent_id(), NOW() - INTERVAL '27 days', NOW() - INTERVAL '27 days'),
  ('Billing issue', 'My credit card was charged twice for the monthly subscription.', 'open', 'urgent', 'Billing', get_random_user_id(), get_random_agent_id(), NOW() - INTERVAL '26 days', NOW() - INTERVAL '26 days'),
  ('Mobile app crashes', 'The mobile app crashes when opening the settings page.', 'new', 'high', 'Bug', get_random_user_id(), get_random_agent_id(), NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days'),
  ('Password reset not working', 'The password reset email is not being received.', 'resolved', 'medium', 'Support', get_random_user_id(), get_random_agent_id(), NOW() - INTERVAL '24 days', NOW() - INTERVAL '24 days'),
  ('API documentation unclear', 'The API documentation is missing examples for authentication.', 'open', 'low', 'Documentation', get_random_user_id(), get_random_agent_id(), NOW() - INTERVAL '23 days', NOW() - INTERVAL '23 days'),
  ('Performance issues', 'The application is very slow when loading large datasets.', 'pending', 'high', 'Performance', get_random_user_id(), get_random_agent_id(), NOW() - INTERVAL '22 days', NOW() - INTERVAL '22 days'),
  ('Export feature not working', 'Unable to export data to CSV format.', 'new', 'medium', 'Bug', get_random_user_id(), get_random_agent_id(), NOW() - INTERVAL '21 days', NOW() - INTERVAL '21 days'),
  ('Need help with API integration', 'Looking for guidance on integrating the API with our system.', 'open', 'medium', 'Support', get_random_user_id(), get_random_agent_id(), NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'),
  ('Feature request: Custom fields', 'Would like to be able to add custom fields to forms.', 'pending', 'low', 'Feature Request', get_random_user_id(), get_random_agent_id(), NOW() - INTERVAL '19 days', NOW() - INTERVAL '19 days'),
  ('Security concern', 'Found a potential security vulnerability in the login process.', 'new', 'urgent', 'Security', get_random_user_id(), get_random_agent_id(), NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days'),
  ('Data import failed', 'Bulk data import is failing with a timeout error.', 'open', 'high', 'Bug', get_random_user_id(), get_random_agent_id(), NOW() - INTERVAL '17 days', NOW() - INTERVAL '17 days'),
  ('Need pricing information', 'Looking for detailed pricing information for enterprise plan.', 'resolved', 'low', 'Sales', get_random_user_id(), get_random_agent_id(), NOW() - INTERVAL '16 days', NOW() - INTERVAL '16 days'),
  ('Mobile app feature request', 'Would like to see push notifications in the mobile app.', 'pending', 'medium', 'Feature Request', get_random_user_id(), get_random_agent_id(), NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days'),
  ('Database connection issues', 'Intermittent connection drops to the database.', 'new', 'high', 'Infrastructure', get_random_user_id(), get_random_agent_id(), NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days'),
  ('UI bug in dashboard', 'Charts are not rendering correctly in the dashboard.', 'open', 'medium', 'Bug', get_random_user_id(), get_random_agent_id(), NOW() - INTERVAL '13 days', NOW() - INTERVAL '13 days'),
  ('Need help with webhook setup', 'Documentation for webhook setup is outdated.', 'pending', 'low', 'Documentation', get_random_user_id(), get_random_agent_id(), NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days'),
  ('Account access issues', 'Unable to access account after password change.', 'new', 'high', 'Support', get_random_user_id(), get_random_agent_id(), NOW() - INTERVAL '11 days', NOW() - INTERVAL '11 days'),
  ('Feature request: API tokens', 'Would like to be able to generate multiple API tokens.', 'open', 'medium', 'Feature Request', get_random_user_id(), get_random_agent_id(), NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
  ('SSL certificate expired', 'The SSL certificate for the staging environment has expired.', 'resolved', 'urgent', 'Infrastructure', get_random_user_id(), get_random_agent_id(), NOW() - INTERVAL '9 days', NOW() - INTERVAL '9 days'),
  ('Search functionality broken', 'Global search is not returning any results.', 'new', 'high', 'Bug', get_random_user_id(), get_random_agent_id(), NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days'),
  ('Need training resources', 'Looking for training materials for new team members.', 'open', 'low', 'Training', get_random_user_id(), get_random_agent_id(), NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),
  ('API rate limiting issue', 'Getting rate limit errors with normal usage.', 'pending', 'high', 'API', get_random_user_id(), get_random_agent_id(), NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'),
  ('Feature request: Audit logs', 'Would like to see detailed audit logs for all actions.', 'new', 'medium', 'Feature Request', get_random_user_id(), get_random_agent_id(), NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
  ('Email notifications delayed', 'Email notifications are being delayed by several hours.', 'open', 'high', 'Bug', get_random_user_id(), get_random_agent_id(), NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
  ('Integration documentation needed', 'Need documentation for Salesforce integration.', 'pending', 'medium', 'Documentation', get_random_user_id(), get_random_agent_id(), NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
  ('Account deletion request', 'Need help with GDPR compliant account deletion.', 'new', 'high', 'Privacy', get_random_user_id(), get_random_agent_id(), NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
  ('Feature request: SSO', 'Would like to implement SSO with Azure AD.', 'open', 'medium', 'Feature Request', get_random_user_id(), get_random_agent_id(), NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day');

-- Insert sample comments for each ticket
INSERT INTO comments (ticket_id, author_id, content, is_internal, created_at, updated_at)
SELECT 
  t.id,
  get_random_agent_id(),
  CASE (random() * 4)::int
    WHEN 0 THEN 'Thank you for reporting this issue. We are looking into it.'
    WHEN 1 THEN 'Could you please provide more information about your environment?'
    WHEN 2 THEN 'This has been assigned to our development team.'
    WHEN 3 THEN 'We have identified the root cause and are working on a fix.'
    ELSE 'A fix has been deployed. Please verify if the issue is resolved.'
  END,
  random() < 0.3, -- 30% chance of being an internal note
  t.created_at + interval '1 hour',
  t.created_at + interval '1 hour'
FROM tickets t; 