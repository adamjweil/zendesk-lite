import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getUserProfile, updateOrganization } from '../lib/database'
import { Building } from 'lucide-react'

export default function OrganizationSettings() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [organization, setOrganization] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    website: '',
    description: '',
  })

  useEffect(() => {
    loadOrganization()
  }, [])

  const loadOrganization = async () => {
    try {
      setLoading(true)
      const { data: profile, error } = await getUserProfile(user?.id)
      
      if (error) throw error
      if (!profile?.organization) throw new Error('No organization found')
      if (profile.role !== 'admin') {
        navigate('/dashboard')
        return
      }

      setOrganization(profile.organization)
      setFormData({
        name: profile.organization.name || '',
        website: profile.organization.website || '',
        description: profile.organization.description || '',
      })
    } catch (error) {
      console.error('Error loading organization:', error)
      setError('Failed to load organization details')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const { error } = await updateOrganization(organization.id, formData)
      if (error) throw error

      // Show success message
      const successMessage = document.createElement('div')
      successMessage.className = 'alert alert-success mt-4'
      successMessage.textContent = 'Organization settings updated successfully'
      document.querySelector('.mx-auto.max-w-7xl').prepend(successMessage)
      setTimeout(() => successMessage.remove(), 3000)

      // Reload organization data
      await loadOrganization()
    } catch (error) {
      console.error('Error updating organization:', error)
      setError('Failed to update organization settings')
    } finally {
      setSaving(false)
    }
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
        <div className="flex items-center gap-4">
          <Building className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-semibold text-gray-900">
            Organization Settings
          </h1>
        </div>

        {error && (
          <div className="alert alert-error mt-6">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-6 max-w-2xl">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Organization Name</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              required
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Website</span>
            </label>
            <input
              type="url"
              className="input input-bordered"
              value={formData.website}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, website: e.target.value }))
              }
              placeholder="https://example.com"
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Description</span>
            </label>
            <textarea
              className="textarea textarea-bordered h-24"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Tell us about your organization..."
            />
          </div>

          <div className="flex justify-end">
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
  )
} 