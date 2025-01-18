import { supabase } from './supabase'

// User profile operations
export const getUserProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return { data: null, error }
  }
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
    .select(`
      *,
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