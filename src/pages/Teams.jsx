import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Users, UserPlus, Trash2, Edit2, UserCheck, UserX } from 'lucide-react'

export default function Teams() {
  const { profile } = useAuth()
  const [teams, setTeams] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [showMembersModal, setShowMembersModal] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [teamForm, setTeamForm] = useState({
    name: '',
    description: '',
    leader_id: ''
  })

  // Add debugging for users state changes
  useEffect(() => {
    console.log('Users state changed:', users)
  }, [users])

  useEffect(() => {
    console.log('Profile in Teams component:', profile)
    if (profile?.organization?.id) {
      loadData()
    } else {
      console.log('Waiting for profile data...')
    }
  }, [profile])

  const loadData = async () => {
    try {
      if (!profile?.organization?.id) {
        console.error('No organization ID available:', profile)
        setError('No organization ID available')
        return
      }

      setLoading(true)
      setError(null)

      console.log('Loading data with organization ID:', profile.organization.id)

      // Fetch organization users first
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('organization_id', profile.organization.id)
        .order('full_name')

      if (usersError) {
        console.error('Error fetching users:', usersError)
        throw usersError
      }

      console.log('Fetched users:', usersData)
      setUsers(usersData || [])

      // Then fetch teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select(`
          *,
          leader:profiles!leader_id(*),
          members:team_members(
            user:profiles(*)
          )
        `)
        .eq('organization_id', profile.organization.id)
        .order('name')

      if (teamsError) {
        console.error('Error fetching teams:', teamsError)
        throw teamsError
      }

      console.log('Fetched teams:', teamsData)
      setTeams(teamsData || [])

    } catch (error) {
      console.error('Error loading data:', error)
      setError(error.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTeam = async (e) => {
    e.preventDefault()
    try {
      setError(null)

      const { data, error } = await supabase
        .from('teams')
        .insert([{
          ...teamForm,
          organization_id: profile.organization.id
        }])
        .select()
        .single()

      if (error) throw error

      // Reset form and close modal
      setTeamForm({ name: '', description: '', leader_id: '' })
      setShowTeamModal(false)
      
      // Reload data to show new team
      await loadData()
    } catch (error) {
      console.error('Error creating team:', error)
      setError('Failed to create team')
    }
  }

  const handleDeleteTeam = async (teamId) => {
    if (!confirm('Are you sure you want to delete this team?')) return

    try {
      setError(null)
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId)

      if (error) throw error

      // Remove team from state
      setTeams(current => current.filter(team => team.id !== teamId))
    } catch (error) {
      console.error('Error deleting team:', error)
      setError('Failed to delete team')
    }
  }

  const handleUpdateMembers = async (teamId, userId, isAdding) => {
    try {
      setError(null)
      if (isAdding) {
        const { error } = await supabase
          .from('team_members')
          .insert([{ team_id: teamId, user_id: userId }])

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('team_members')
          .delete()
          .eq('team_id', teamId)
          .eq('user_id', userId)

        if (error) throw error
      }

      // Reload data to show updated members
      await loadData()
    } catch (error) {
      console.error('Error updating team members:', error)
      setError('Failed to update team members')
    }
  }

  const handleOpenTeamModal = () => {
    console.log('Opening team modal, current users:', users)
    console.log('Current profile:', profile)
    setShowTeamModal(true)
    // If users array is empty, try loading data again
    if (!users.length) {
      loadData()
    }
  }

  const handleDropdownClick = async () => {
    console.log('Dropdown clicked')
    console.log('Current users:', users)
    console.log('Current profile:', profile)
    
    if (!users.length && profile?.organization?.id) {
      console.log('No users loaded, fetching users...')
      try {
        const { data: usersData, error: usersError } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .eq('organization_id', profile.organization.id)
          .order('full_name')

        if (usersError) {
          console.error('Error fetching users on dropdown click:', usersError)
          throw usersError
        }

        console.log('Fetched users on dropdown click:', usersData)
        setUsers(usersData || [])
      } catch (error) {
        console.error('Error loading users on dropdown click:', error)
        setError('Failed to load users')
      }
    }
  }

  if (!profile?.organization?.id) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="loading loading-spinner loading-lg"></span>
        <span className="ml-2">Loading profile data...</span>
      </div>
    )
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
          <h1 className="text-lg font-semibold text-gray-900">Teams</h1>
          {profile?.role === 'admin' && (
            <button
              onClick={handleOpenTeamModal}
              className="btn btn-xs btn-primary"
            >
              <UserPlus className="h-3 w-3 mr-1" />
              Create Team
            </button>
          )}
        </div>

        {error && (
          <div className="alert alert-error mt-2">
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Teams Grid */}
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <div
              key={team.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-3"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">
                    {team.name}
                  </h3>
                  {team.description && (
                    <p className="mt-0.5 text-xs text-gray-500">
                      {team.description}
                    </p>
                  )}
                </div>
                {profile?.role === 'admin' && (
                  <div className="flex space-x-1">
                    <button
                      onClick={() => {
                        setSelectedTeam(team)
                        setShowMembersModal(true)
                      }}
                      className="btn btn-xs btn-ghost"
                    >
                      <Users className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteTeam(team.id)}
                      className="btn btn-xs btn-ghost text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Team Info Row */}
              <div className="flex justify-between items-start gap-2 mt-2">
                {/* Team Leader */}
                {team.leader && (
                  <div className="flex-shrink-0">
                    <p className="text-xs font-medium text-gray-500">Team Leader</p>
                    <div className="mt-0.5 flex items-center">
                      <img
                        className="h-5 w-5 rounded-full"
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                          team.leader.full_name
                        )}&background=random`}
                        alt=""
                      />
                      <p className="ml-1 text-xs font-medium text-gray-900">
                        {team.leader.full_name}
                      </p>
                    </div>
                  </div>
                )}

                {/* Team Members */}
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-500">
                    Team Members ({team.members.length})
                  </p>
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {team.members.slice(0, 5).map(({ user }) => (
                      <img
                        key={user.id}
                        className="h-5 w-5 rounded-full ring-1 ring-white"
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                          user.full_name
                        )}&background=random`}
                        alt={user.full_name}
                        title={user.full_name}
                      />
                    ))}
                    {team.members.length > 5 && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-500">
                        +{team.members.length - 5}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Team Modal */}
      {showTeamModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-sm">
            <h3 className="font-bold text-sm">Create Team</h3>
            <form onSubmit={handleCreateTeam} className="mt-2">
              <div className="form-control">
                <label className="label py-0.5">
                  <span className="label-text text-xs">Team Name</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered input-sm"
                  value={teamForm.name}
                  onChange={(e) =>
                    setTeamForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="form-control mt-2">
                <label className="label py-0.5">
                  <span className="label-text text-xs">Description</span>
                </label>
                <textarea
                  className="textarea textarea-bordered h-12 text-sm"
                  value={teamForm.description}
                  onChange={(e) =>
                    setTeamForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="form-control mt-2">
                <label className="label py-0.5">
                  <span className="label-text text-xs">Team Leader</span>
                </label>
                <select
                  className="select select-bordered select-sm"
                  value={teamForm.leader_id}
                  onChange={(e) =>
                    setTeamForm((prev) => ({
                      ...prev,
                      leader_id: e.target.value,
                    }))
                  }
                  onClick={handleDropdownClick}
                  onFocus={handleDropdownClick}
                  required
                >
                  <option value="">Select a leader</option>
                  {users && users.length > 0 ? (
                    users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name} ({user.role})
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>No users available</option>
                  )}
                </select>
              </div>

              <div className="modal-action mt-3">
                <button
                  type="button"
                  className="btn btn-xs"
                  onClick={() => setShowTeamModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-xs btn-primary">
                  Create Team
                </button>
              </div>
            </form>
          </div>
          <div
            className="modal-backdrop"
            onClick={() => setShowTeamModal(false)}
          ></div>
        </div>
      )}

      {/* Manage Members Modal */}
      {showMembersModal && selectedTeam && (
        <div className="modal modal-open">
          <div className="modal-box max-w-sm">
            <h3 className="font-bold text-sm">Manage Team Members</h3>
            <div className="mt-2">
              <div className="space-y-2">
                {users.map((user) => {
                  const isMember = selectedTeam.members.some(
                    (m) => m.user.id === user.id
                  )
                  return (
                    <div
                      key={user.id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center">
                        <img
                          className="h-5 w-5 rounded-full"
                          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                            user.full_name
                          )}&background=random`}
                          alt=""
                        />
                        <div className="ml-2">
                          <p className="text-xs font-medium text-gray-900">
                            {user.full_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {user.role}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          handleUpdateMembers(selectedTeam.id, user.id, !isMember)
                        }
                        className={`btn btn-xs ${
                          isMember
                            ? 'btn-error'
                            : 'btn-primary'
                        }`}
                      >
                        {isMember ? (
                          <>
                            <UserX className="h-3 w-3 mr-1" />
                            Remove
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-3 w-3 mr-1" />
                            Add
                          </>
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="modal-action mt-3">
              <button
                className="btn btn-xs"
                onClick={() => {
                  setShowMembersModal(false)
                  setSelectedTeam(null)
                }}
              >
                Close
              </button>
            </div>
          </div>
          <div
            className="modal-backdrop"
            onClick={() => {
              setShowMembersModal(false)
              setSelectedTeam(null)
            }}
          ></div>
        </div>
      )}
    </div>
  )
} 