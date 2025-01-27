import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Auth helper functions
export const signUp = async ({ email, password, fullName, role = 'agent', organizationId = null }) => {
  console.log('Signing up with data:', { email, fullName, role, organizationId })
  const metadata = {
    full_name: fullName,
    role,
    organization_id: organizationId,
    organization_name: null,
  }
  console.log('Setting user metadata:', metadata)
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  })
  
  if (error) {
    console.error('Signup error:', error)
  } else {
    console.log('Signup successful:', data)
  }
  
  return { data, error }
}

export const signIn = async ({ email, password }) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

// Subscribe to auth changes
export const onAuthStateChange = (callback) => {
  return supabase.auth.onAuthStateChange(callback)
} 