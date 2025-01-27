import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

// Separate the hook definition
function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Main AuthProvider component
function AuthProvider({ children }) {
  console.log('AuthProvider mounting...')
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    console.log('Setting up auth listeners...')
    let subscription

    async function setupAuth() {
      try {
        // Initial session check
        console.log('Checking initial session...')
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Session error:', sessionError)
          setError(sessionError)
          setLoading(false)
          return
        }

        const session = sessionData.session
        console.log('Initial session:', session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          console.log('Fetching profile for user:', session.user.id)
          const profile = await fetchProfile(session.user.id)
          if (profile) {
            console.log('Profile loaded:', profile)
            console.log('Profile role:', profile.role)
            setProfile(profile)
          }
        }

        // Listen for auth changes
        const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('Auth state changed:', event, session)
          setUser(session?.user ?? null)
          
          if (session?.user) {
            const profile = await fetchProfile(session.user.id)
            if (profile) {
              console.log('Profile loaded:', profile)
              console.log('Profile role:', profile.role)
              setProfile(profile)
            }
          } else {
            setProfile(null)
          }
          setLoading(false)
        })

        subscription = sub
        setLoading(false)
      } catch (error) {
        console.error('Auth setup error:', error)
        setError(error)
        setLoading(false)
      }
    }

    setupAuth()

    return () => {
      console.log('Cleaning up auth listeners...')
      subscription?.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    try {
      console.log('Signing out...')
      await supabase.auth.signOut()
      setUser(null)
      setProfile(null)
    } catch (error) {
      console.error('Error signing out:', error)
      setError(error)
    }
  }

  if (error) {
    console.error('Rendering error state:', error)
    return <div className="p-4 text-red-500">Error: {error.message}</div>
  }

  console.log('Rendering AuthProvider:', { user, profile, loading })
  
  const value = {
    user,
    profile,
    loading,
    signOut,
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

const fetchProfile = async (userId) => {
  try {
    console.log('Fetching profile...')
    
    const { data: profile, error } = await supabase
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
      .maybeSingle()

    if (error) {
      console.error('Error fetching profile:', error)
      return null
    }

    if (profile) {
      console.log('Profile loaded with org:', profile)
      return profile
    }

    console.log('No profile found')
    return null
  } catch (error) {
    console.error('Unexpected error in fetchProfile:', error)
    return null
  }
}

// Export both the provider and the hook
export { AuthProvider, useAuth } 