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
        organization:organizations(id, name)
      `)
      .eq('token', token)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single()

    if (error) throw error
    if (!data) throw new Error('Invitation not found or expired')

    return { data, error: null }
  } catch (error) {
    console.error('Error fetching invitation:', error)
    return { data: null, error }
  }
}

export const deleteInvitation = async (invitationId) => {
  try {
    // First verify the current user is an admin
    const isAdmin = await isCurrentUserAdmin()
    if (!isAdmin) {
      throw new Error('Only admins can delete invitations')
    }

    // Get the user's organization_id to verify ownership
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
    // First get tickets
    const query = supabase
      .from('tickets')
      .select(`
        *,
        creator:profiles!tickets_creator_id_fkey(*),
        file_attachments(id)
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        // Map assignee_id to the new assignment system
        if (key === 'assignee_id') {
          query.eq('assignee_type', 'user').eq('assigned_to', value);
        } else {
          query.eq(key, value);
        }
      }
    });

    const { data: tickets, error } = await query;
    if (error) throw error;

    // Then get profiles and teams for mapping
    const [{ data: profiles }, { data: teams }] = await Promise.all([
      supabase.from('profiles').select('id, full_name'),
      supabase.from('teams').select('id, name')
    ]);

    // Create lookup maps
    const profileMap = Object.fromEntries(profiles?.map(p => [p.id, p.full_name]) || []);
    const teamMap = Object.fromEntries(teams?.map(t => [t.id, t.name]) || []);

    // Enhance tickets with user and team information
    const enhancedTickets = tickets.map(ticket => ({
      ...ticket,
      creator: profiles?.find(p => p.id === ticket.creator_id),
      assigned_user: ticket.assignee_type === 'user' ? { id: ticket.assigned_to, full_name: profileMap[ticket.assigned_to] } : null,
      assigned_team: ticket.assignee_type === 'team' ? { id: ticket.assigned_to, name: teamMap[ticket.assigned_to] } : null,
      has_attachments: ticket.file_attachments && ticket.file_attachments.length > 0
    }));

    return { data: enhancedTickets, error: null };
  } catch (error) {
    console.error('Error in getTickets:', error);
    return { data: null, error };
  }
}

