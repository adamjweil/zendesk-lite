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
        description,
        support_email
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
    const { data, error } = await supabase
      .rpc('get_organization_users')

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
      support_email: formData.support_email || null,  // Use null if empty
    })
    .eq('id', organizationId)
    .select()

  return { data, error }
}

export const deleteSupportEmail = async (organizationId) => {
  try {
    const { data, error } = await supabase
      .from('organizations')
      .update({ support_email: null })
      .eq('id', organizationId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error deleting support email:', error)
    return { data: null, error }
  }
}

export const generateSupportEmail = async (organizationId) => {
  try {
    // Get organization details
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single()

    if (!org) throw new Error('Organization not found')

    // Generate a unique support email based on organization name
    const baseEmail = org.name.toLowerCase()
      .replace(/[^a-z0-9]/g, '') // Remove special characters
      .slice(0, 20) // Limit length
    
    const uniqueId = Math.random().toString(36).substring(2, 7)
    const supportEmail = `${baseEmail}-${uniqueId}@support.zendesklite.com`

    // Update the organization with the new support email
    const { data, error } = await supabase
      .from('organizations')
      .update({ support_email: supportEmail })
      .eq('id', organizationId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error generating support email:', error)
    return { data: null, error }
  }
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
  try {
    let query = supabase
      .from('tickets')
      .select(`
        *,
        creator:profiles!tickets_creator_id_fkey(id, full_name),
        assignee:profiles!tickets_assignee_id_fkey(id, full_name)
      `)

    // Apply filters
    if (filters.id) {
      query = query.eq('id', filters.id)
    }
    if (filters.status) {
      query = query.ilike('status', filters.status)
    }
    if (filters.assignee_id) {
      query = query.eq('assignee_id', filters.assignee_id)
    }
    if (filters.creator_id) {
      query = query.eq('creator_id', filters.creator_id)
    }
    if (filters.priority) {
      query = query.eq('priority', filters.priority)
    }

    console.log('Executing query:', query)

    const { data, error } = await query.order('created_at', { ascending: false })
    console.log('Data:', data)
    console.log('Error:', error)
    return { data, error }
  } catch (error) {
    console.error('Error fetching tickets:', error)
    return { data: null, error }
  }
}

export const createTicket = async (ticketData) => {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .insert([{
        ...ticketData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select()

    return { data, error }
  } catch (error) {
    console.error('Error creating ticket:', error)
    return { data: null, error }
  }
}

export const updateTicket = async (ticketId, updates) => {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticketId)
      .select()

    return { data, error }
  } catch (error) {
    console.error('Error updating ticket:', error)
    return { data: null, error }
  }
}

// Comments operations
export const getTicketComments = async (ticketId) => {
  try {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        author:profiles!comments_author_id_fkey(id, full_name)
      `)
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })

    return { data, error }
  } catch (error) {
    console.error('Error fetching ticket comments:', error)
    return { data: null, error }
  }
}

export const createComment = async (commentData) => {
  try {
    const { data, error } = await supabase
      .from('comments')
      .insert([{
        ...commentData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select()

    return { data, error }
  } catch (error) {
    console.error('Error creating comment:', error)
    return { data: null, error }
  }
}

// Check if current user is admin
export const isCurrentUserAdmin = async () => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .single()

    if (error) throw error
    return profile?.role === 'admin'
  } catch (error) {
    console.error('Error checking admin status:', error)
    return false
  }
}

// Update user role
export const updateUserRole = async (userId, role) => {
  try {
    // First verify the current user is an admin
    const isAdmin = await isCurrentUserAdmin()
    if (!isAdmin) {
      throw new Error('Only admins can update user roles')
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error updating user role:', error)
    return { data: null, error }
  }
}

// Recent Activity operations
export const getRecentActivities = async (page = 1, pageSize = 10) => {
  try {
    const offset = (page - 1) * pageSize

    // Get recent tickets and comments in parallel
    const [ticketsResponse, commentsResponse] = await Promise.all([
      supabase
        .from('tickets')
        .select(`
          id,
          subject,
          status,
          created_at,
          creator:profiles!tickets_creator_id_fkey(id, full_name),
          assignee:profiles!tickets_assignee_id_fkey(id, full_name)
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1),
      supabase
        .from('comments')
        .select(`
          id,
          content,
          is_internal,
          created_at,
          ticket_id,
          author:profiles!comments_author_id_fkey(id, full_name),
          ticket:tickets!comments_ticket_id_fkey(subject)
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1)
    ])

    console.log('Tickets response:', ticketsResponse)
    console.log('Comments response:', commentsResponse)

    if (ticketsResponse.error) throw ticketsResponse.error
    if (commentsResponse.error) throw commentsResponse.error

    // Get total counts for pagination
    const [{ count: ticketsCount }, { count: commentsCount }] = await Promise.all([
      supabase.from('tickets').select('*', { count: 'exact', head: true }),
      supabase.from('comments').select('*', { count: 'exact', head: true })
    ])

    console.log('Tickets count:', ticketsCount)
    console.log('Comments count:', commentsCount)

    const totalTickets = ticketsCount || 0
    const totalComments = commentsCount || 0
    const totalItems = totalTickets + totalComments

    // Combine and sort activities
    const activities = [
      ...(ticketsResponse.data || []).map(ticket => ({
        id: `ticket-${ticket.id}`,
        type: 'ticket_created',
        ticket_id: ticket.id,
        subject: ticket.subject,
        status: ticket.status,
        actor: ticket.creator?.full_name,
        assignee: ticket.assignee?.full_name,
        created_at: ticket.created_at
      })),
      ...(commentsResponse.data || []).map(comment => ({
        id: `comment-${comment.id}`,
        type: 'comment_added',
        ticket_id: comment.ticket_id,
        subject: comment.ticket?.subject,
        content: comment.content,
        is_internal: comment.is_internal,
        actor: comment.author?.full_name,
        created_at: comment.created_at
      }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, pageSize)

    console.log('Combined activities:', activities)

    return { 
      data: activities, 
      metadata: {
        currentPage: page,
        pageSize,
        totalPages: Math.ceil(totalItems / pageSize),
        totalItems
      }, 
      error: null 
    }
  } catch (error) {
    console.error('Error fetching recent activities:', error)
    return { data: null, metadata: null, error }
  }
}

// Test data creation (temporary)
export const createTestData = async () => {
  try {
    // Get the current user's ID
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('No user logged in')

    // Create a test ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .insert([{
        subject: 'Test Ticket',
        description: 'This is a test ticket',
        status: 'new',
        priority: 'medium',
        creator_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single()

    if (ticketError) throw ticketError

    // Create a test comment
    const { error: commentError } = await supabase
      .from('comments')
      .insert([{
        ticket_id: ticket.id,
        author_id: userId,
        content: 'This is a test comment',
        is_internal: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])

    if (commentError) throw commentError

    return { error: null }
  } catch (error) {
    console.error('Error creating test data:', error)
    return { error }
  }
}

// Tag operations
export const getTags = async () => {
  const { data, error } = await supabase.from('tags').select('*')
  return { data, error }
}

export const createTag = async (tagData) => {
  const { data, error } = await supabase.from('tags').insert(tagData).select().single()
  return { data, error }
}

export const updateTag = async (tagId, updates) => {
  const { data, error } = await supabase.from('tags').update(updates).eq('id', tagId).select().single()
  return { data, error }
}

export const deleteTag = async (tagId) => {
  const { error } = await supabase.from('tags').delete().eq('id', tagId)
  return { error }
}

export const getTagsForTicket = async (ticketId) => {
  const { data, error } = await supabase
    .from('ticket_tags')
    .select('tags(*)')
    .eq('ticket_id', ticketId)
  return { data, error }
}

export const addTagToTicket = async (ticketId, tagId) => {
  const { data, error } = await supabase
    .from('ticket_tags')
    .insert({ ticket_id: ticketId, tag_id: tagId })
    .select()
    .single()
  return { data, error }
}

export const removeTagFromTicket = async (ticketId, tagId) => {
  const { error } = await supabase
    .from('ticket_tags')
    .delete()
    .eq('ticket_id', ticketId)
    .eq('tag_id', tagId)
  return { error }
} 
