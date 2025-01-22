import { supabase } from './supabase'

export async function getAgentMetrics(startDate = null, endDate = null) {
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data, error } = await supabase
    .rpc('get_agent_ticket_metrics', {
      p_agent_id: user.id,
      p_start_date: startDate,
      p_end_date: endDate
    })

  if (error) {
    console.error('Error fetching agent metrics:', error)
    throw error
  }

  return data
}

export async function getAdminMetrics(startDate = null, endDate = null) {
  // First get the current user's profile
  const { data: { user } } = await supabase.auth.getUser()
  console.log('Current user:', user)

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*, organization:organizations(*)')
    .eq('id', user.id)
    .single()

  console.log('Profile data:', profile)
  console.log('Profile error:', profileError)

  if (profileError) {
    console.error('Error fetching profile:', profileError)
    throw profileError
  }

  if (!profile?.organization_id) {
    console.error('No organization found for profile:', profile)
    throw new Error('No organization found')
  }

  console.log('Using organization_id:', profile.organization_id)

  const { data, error } = await supabase
    .rpc('get_admin_ticket_metrics', {
      p_organization_id: profile.organization_id,
      p_start_date: startDate,
      p_end_date: endDate
    })

  console.log('Admin metrics data:', data)
  console.log('Admin metrics error:', error)

  if (error) {
    console.error('Error fetching admin metrics:', error)
    throw error
  }

  return data
} 