import { supabase } from './supabase'
import { nanoid } from 'nanoid'

// User profile operations
export const getUserProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      *,
      organization:organizations(
        id,
        name,
        website,
        description
      )
    `)
    .eq('id', userId)
    .single()

  return { data, error }
}

export const updateUserProfile = async (userId, updates) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .maybeSingle()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error updating user profile:', error)
    return { data: null, error }
  }
}

// Organization operations
export const getOrganizationUsers = async () => {
  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .single()

    if (profileError) throw profileError

    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        organization:organizations(*)
      `)
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching organization users:', error)
    return { data: null, error }
  }
}

export const updateOrganization = async (organizationId, formData) => {
  const { data, error } = await supabase
    .from('organizations')
    .update({
      name: formData.name,
      website: formData.website || null,  // Use null if empty
      description: formData.description || null,  // Use null if empty
    })
    .eq('id', organizationId)
    .select()

  return { data, error }
}

// Invitation operations
export const createInvitation = async ({ email, role }) => {
  try {
    // First get the user's organization_id and full name
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        organization_id,
        full_name,
        organization:organizations(name)
      `)
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .single()

    if (profileError) throw profileError
    if (!profile.organization_id) throw new Error('User has no organization')

    const token = nanoid(32)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // Expires in 7 days

    const { data: invitation, error } = await supabase
      .from('invitations')
      .insert([
        {
          email,
          role,
          organization_id: profile.organization_id,
          token,
          expires_at: expiresAt.toISOString(),
          invited_by: (await supabase.auth.getUser()).data.user?.id,
        },
      ])
      .select()
      .single()

    if (error) throw error

    // Send invitation email using Edge Function
    const { error: emailError } = await supabase.functions.invoke('send-invitation', {
      body: {
        email,
        token,
        organization: profile.organization,
        inviter: {
          full_name: profile.full_name,
        },
      },
    })

    if (emailError) {
      console.error('Error sending invitation email:', emailError)
      // Don't throw here - the invitation was created successfully
    }

    return { data: invitation, error: null }
  } catch (error) {
    console.error('Error creating invitation:', error)
    return { data: null, error }
  }
}

export const getInvitations = async () => {
  try {
    // First get the user's organization_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .single()

    if (profileError) throw profileError

    const { data, error } = await supabase
      .from('invitations')
      .select(`
        *,
        inviter:profiles!invitations_invited_by_fkey(full_name)
      `)
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching invitations:', error)
    return { data: null, error }
  }
}

export const getInvitationByToken = async (token) => {
  try {
    const { data, error } = await supabase
      .from('invitations')
      .select(`
        *,
        organization:organizations(name)
      `)
      .eq('token', token)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching invitation:', error)
    return { data: null, error }
  }
}

export const deleteInvitation = async (invitationId) => {
  try {
    // First get the user's organization_id to verify ownership
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .single()

    if (profileError) throw profileError

    // Delete the invitation only if it belongs to the user's organization
    const { error } = await supabase
      .from('invitations')
      .delete()
      .eq('id', invitationId)
      .eq('organization_id', profile.organization_id)

    if (error) throw error
    return { error: null }
  } catch (error) {
    console.error('Error deleting invitation:', error)
    return { error }
  }
}

// Ticket operations
export const getTickets = async (filters = {}) => {
  let query = supabase
    .from('tickets')
    .select(`
      *,
      assignee:profiles!tickets_assignee_id_fkey(id, full_name),
      creator:profiles!tickets_creator_id_fkey(id, full_name)
    `)

  // Apply filters
  if (filters.status) {
    query = query.eq('status', filters.status)
  }
  if (filters.assignee_id) {
    query = query.eq('assignee_id', filters.assignee_id)
  }
  if (filters.creator_id) {
    query = query.eq('creator_id', filters.creator_id)
  }

  const { data, error } = await query.order('created_at', { ascending: false })
  return { data, error }
}

export const createTicket = async (ticketData) => {
  const { data, error } = await supabase
    .from('tickets')
    .insert([ticketData])
    .select()
  return { data, error }
}

export const updateTicket = async (ticketId, updates) => {
  const { data, error } = await supabase
    .from('tickets')
    .update(updates)
    .eq('id', ticketId)
    .select()
  return { data, error }
}

// Comments operations
export const getTicketComments = async (ticketId) => {
  const { data, error } = await supabase
    .from('comments')
    .select(`      *,
      author:profiles!comments_author_id_fkey(id, full_name)
    `)
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true })
  return { data, error }
}

export const createComment = async (commentData) => {
  const { data, error } = await supabase
    .from('comments')
    .insert([commentData])
    .select()
  return { data, error }
} 
