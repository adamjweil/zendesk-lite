import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getOrganizationUsers, getInvitations, createInvitation, deleteInvitation } from '../lib/database'
import { UserPlus, Mail, Clock, Trash2 } from 'lucide-react'

export default function Users() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [invitations, setInvitations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'agent',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [usersResponse, invitationsResponse] = await Promise.all([
        getOrganizationUsers(),
        getInvitations(),
      ])

      if (usersResponse.error) throw usersResponse.error
      if (invitationsResponse.error) throw invitationsResponse.error

      setUsers(usersResponse.data || [])
      setInvitations(invitationsResponse.data || [])
    } catch (error) {
      console.error('Error loading data:', error)
      setError('Failed to load users and invitations')
    } finally {
      setLoading(false)
    }
  }

  const handleInvite = async (e) => {
    e.preventDefault()
    setInviting(true)
    setError(null)

    try {
      const { error } = await createInvitation({
        email: inviteForm.email,
        role: inviteForm.role,
        organizationId: user?.organization?.id,
      })

      if (error) throw error

      // Reset form and close modal
      setInviteForm({ email: '', role: 'agent' })
      setShowInviteModal(false)
      
      // Reload data to show new invitation
      await loadData()
    } catch (error) {
      console.error('Error inviting user:', error)
      setError('Failed to send invitation')
    } finally {
      setInviting(false)
    }
  }

  const handleDeleteInvitation = async (invitationId) => {
    try {
      setError(null)
      const { error } = await deleteInvitation(invitationId)
      if (error) throw error

      // If successful, update the invitations list by filtering out the deleted one
      setInvitations(current => current.filter(inv => inv.id !== invitationId))
    } catch (error) {
      console.error('Error deleting invitation:', error)
      setError(error.message || 'Failed to delete invitation')
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
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
          <button
            onClick={() => setShowInviteModal(true)}
            className="btn btn-primary"
          >
            <UserPlus className="h-5 w-5 mr-2" />
            Invite User
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
        {error && (
          <div className="alert alert-error mt-6">
            <span>{error}</span>
          </div>
        )}

        {/* Active Users */}
        <div className="mt-8">
          <h2 className="text-lg font-medium text-gray-900">Active Users</h2>
          <div className="mt-4 overflow-hidden bg-white shadow sm:rounded-lg">
            <ul className="divide-y divide-gray-200">
              {users.map((user) => (
                <li key={user.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{user.full_name}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize bg-primary/10 text-primary">
                      {user.role}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Pending Invitations */}
        {invitations.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-medium text-gray-900">Pending Invitations</h2>
            <div className="mt-4 overflow-hidden bg-white shadow sm:rounded-lg">
              <ul className="divide-y divide-gray-200">
                {invitations.map((invitation) => (
                  <li key={invitation.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{invitation.email}</p>
                        <p className="text-sm text-gray-500 flex items-center">
                          <Mail className="h-4 w-4 mr-1" />
                          Invited by {invitation.inviter?.full_name}
                          <Clock className="h-4 w-4 ml-4 mr-1" />
                          Expires {new Date(invitation.expires_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize bg-primary/10 text-primary">
                          {invitation.role}
                        </span>
                        <button
                          onClick={() => handleDeleteInvitation(invitation.id)}
                          className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Invite User</h3>
            <form onSubmit={handleInvite} className="mt-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Email</span>
                </label>
                <input
                  type="email"
                  className="input input-bordered"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              <div className="form-control mt-4">
                <label className="label">
                  <span className="label-text">Role</span>
                </label>
                <select
                  className="select select-bordered"
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, role: e.target.value }))}
                >
                  <option value="agent">Agent</option>
                  <option value="admin">Admin</option>
                  <option value="customer">Customer</option>
                </select>
              </div>
              <div className="modal-action">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setShowInviteModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={inviting}
                >
                  {inviting ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={() => setShowInviteModal(false)}></div>
        </div>
      )}
    </div>
  )
} 