export const createTicket = async (ticketData) => {
  try {
    // Generate a UUID using the browser's crypto API
    const ticketId = crypto.randomUUID()
    
    const { data, error } = await supabase
      .from('tickets')
      .insert([{ id: ticketId, ...ticketData }])
      .select(`
        *,
        creator:profiles!creator_id(*),
        assignee:profiles(*)
      `)
      .single();

    if (error) {
      console.error('Error creating ticket:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error in createTicket:', error);
    return { data: null, error };
  }
}

export const updateTicket = async (ticketId, updates) => {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .update(updates)
      .eq('id', ticketId)
      .select(`
        *,
        creator:profiles!creator_id(*),
        assignee:profiles(*)
      `)
      .single();

    if (error) {
      console.error('Error updating ticket:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error in updateTicket:', error);
    return { data: null, error };
  }
}

export const assignTicket = async (ticketId, { assigneeType, assignedTo }) => {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .update({
        assignee_type: assigneeType,
        assigned_to: assignedTo
      })
      .eq('id', ticketId)
      .select(`
        *,
        creator:profiles!creator_id(*),
        assignee:profiles(*)
      `)
      .single();

    if (error) {
      console.error('Error assigning ticket:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error in assignTicket:', error);
    return { data: null, error };
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
export const getRecentActivities = async (page = 1, pageSize = 15) => {
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
          assignee:profiles(id, full_name)
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

    if (ticketsResponse.error) throw ticketsResponse.error
    if (commentsResponse.error) throw commentsResponse.error

    // Get total counts for pagination
    const [{ count: ticketsCount }, { count: commentsCount }] = await Promise.all([
      supabase.from('tickets').select('*', { count: 'exact', head: true }),
      supabase.from('comments').select('*', { count: 'exact', head: true })
    ])

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

// Agent statistics
export const getAgentStats = async (agentId) => {
  try {
    const { data: openTickets, error: openError } = await supabase
      .from('tickets')
      .select('id, created_at')
      .eq('assignee_id', agentId)
      .neq('status', 'closed')

    const { data: closedTickets, error: closedError } = await supabase
      .from('tickets')
      .select('id, created_at, updated_at')
      .eq('assignee_id', agentId)
      .eq('status', 'closed')

    if (openError || closedError) throw openError || closedError

    // Calculate average time tickets have been open
    const now = new Date()
    let totalOpenTime = 0
    openTickets.forEach(ticket => {
      const createdAt = new Date(ticket.created_at)
      totalOpenTime += now - createdAt
    })

    // Calculate average time to close tickets
    let totalTimeToClose = 0
    closedTickets.forEach(ticket => {
      const createdAt = new Date(ticket.created_at)
      const closedAt = new Date(ticket.updated_at)
      totalTimeToClose += closedAt - createdAt
    })

    const stats = {
      openTickets: openTickets.length,
      closedTickets: closedTickets.length,
      averageOpenTime: openTickets.length ? Math.round(totalOpenTime / openTickets.length / (1000 * 60 * 60)) : 0, // in hours
      averageTimeToClose: closedTickets.length ? Math.round(totalTimeToClose / closedTickets.length / (1000 * 60 * 60)) : 0 // in hours
    }

    return { data: stats, error: null }
  } catch (error) {
    console.error('Error fetching agent stats:', error)
    return { data: null, error }
  }
}

// Simple function to get teams
export const getTeams = async () => {
  try {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .order('name');

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching teams:', error);
    return { data: null, error };
  }
}

// Delete user and optionally reassign their tickets
export const deleteUser = async (userId, reassignTicketsTo = null) => {
  try {
    // First verify the current user is an admin
    const isAdmin = await isCurrentUserAdmin()
    if (!isAdmin) {
      throw new Error('Only admins can delete users')
    }

    // Start a transaction to handle ticket reassignment and user deletion
    const { error } = await supabase.rpc('delete_user_and_reassign_tickets', {
      user_id_to_delete: userId,
      reassign_to_user_id: reassignTicketsTo
    })

    if (error) throw error
    return { error: null }
  } catch (error) {
    console.error('Error deleting user:', error)
    return { error }
  }
}

// Get tickets assigned to a specific user
export const getTicketsAssignedToUser = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .select(`
        id,
        subject,
        status,
        priority,
        assignee_type,
        assigned_to
      `)
      .eq('assignee_type', 'user')
      .eq('assigned_to', userId)

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching user tickets:', error)
    return { data: null, error }
  }
}

// File attachment operations
export const uploadFile = async (file, ticketId) => {
  try {
    console.log('Starting file upload for ticket:', ticketId)
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `${ticketId}/${fileName}`

    console.log('Uploading to storage:', filePath)
    // Upload to Supabase Storage
    const { data: storageData, error: uploadError } = await supabase.storage
      .from('ticket-attachments')  // Make sure this matches your bucket name exactly
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      throw uploadError
    }

    console.log('Storage upload successful:', storageData)
    console.log('Creating file attachment record')
    
    // Create file attachment record
    const { data, error: dbError } = await supabase
      .from('file_attachments')
      .insert([{
        ticket_id: ticketId,
        filename: file.name,
        file_path: filePath,
        content_type: file.type,
        size_bytes: file.size,
        uploaded_by: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single()

    if (dbError) {
      console.error('Database record creation error:', dbError)
      throw dbError
    }

    console.log('File upload completed successfully:', data)
    return { data, error: null }
  } catch (error) {
    console.error('Error in uploadFile:', error)
    return { data: null, error }
  }
}

export const getTicketFiles = async (ticketId) => {
  try {
    const { data, error } = await supabase
      .from('file_attachments')
      .select(`
        *,
        uploader:profiles!uploaded_by(full_name)
      `)
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching ticket files:', error)
    return { data: null, error }
  }
}

export const deleteFile = async (fileId) => {
  try {
    // First get the file path
    const { data: file, error: fetchError } = await supabase
      .from('file_attachments')
      .select('file_path')
      .eq('id', fileId)
      .single()

    if (fetchError) throw fetchError

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('ticket-attachments')
      .remove([file.file_path])

    if (storageError) throw storageError

    // Delete the record
    const { error: deleteError } = await supabase
      .from('file_attachments')
      .delete()
      .eq('id', fileId)

    if (deleteError) throw deleteError

    return { error: null }
  } catch (error) {
    console.error('Error deleting file:', error)
    return { error }
  }
}

export const getFileUrl = async (filePath) => {
  try {
    const { data, error } = await supabase.storage
      .from('ticket-attachments')
      .createSignedUrl(filePath, 3600) // URL valid for 1 hour

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error getting file URL:', error)
    return { data: null, error }
  }
} 
