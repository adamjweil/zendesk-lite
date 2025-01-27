import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getOrganizationUsers, getInvitations, createInvitation, deleteInvitation, updateUserRole, isCurrentUserAdmin, deleteUser, getTicketsAssignedToUser } from '../lib/database'
import { UserPlus, Mail, Clock, Trash2, UserCog, AlertTriangle } from 'lucide-react'

// Role badge color mapping
const getRoleBadgeColors = (role) => {
  switch (role) {
    case 'admin':
      return 'bg-red-100 text-red-800'
    case 'agent':
      return 'bg-blue-100 text-blue-800'
    case 'customer':
      return 'bg-green-100 text-green-800'
    default:
      return 'bg-primary/10 text-primary'
  }
}

// Add DeleteUserModal component
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

export default function Users() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [invitations, setInvitations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showUserModal, setShowUserModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [inviting, setInviting] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'agent',
  })
  const [userToDelete, setUserToDelete] = useState(null)

  useEffect(() => {
    loadData()
    checkAdminStatus()
  }, [])

  const checkAdminStatus = async () => {
    const adminStatus = await isCurrentUserAdmin()
    setIsAdmin(adminStatus)
  }

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
        organizationId: currentUser?.organization?.id,
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

  const handleUserClick = (user) => {
    if (isAdmin) {
      setSelectedUser(user)
      setShowUserModal(true)
    }
  }

  const handleUpdateRole = async (e) => {
    e.preventDefault()
    if (!selectedUser) return

    setUpdating(true)
    setError(null)

    try {
      const { error } = await updateUserRole(selectedUser.id, e.target.role.value)
      if (error) throw error

      // Update the users list with the new role
      setUsers(current =>
        current.map(u =>
          u.id === selectedUser.id
            ? { ...u, role: e.target.role.value }
            : u
        )
      )

      // Close modal
      setShowUserModal(false)
      setSelectedUser(null)
    } catch (error) {
      console.error('Error updating user role:', error)
      setError(error.message || 'Failed to update user role')
    } finally {
      setUpdating(false)
    }
  }

  const handleRoleChange = async (userId, newRole) => {
    try {
      const { error } = await updateUserRole(userId, newRole)
      if (error) throw error
      
      // Update local state
      setUsers(users.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ))
    } catch (error) {
      console.error('Error updating user role:', error)
      setError('Failed to update user role')
    }
  }

  const handleDeleteUser = async (userId, reassignTo) => {
    try {
      const { error } = await deleteUser(userId, reassignTo)
      if (error) throw error
      
      // Update local state
      setUsers(users.filter(u => u.id !== userId))
      setUserToDelete(null)
    } catch (error) {
      console.error('Error deleting user:', error)
      setError('Failed to delete user')
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
    <div className="py-2">
      <div className="mx-auto max-w-7xl px-2 sm:px-4 md:px-6">
        <div className="flex justify-between items-center">
          <h1 className="text-lg font-semibold text-gray-900">Users</h1>
          <button
            onClick={() => setShowInviteModal(true)}
            className="btn btn-xs btn-primary"
          >
            <UserPlus className="h-3 w-3 mr-1" />
            Invite User
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-2 sm:px-4 md:px-6">
        {error && (
          <div className="alert alert-error mt-2">
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Active Users */}
        <div className="mt-3">
          <h2 className="text-sm font-medium text-gray-900">Active Users</h2>
          <div className="mt-2 overflow-hidden bg-white shadow sm:rounded-lg">
            <ul className="divide-y divide-gray-200">
              {users.map((user) => (
                <li 
                  key={user.id} 
                  className={`px-3 py-2 ${isAdmin ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                  onClick={() => handleUserClick(user)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getRoleBadgeColors(user.role)}`}>
                        {user.role}
                      </span>
                      {isAdmin && user.id !== currentUser?.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setUserToDelete(user);
                          }}
                          className="text-error hover:text-error/70 p-1 rounded-full hover:bg-error/10"
                          title="Delete user"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Pending Invitations */}
        {invitations.length > 0 && (
          <div className="mt-3">
            <h2 className="text-sm font-medium text-gray-900">Pending Invitations</h2>
            <div className="mt-2 overflow-hidden bg-white shadow sm:rounded-lg">
              <ul className="divide-y divide-gray-200">
                {invitations.map((invitation) => (
                  <li key={invitation.id} className="px-3 py-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{invitation.email}</p>
                        <p className="text-xs text-gray-500 flex items-center">
                          <Mail className="h-3 w-3 mr-1" />
                          Invited by {invitation.inviter?.full_name}
                          <Clock className="h-3 w-3 ml-2 mr-1" />
                          Expires {new Date(invitation.expires_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getRoleBadgeColors(invitation.role)}`}>
                          {invitation.role}
                        </span>
                        <button
                          onClick={() => handleDeleteInvitation(invitation.id)}
                          className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
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
          <div className="modal-box max-w-sm">
            <h3 className="font-bold text-sm">Invite User</h3>
            <form onSubmit={handleInvite} className="mt-2">
              <div className="form-control">
                <label className="label py-0.5">
                  <span className="label-text text-xs">Email</span>
                </label>
                <input
                  type="email"
                  className="input input-bordered input-sm"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              <div className="form-control mt-2">
                <label className="label py-0.5">
                  <span className="label-text text-xs">Role</span>
                </label>
                <select
                  className="select select-bordered select-sm"
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, role: e.target.value }))}
                >
                  <option value="agent">Agent</option>
                  <option value="admin">Admin</option>
                  <option value="customer">Customer</option>
                </select>
              </div>
              <div className="modal-action mt-3">
                <button
                  type="button"
                  className="btn btn-xs"
                  onClick={() => setShowInviteModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-xs btn-primary"
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

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div className="modal modal-open">
          <div className="modal-box max-w-sm">
            <h3 className="font-bold text-sm">User Details</h3>
            <div className="mt-2">
              <p className="text-xs text-gray-500">Name</p>
              <p className="text-sm font-medium">{selectedUser.full_name}</p>
              
              <p className="text-xs text-gray-500 mt-2">Email</p>
              <p className="text-sm font-medium">{selectedUser.email}</p>

              <form onSubmit={handleUpdateRole} className="mt-2">
                <div className="form-control">
                  <label className="label py-0.5">
                    <span className="label-text text-xs">Role</span>
                  </label>
                  <select
                    name="role"
                    className="select select-bordered select-sm"
                    defaultValue={selectedUser.role}
                  >
                    <option value="agent">Agent</option>
                    <option value="admin">Admin</option>
                    <option value="customer">Customer</option>
                  </select>
                </div>
                <div className="modal-action mt-3">
                  <button
                    type="button"
                    className="btn btn-xs"
                    onClick={() => {
                      setShowUserModal(false)
                      setSelectedUser(null)
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-xs btn-primary"
                    disabled={updating}
                  >
                    {updating ? 'Updating...' : 'Update Role'}
                  </button>
                </div>
              </form>
            </div>
          </div>
          <div 
            className="modal-backdrop" 
            onClick={() => {
              setShowUserModal(false)
              setSelectedUser(null)
            }}
          ></div>
        </div>
      )}

      {userToDelete && (
        <DeleteUserModal
          user={userToDelete}
          onClose={() => setUserToDelete(null)}
          onConfirm={handleDeleteUser}
          availableUsers={users}
        />
      )}
    </div>
  )
} 