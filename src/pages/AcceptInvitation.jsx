import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getInvitationByToken } from '../lib/database'
import { signUp } from '../lib/supabase'

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [invitation, setInvitation] = useState(null)
  const [registering, setRegistering] = useState(false)
  const [form, setForm] = useState({
    fullName: '',
    password: '',
    confirmPassword: '',
  })

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link')
      setLoading(false)
      return
    }
    loadInvitation()
  }, [token])

  const loadInvitation = async () => {
    try {
      setLoading(true)
      const { data, error } = await getInvitationByToken(token)
      
      if (error) throw error
      if (!data) throw new Error('Invitation not found or expired')

      setInvitation(data)
    } catch (error) {
      console.error('Error loading invitation:', error)
      setError('This invitation link is invalid or has expired')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setRegistering(true)
    setError(null)

    try {
      console.log('Invitation data:', invitation)
      console.log('Form data:', form)
      
      const signupData = {
        email: invitation.email,
        password: form.password,
        fullName: form.fullName,
        role: invitation.role,
        organizationId: invitation.organization_id,
      }
      console.log('Attempting signup with:', signupData)
      
      const { error } = await signUp(signupData)

      if (error) {
        console.error('Signup error:', error)
        throw error
      }

      console.log('Signup successful, redirecting to login')
      // Redirect to login with success message
      navigate('/login', {
        state: {
          message: 'Account created successfully! Please sign in to continue.',
        },
      })
    } catch (error) {
      console.error('Error accepting invitation:', error)
      setError('Failed to create account. Please try again.')
    } finally {
      setRegistering(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({
      ...prev,
      [name]: value
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Invitation</h1>
          <p className="text-gray-600 mb-8">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="btn btn-primary"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <h1 className="text-center text-2xl font-bold leading-9 tracking-tight text-primary">
          Zendesk-Lite
        </h1>
        <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
          Accept Invitation
        </h2>
      </div>

      <div className="mt-4 sm:mx-auto sm:w-full sm:max-w-sm">
        <div className="bg-primary/5 rounded-lg p-4 mb-8">
          <p className="text-sm text-gray-600">
            You've been invited to join{' '}
            <span className="font-semibold">{invitation.organization.name}</span>{' '}
            as a{' '}
            <span className="font-semibold">{invitation.role}</span>
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-900">
              Email
            </label>
            <div className="mt-2">
              <input
                type="email"
                value={invitation.email}
                disabled
                className="input input-bordered w-full opacity-50"
              />
            </div>
          </div>

          <div>
            <label htmlFor="fullName" className="block text-sm font-medium leading-6 text-gray-900">
              Full Name
            </label>
            <div className="mt-2">
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                value={form.fullName}
                onChange={handleChange}
                className="input input-bordered w-full"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium leading-6 text-gray-900">
              Password
            </label>
            <div className="mt-2">
              <input
                id="password"
                name="password"
                type="password"
                required
                value={form.password}
                onChange={handleChange}
                className="input input-bordered w-full"
              />
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium leading-6 text-gray-900">
              Confirm Password
            </label>
            <div className="mt-2">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={form.confirmPassword}
                onChange={handleChange}
                className="input input-bordered w-full"
              />
            </div>
          </div>

          {error && (
            <div className="alert alert-error">
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={registering}
          >
            {registering ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  )
} 