import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getUserProfile, updateOrganization, getTags, createTag, updateTag, deleteTag } from '../lib/database'
import { Building } from 'lucide-react'
import Users from './Users'

export default function OrganizationSettings() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [organization, setOrganization] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    website: '',
    description: '',
  })
  const [tags, setTags] = useState([])
  const [newTag, setNewTag] = useState({ name: '', description: '' })
  const [showNewTagForm, setShowNewTagForm] = useState(false)

  useEffect(() => {
    loadOrganization()
    loadTags()
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

  const loadTags = async () => {
    const { data, error } = await getTags()
    if (error) {
      console.error('Error loading tags:', error)
    } else {
      setTags(data || [])
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setFormData({
      name: organization.name || '',
      website: organization.website || '',
      description: organization.description || '',
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    console.log('Submitting form with data:', formData)

    try {
      const { error } = await updateOrganization(organization.id, formData)
      if (error) throw error

      console.log('Organization updated successfully')

      // Show success message
      const successMessage = document.createElement('div')
      successMessage.className = 'alert alert-success mt-4'
      successMessage.textContent = 'Organization settings updated successfully'
      document.querySelector('.mx-auto.max-w-7xl').prepend(successMessage)
      setTimeout(() => successMessage.remove(), 3000)

      // Reload organization data and close edit mode
      await loadOrganization()
      setIsEditing(false)
    } catch (error) {
      console.error('Error updating organization:', error)
      setError('Failed to update organization settings')
    } finally {
      console.log('Finished submitting form')
      setSaving(false)
    }
  }

  const handleCreateTag = async (e) => {
    e.preventDefault()
    const { error } = await createTag(newTag)
    if (error) {
      console.error('Error creating tag:', error)
    } else {
      setNewTag({ name: '', description: '' })
      loadTags()
    }
  }

  const handleUpdateTag = async (tagId, updates) => {
    const { error } = await updateTag(tagId, updates)
    if (error) {
      console.error('Error updating tag:', error)
    } else {
      loadTags()
    }
  }

  const handleDeleteTag = async (tagId) => {
    const { error } = await deleteTag(tagId)
    if (error) {
      console.error('Error deleting tag:', error)
    } else {
      loadTags()
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
    <div className="flex">
      <div className="flex-1 py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8 grid grid-cols-2 gap-8">
          <div>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <Building className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-semibold text-gray-900">
                  Organization Settings
                </h1>
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="btn btn-sm btn-primary"
                style={{ display: isEditing ? 'none' : 'block' }}
              >
                Edit
              </button>
            </div>

            {error && (
              <div className="alert alert-error mt-6">
                <span>{error}</span>
              </div>
            )}

            {!isEditing ? (
              <div className="mt-6 space-y-6 max-w-2xl">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Organization Name</h3>
                  <p className="mt-1 text-sm text-gray-900">{organization?.name}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500">Website</h3>
                  <p className="mt-1 text-sm text-gray-900">
                    {organization?.website ? (
                      <a href={organization.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {organization.website}
                      </a>
                    ) : (
                      <span className="text-gray-400">Not specified</span>
                    )}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500">Description</h3>
                  <p className="mt-1 text-sm text-gray-900">
                    {organization?.description || <span className="text-gray-400">No description provided</span>}
                  </p>
                </div>
              </div>
            ) : (
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

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Manage Tags</h2>
              <button
                onClick={() => setShowNewTagForm(!showNewTagForm)}
                className="btn btn-sm btn-primary"
              >
                {showNewTagForm ? 'Cancel' : '+ Add Tag'}
              </button>
            </div>

            {showNewTagForm && (
              <form onSubmit={handleCreateTag} className="mt-4 space-y-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Tag Name</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered"
                    value={newTag.name}
                    onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Description</span>
                  </label>
                  <textarea
                    className="textarea textarea-bordered h-24"
                    value={newTag.description}
                    onChange={(e) => setNewTag({ ...newTag, description: e.target.value })}
                  />
                </div>
                <div className="flex justify-end">
                  <button type="submit" className="btn btn-primary">Add Tag</button>
                  <button
                    type="button"
                    onClick={() => setShowNewTagForm(false)}
                    className="btn btn-secondary ml-2"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <ul className="mt-4">
              {tags.map((tag) => (
                <li key={tag.id} className="flex justify-between items-center py-2">
                  <div>
                    <span className="font-semibold">{tag.name}</span>
                    <span className="text-gray-600 ml-2">- {tag.description}</span>
                  </div>
                  <div className="flex space-x-2">
                    <button onClick={() => handleUpdateTag(tag.id, { name: 'Updated Name' })} className="btn btn-sm">Edit</button>
                    <button onClick={() => handleDeleteTag(tag.id)} className="btn btn-sm btn-error">Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8">
          <Users />
        </div>
      </div>
    </div>
  )
} 