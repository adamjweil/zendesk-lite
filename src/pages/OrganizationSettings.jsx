import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getUserProfile, updateOrganization, getTags, createTag, updateTag, deleteTag, generateSupportEmail, deleteSupportEmail, deleteUser, getTicketsAssignedToUser } from '../lib/database'
import { Building, Mail, Copy, X, Trash2, AlertTriangle } from 'lucide-react'
import Users from './Users'
import Teams from './Teams'

function DeleteUserModal({ user, onClose, onConfirm, availableUsers }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [reassignTo, setReassignTo] = useState('')
  const [userTickets, setUserTickets] = useState([])
  const [loadingTickets, setLoadingTickets] = useState(true)

  useEffect(() => {
    const loadUserTickets = async () => {
      const { data, error } = await getTicketsAssignedToUser(user.id)
      if (error) {
        setError('Failed to load user tickets')
      } else {
        setUserTickets(data || [])
      }
      setLoadingTickets(false)
    }
    loadUserTickets()
  }, [user.id])

  const handleConfirm = async () => {
    try {
      setLoading(true)
      setError(null)
      await onConfirm(user.id, reassignTo || null)
      onClose()
    } catch (err) {
      setError('Failed to delete user')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-base-100 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-warning/10 rounded-full">
            <AlertTriangle className="h-6 w-6 text-warning" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2">Delete User</h3>
            <p className="text-sm text-base-content/70 mb-4">
              Are you sure you want to delete {user.full_name}? This action cannot be undone.
            </p>

            {loadingTickets ? (
              <div className="flex justify-center py-4">
                <span className="loading loading-spinner"></span>
              </div>
            ) : userTickets.length > 0 ? (
              <div className="mb-4">
                <p className="text-sm font-medium mb-2">
                  This user has {userTickets.length} assigned ticket{userTickets.length !== 1 ? 's' : ''}. 
                  Please select a user to reassign them to:
                </p>
                <select
                  className="select select-bordered w-full"
                  value={reassignTo}
                  onChange={(e) => setReassignTo(e.target.value)}
                >
                  <option value="">Leave tickets unassigned</option>
                  {availableUsers
                    .filter(u => u.id !== user.id)
                    .map(u => (
                      <option key={u.id} value={u.id}>{u.full_name}</option>
                    ))}
                </select>
              </div>
            ) : null}

            {error && (
              <div className="alert alert-error mb-4">
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="btn btn-ghost btn-sm"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="btn btn-error btn-sm"
                disabled={loading}
              >
                {loading ? <span className="loading loading-spinner"></span> : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OrganizationSettings() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [organization, setOrganization] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [generatingEmail, setGeneratingEmail] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    website: '',
    description: '',
    support_email: '',
  })
  const [tags, setTags] = useState([])
  const [newTag, setNewTag] = useState({ name: '', description: '' })
  const [showNewTagForm, setShowNewTagForm] = useState(false)
  const [notification, setNotification] = useState(null)

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
        support_email: profile.organization.support_email || '',
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
      support_email: organization.support_email || '',
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
      showNotification('Organization settings updated successfully')

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

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const handleGenerateSupportEmail = async () => {
    if (!organization?.id) return
    
    setGeneratingEmail(true)
    setError(null)
    
    try {
      const { data, error } = await generateSupportEmail(organization.id)
      if (error) throw error

      // Reload the organization data to ensure we have the latest state
      await loadOrganization()
      showNotification('Support email generated successfully')
    } catch (error) {
      console.error('Error generating support email:', error)
      setError('Failed to generate support email')
    } finally {
      setGeneratingEmail(false)
    }
  }

  const handleCopyEmail = async () => {
    if (!organization?.support_email) return
    
    try {
      await navigator.clipboard.writeText(organization.support_email)
      showNotification('Support email copied to clipboard')
    } catch (error) {
      console.error('Error copying to clipboard:', error)
      setError('Failed to copy email to clipboard')
    }
  }

  const handleDeleteSupportEmail = async () => {
    if (!organization?.id || !organization?.support_email) return
    
    try {
      const { error } = await deleteSupportEmail(organization.id)
      if (error) throw error

      // Reload the organization data
      await loadOrganization()
      showNotification('Support email deleted successfully')
    } catch (error) {
      console.error('Error deleting support email:', error)
      setError('Failed to delete support email')
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
    <div className="flex flex-col h-screen overflow-y-auto">
      <div className="flex-1 py-4">
        {notification && (
          <div className={`fixed top-4 right-4 z-50 max-w-sm animate-slide-in-right ${
            notification.type === 'success' ? 'bg-success/10 text-success-content' : 'bg-error/10 text-error-content'
          } rounded-lg p-3 shadow-lg`}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{notification.message}</p>
              <button
                onClick={() => setNotification(null)}
                className="ml-3 inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8 space-y-4 pb-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-base-200/50 rounded-lg p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <Building className="h-5 w-5 text-primary" />
                  <h1 className="text-lg font-semibold text-gray-900">
                    Organization Settings
                  </h1>
                </div>
                <button
                  onClick={() => setIsEditing(true)}
                  className="btn btn-xs btn-primary"
                  style={{ display: isEditing ? 'none' : 'block' }}
                >
                  Edit
                </button>
              </div>

              {error && (
                <div className="alert alert-error mt-2">
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {!isEditing ? (
                <div className="mt-3 space-y-3 max-w-2xl">
                  <div>
                    <h3 className="text-xs font-medium text-gray-500">Organization Name</h3>
                    <p className="mt-0.5 text-sm text-gray-900">{organization?.name}</p>
                  </div>

                  <div>
                    <h3 className="text-xs font-medium text-gray-500">Website</h3>
                    <p className="mt-0.5 text-sm text-gray-900">
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
                    <h3 className="text-xs font-medium text-gray-500">Description</h3>
                    <p className="mt-0.5 text-sm text-gray-900">
                      {organization?.description || <span className="text-gray-400">No description provided</span>}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xs font-medium text-gray-500">Support Email</h3>
                    {organization?.support_email ? (
                      <div className="mt-0.5 flex items-center gap-1">
                        <p className="text-sm text-gray-900 flex items-center gap-1">
                          <Mail className="h-3 w-3 text-gray-500" />
                          {organization.support_email}
                        </p>
                        <button
                          onClick={handleCopyEmail}
                          className="btn btn-xs btn-ghost"
                          title="Copy to clipboard"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                        <button
                          onClick={handleDeleteSupportEmail}
                          className="btn btn-xs btn-ghost text-error hover:bg-error/10"
                          title="Delete support email"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="mt-0.5">
                        <button
                          onClick={handleGenerateSupportEmail}
                          disabled={generatingEmail}
                          className="btn btn-xs btn-primary"
                        >
                          {generatingEmail ? 'Generating...' : 'Generate Support Email'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-3 space-y-3 max-w-2xl">
                  <div className="form-control">
                    <label className="label py-0.5">
                      <span className="label-text text-xs">Organization Name</span>
                    </label>
                    <input
                      type="text"
                      className="input input-sm input-bordered"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, name: e.target.value }))
                      }
                      required
                    />
                  </div>

                  <div className="form-control">
                    <label className="label py-0.5">
                      <span className="label-text text-xs">Website</span>
                    </label>
                    <input
                      type="url"
                      className="input input-sm input-bordered"
                      value={formData.website}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, website: e.target.value }))
                      }
                      placeholder="https://example.com"
                    />
                  </div>

                  <div className="form-control">
                    <label className="label py-0.5">
                      <span className="label-text text-xs">Description</span>
                    </label>
                    <textarea
                      className="textarea textarea-bordered h-12 text-sm"
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
                      className="btn btn-xs btn-ghost"
                      onClick={handleCancel}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-xs btn-primary"
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div className="bg-base-200/50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">Manage Tags</h2>
                <button
                  onClick={() => setShowNewTagForm(!showNewTagForm)}
                  className="btn btn-xs btn-primary"
                >
                  {showNewTagForm ? 'Cancel' : '+ Add Tag'}
                </button>
              </div>

              {showNewTagForm && (
                <form onSubmit={handleCreateTag} className="mt-3 space-y-3">
                  <div className="form-control">
                    <label className="label py-1">
                      <span className="label-text text-xs">Tag Name</span>
                    </label>
                    <input
                      type="text"
                      className="input input-sm input-bordered"
                      value={newTag.name}
                      onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-control">
                    <label className="label py-1">
                      <span className="label-text text-xs">Description</span>
                    </label>
                    <textarea
                      className="textarea textarea-bordered h-16 text-sm"
                      value={newTag.description}
                      onChange={(e) => setNewTag({ ...newTag, description: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="submit" className="btn btn-xs btn-primary">Add Tag</button>
                  </div>
                </form>
              )}

              <ul className="mt-3">
                {tags.map((tag) => (
                  <li key={tag.id} className="flex justify-between items-center py-1.5">
                    <div>
                      <span className="font-medium text-sm">{tag.name}</span>
                      <span className="text-gray-600 text-xs ml-2">- {tag.description}</span>
                    </div>
                    <div className="flex space-x-2">
                      <button onClick={() => handleUpdateTag(tag.id, { name: 'Updated Name' })} className="btn btn-xs">Edit</button>
                      <button onClick={() => handleDeleteTag(tag.id)} className="btn btn-xs btn-error">Delete</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-base-200/50 rounded-lg p-4">
            <Users />
          </div>

          <div className="bg-base-200/50 rounded-lg p-4">
            <Teams />
          </div>
        </div>
      </div>
    </div>
  )
} 