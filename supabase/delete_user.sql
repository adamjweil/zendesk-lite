-- Function to delete a user and optionally reassign their tickets
create or replace function delete_user_and_reassign_tickets(
  user_id_to_delete uuid,
  reassign_to_user_id uuid default null
)
returns void
language plpgsql
security definer
as $$
begin
  -- First reassign tickets if a reassignment user is provided
  if reassign_to_user_id is not null then
    update tickets
    set assignee_type = 'user',
        assigned_to = reassign_to_user_id,
        updated_at = now()
    where assignee_type = 'user' and assigned_to = user_id_to_delete;
  else
    -- If no reassignment user, just unassign the tickets
    update tickets
    set assignee_type = null,
        assigned_to = null,
        updated_at = now()
    where assignee_type = 'user' and assigned_to = user_id_to_delete;
  end if;

  -- Delete user's comments
  delete from comments where author_id = user_id_to_delete;
  
  -- Delete user's tickets (where they are the creator)
  delete from tickets where creator_id = user_id_to_delete;
  
  -- Delete user's profile
  delete from profiles where id = user_id_to_delete;
  
  -- Note: The actual auth.users entry should be deleted through Supabase's management API
  -- as we don't have direct access to the auth schema from here
end;
$$; 