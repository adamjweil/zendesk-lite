import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getUserProfile, updateUserProfile } from '../lib/database'

export default function Profile() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [profile, setProfile] = useState({
    full_name: '',
    title: '',
    phone: '',
    avatar_url: '',
  })

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return
      setLoading(true)
      setError(null)

      const { data, error } = await getUserProfile(user.id)
      
      if (error) {
        console.error('Error loading profile:', error)
        setError('Failed to load profile. Please try again later.')
      } else if (data) {
        setProfile({
          full_name: data.full_name || '',
          title: data.title || '',
          phone: data.phone || '',
          avatar_url: data.avatar_url || '',
        })
      }
      setLoading(false)
    }

    loadProfile()
  }, [user])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    const { error } = await updateUserProfile(user.id, {
      full_name: profile.full_name,
      title: profile.title,
      phone: profile.phone,
      avatar_url: profile.avatar_url,
    })

    if (error) {
      console.error('Error updating profile:', error)
      setError('Failed to update profile. Please try again later.')
    } else {
      setSuccess(true)
    }
    setSaving(false)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setProfile(prev => ({
      ...prev,
      [name]: value
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }

  return (
    <div className="py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">Profile Settings</h1>
      </div>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
        <div className="py-8">
          <div className="bg-white shadow sm:rounded-lg">
            <form onSubmit={handleSubmit} className="space-y-6 p-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <div className="mt-1">
                  <input
                    type="email"
                    name="email"
                    id="email"
                    value={user?.email || ''}
                    disabled
                    className="input input-bordered w-full max-w-md opacity-50"
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Email cannot be changed
                </p>
              </div>

              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="full_name"
                    id="full_name"
                    value={profile.full_name}
                    onChange={handleChange}
                    className="input input-bordered w-full max-w-md"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  Job Title
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="title"
                    id="title"
                    value={profile.title}
                    onChange={handleChange}
                    className="input input-bordered w-full max-w-md"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone Number
                </label>
                <div className="mt-1">
                  <input
                    type="tel"
                    name="phone"
                    id="phone"
                    value={profile.phone}
                    onChange={handleChange}
                    className="input input-bordered w-full max-w-md"
                  />
                </div>
              </div>

              {error && (
                <div className="alert alert-error">
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="alert alert-success">
                  <span>Profile updated successfully!</span>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
} 