import { useState, useEffect } from 'react'
import { Plus, Filter, Search, Calendar, User, X, MessageSquare, Clock, AlertCircle, ChevronUp, ChevronDown, Users } from 'lucide-react'
import { getTickets, createTicket, getTicketComments, updateTicket, createComment, getTags, getTagsForTicket, addTagToTicket, removeTagFromTicket, getOrganizationUsers, getTeams, assignTicket } from '../lib/database'
import { useAuth } from '../contexts/AuthContext'

export default function Tickets() {
  const { profile } = useAuth()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    status: '',
    assignee_id: '',
  })
  const [showNewTicketModal, setShowNewTicketModal] = useState(false)
  const [showTicketDetailsModal, setShowTicketDetailsModal] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [ticketComments, setTicketComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [isInternalNote, setIsInternalNote] = useState(false)
  const [newTicket, setNewTicket] = useState({
    subject: '',
    description: '',
    priority: 'medium',
    category: '',
  })
  const [availableTags, setAvailableTags] = useState([])
  const [selectedTags, setSelectedTags] = useState([])
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [organizationUsers, setOrganizationUsers] = useState([])
  const [sortConfig, setSortConfig] = useState({
    key: 'created_at',
    direction: 'desc'
  })
  const [availableTeams, setAvailableTeams] = useState([])

  useEffect(() => {
    loadTickets()
    loadAvailableTags()
    loadOrganizationUsers()
    loadTeams()
  }, [])

  useEffect(() => {
    if (selectedTicket) {
      loadTicketComments()
      loadSelectedTags(selectedTicket.id)
    }
  }, [selectedTicket])

  useEffect(() => {
    loadTickets()
  }, [statusFilter, priorityFilter])

  const loadTickets = async () => {
    setLoading(true)
    const queryFilters = {
      ...filters,
      status: statusFilter,
      priority: priorityFilter
    }
    
    // Remove empty/undefined values
    Object.keys(queryFilters).forEach(key => {
      if (!queryFilters[key]) {
        delete queryFilters[key]
      }
    })

    console.log('Loading tickets with filters:', queryFilters)
    
    const { data, error } = await getTickets(queryFilters)
    if (error) {
      console.error('Error loading tickets:', error)
    } else {
      setTickets(data || [])
    }
    setLoading(false)
  }

  const loadTicketComments = async () => {
    if (!selectedTicket) return
    const { data, error } = await getTicketComments(selectedTicket.id)
    if (error) {
      console.error('Error loading comments:', error)
    } else {
      setTicketComments(data || [])
    }
  }

  const loadAvailableTags = async () => {
    const { data, error } = await getTags()
    if (error) {
      console.error('Error loading available tags:', error)
    } else {
      setAvailableTags(data || [])
    }
  }

  const loadSelectedTags = async (ticketId) => {
    const { data, error } = await getTagsForTicket(ticketId)
    if (error) {
      console.error('Error loading selected tags:', error)
    } else {
      setSelectedTags(data.map(tag => tag.tags) || [])
    }
  }

  const loadOrganizationUsers = async () => {
    const { data, error } = await getOrganizationUsers()
    if (error) {
      console.error('Error loading organization users:', error)
    } else {
      setOrganizationUsers(data || [])
    }
  }

  const loadTeams = async () => {
    const { data, error } = await getTeams()
    if (error) {
      console.error('Error loading teams:', error)
      return
    }
    setAvailableTeams(data)
  }

  const handleTicketClick = (ticket) => {
    console.log('Ticket data in table:', ticket);
    setSelectedTicket(ticket)
    setShowTicketDetailsModal(true)
  }

  const handleStatusChange = async (newStatus) => {
    const { error } = await updateTicket(selectedTicket.id, { status: newStatus })
    if (error) {
      console.error('Error updating ticket status:', error)
    } else {
      setSelectedTicket({ ...selectedTicket, status: newStatus })
      // Dispatch custom event to trigger sidebar update
      window.dispatchEvent(new CustomEvent('ticketUpdated'))
      loadTickets() // Refresh the list
    }
  }

  const handleAssignment = async (value) => {
    try {
      // Parse the composite value (format: "type:id")
      const [assigneeType, assignedTo] = value ? value.split(':') : [null, null]
      
      const { data, error } = await assignTicket(selectedTicket.id, {
        assigneeType,
        assignedTo
      })

      if (error) {
        console.error('Error assigning ticket:', error)
      } else {
        setSelectedTicket(data)
        // Dispatch custom event to trigger sidebar update
        window.dispatchEvent(new CustomEvent('ticketUpdated'))
        loadTickets() // Refresh the list
      }
    } catch (error) {
      console.error('Error in ticket assignment:', error)
    }
  }

  const handleAddComment = async (e) => {
    e.preventDefault()
    const commentData = {
      ticket_id: selectedTicket.id,
      author_id: profile.id,
      content: newComment,
      is_internal: isInternalNote,
    }

    const { error } = await createComment(commentData)
    if (error) {
      console.error('Error creating comment:', error)
    } else {
      setNewComment('')
      setIsInternalNote(false)
      loadTicketComments()
    }
  }

  const handleCreateTicket = async (e) => {
    e.preventDefault()
    const ticketData = {
      ...newTicket,
      creator_id: profile.id,
    }
    
    const { error } = await createTicket(ticketData)
    if (error) {
      console.error('Error creating ticket:', error)
    } else {
      setShowNewTicketModal(false)
      setNewTicket({
        subject: '',
        description: '',
        priority: 'medium',
        category: '',
      })
      loadTickets()
    }
  }

  const handleAddTagToTicket = async (tagId) => {
    const { error } = await addTagToTicket(selectedTicket.id, tagId)
    if (error) {
      console.error('Error adding tag to ticket:', error)
    } else {
      loadSelectedTags(selectedTicket.id)
    }
  }

  const handleRemoveTagFromTicket = async (tagId) => {
    const { error } = await removeTagFromTicket(selectedTicket.id, tagId)
    if (error) {
      console.error('Error removing tag from ticket:', error)
    } else {
      loadSelectedTags(selectedTicket.id)
    }
  }

  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }))
    
    // Sort the tickets
    const sortedTickets = [...tickets].sort((a, b) => {
      let aValue = a[key];
      let bValue = b[key];
      
      // Handle nested properties
      if (key === 'creator') aValue = a.creator?.full_name
      if (key === 'creator') bValue = b.creator?.full_name
      if (key === 'assignee') aValue = a.assignee?.full_name
      if (key === 'assignee') bValue = b.assignee?.full_name
      
      // Handle null values
      if (aValue === null) return 1
      if (bValue === null) return -1
      
      // Handle dates
      if (key === 'created_at') {
        return sortConfig.direction === 'asc' 
          ? new Date(aValue) - new Date(bValue)
          : new Date(bValue) - new Date(aValue)
      }
      
      // Handle strings
      if (typeof aValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }
      
      // Handle numbers
      return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue
    })
    
    setTickets(sortedTickets)
  }

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return null
    return sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
  }

  const priorityColors = {
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-blue-100 text-blue-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800',
  }

  const statusColors = {
    new: 'bg-purple-100 text-purple-800',
    open: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    resolved: 'bg-gray-100 text-gray-800',
    closed: 'bg-gray-100 text-gray-800',
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Tickets</h1>
        <button
          onClick={() => setShowNewTicketModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Ticket
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4 mb-6">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filters:</span>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-primary"
          >
            <option value="">All Status</option>
            <option value="new">New</option>
            <option value="open">Open</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-primary"
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          {(statusFilter || priorityFilter) && (
            <button
              onClick={() => {
                setStatusFilter('')
                setPriorityFilter('')
              }}
              className="inline-flex items-center p-1 border border-transparent rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-primary"
              title="Clear filters"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex-1 text-right">
          <span className="text-sm text-gray-500">
            {tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'} found
          </span>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="flex-1 bg-white shadow sm:rounded-lg flex flex-col min-h-0">
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden">
              <div className="min-w-full">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th 
                        scope="col" 
                        className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48"
                      >
                        <div className="relative">
                          <div className="flex items-center cursor-pointer hover:bg-gray-100 p-1 rounded" onClick={() => handleSort('status')}>
                            Status
                            {getSortIcon('status')}
                          </div>
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('subject')}
                      >
                        <div className="flex items-center">
                          Title
                          {getSortIcon('subject')}
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48"
                      >
                        <div className="relative">
                          <div className="flex items-center cursor-pointer hover:bg-gray-100 p-1 rounded" onClick={() => handleSort('priority')}>
                            Priority
                            {getSortIcon('priority')}
                          </div>
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-32"
                        onClick={() => handleSort('assignee')}
                      >
                        <div className="flex items-center">
                          Assigned To
                          {getSortIcon('assignee')}
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-48"
                        onClick={() => handleSort('created_at')}
                      >
                        <div className="flex items-center">
                          Created
                          {getSortIcon('created_at')}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200 overflow-y-auto">
                    {loading ? (
                      <tr>
                        <td colSpan="5" className="px-3 py-2 text-center text-gray-500">
                          Loading tickets...
                        </td>
                      </tr>
                    ) : tickets.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-3 py-2 text-center text-gray-500">
                          No tickets found
                        </td>
                      </tr>
                    ) : (
                      tickets.map((ticket) => (
                        <tr
                          key={ticket.id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleTicketClick(ticket)}
                        >
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-4 font-semibold rounded-full ${statusColors[ticket.status]}`}>
                              {ticket.status}
                            </span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <div className="text-xs font-medium text-primary">
                              {ticket.subject}
                            </div>
                            <div className="text-xs text-gray-500 truncate max-w-md">
                              {ticket.description}
                            </div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-4 font-semibold rounded-full ${priorityColors[ticket.priority]}`}>
                              {ticket.priority}
                            </span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <div className="text-xs text-gray-900">
                              {ticket.assignee_type === 'user' ? (
                                <div className="flex items-center">
                                  <User className="h-4 w-4 mr-1 text-gray-400" />
                                  <span>{ticket.assigned_user?.full_name}</span>
                                </div>
                              ) : ticket.assignee_type === 'team' ? (
                                <div className="flex items-center">
                                  <Users className="h-4 w-4 mr-1 text-gray-400" />
                                  <span>{ticket.assigned_team?.name}</span>
                                </div>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  Unassigned
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <div className="flex items-center text-xs">
                              <span className="text-gray-700">{new Date(ticket.created_at).toLocaleDateString()}</span>
                              <span className="text-[11px] text-gray-400 ml-1">by {ticket.creator?.full_name}</span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ticket Details Modal */}
      {showTicketDetailsModal && selectedTicket && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="absolute top-0 right-0 pt-4 pr-4">
                <button
                  type="button"
                  onClick={() => setShowTicketDetailsModal(false)}
                  className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  <span className="sr-only">Close</span>
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                {/* Ticket Header */}
                <div className="mb-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">
                        {selectedTicket.subject}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {new Date(selectedTicket.created_at).toLocaleDateString()}
                        </div>
                        <div>
                          Created by {selectedTicket.creator?.full_name}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-3">
                      <select
                        value={selectedTicket.status}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        className="inline-flex justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                      >
                        <option value="new">New</option>
                        <option value="open">Open</option>
                        <option value="pending">Pending</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                      <select
                        value={selectedTicket.assignee_type && selectedTicket.assigned_to 
                          ? `${selectedTicket.assignee_type}:${selectedTicket.assigned_to}`
                          : ''}
                        onChange={(e) => handleAssignment(e.target.value)}
                        className="inline-flex justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                      >
                        <option value="">Unassigned</option>
                        <optgroup label="Users">
                          {organizationUsers
                            .filter(user => ['admin', 'agent'].includes(user.role))
                            .map((user) => (
                              <option key={user.id} value={`user:${user.id}`}>
                                👤 {user.full_name}
                              </option>
                          ))}
                        </optgroup>
                        <optgroup label="Teams">
                          {availableTeams.map((team) => (
                            <option key={team.id} value={`team:${team.id}`}>
                              👥 {team.name}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                      <span className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium ${priorityColors[selectedTicket.priority]}`}>
                        {selectedTicket.priority}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 text-gray-700 bg-gray-50 p-4 rounded-md">
                    {selectedTicket.description}
                  </div>
                </div>

                {/* Comments Section */}
                <div className="border-t border-gray-200 pt-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Comments & Notes</h4>
                  <div className="space-y-4 max-h-96 overflow-y-auto mb-4">
                    {ticketComments.map((comment) => (
                      <div
                        key={comment.id}
                        className={`p-4 rounded-lg ${
                          comment.is_internal
                            ? 'bg-yellow-50 border border-yellow-100'
                            : 'bg-gray-50'
                        }`}
                      >
                        <div className="flex space-x-3">
                          <div className="flex-1">
                            <div className="text-sm">
                              <span className="font-medium text-gray-900">
                                {comment.author?.full_name}
                              </span>
                              {comment.is_internal && (
                                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  Internal Note
                                </span>
                              )}
                            </div>
                            <div className="mt-1 text-sm text-gray-700">
                              {comment.content}
                            </div>
                            <div className="mt-2 text-xs text-gray-500">
                              {new Date(comment.created_at).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Comment Form */}
                  <form onSubmit={handleAddComment}>
                    <div>
                      <label htmlFor="comment" className="sr-only">
                        Comment
                      </label>
                      <textarea
                        id="comment"
                        rows={3}
                        className="shadow-sm block w-full focus:ring-primary focus:border-primary sm:text-sm border border-gray-300 rounded-md"
                        placeholder="Add a comment or note..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        required
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center">
                        <input
                          id="is-internal"
                          type="checkbox"
                          className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                          checked={isInternalNote}
                          onChange={(e) => setIsInternalNote(e.target.checked)}
                        />
                        <label
                          htmlFor="is-internal"
                          className="ml-2 block text-sm text-gray-900"
                        >
                          Internal note
                        </label>
                      </div>
                      <button
                        type="submit"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                      >
                        <MessageSquare className="h-5 w-5 mr-2" />
                        Send
                      </button>
                    </div>
                  </form>
                </div>

                {/* Tags Section */}
                <div className="mt-4">
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedTags.map((tag) => (
                      <span key={tag.id} className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-gray-200 text-gray-800">
                        {tag.name}
                        <button onClick={() => handleRemoveTagFromTicket(tag.id)} className="ml-1 text-red-500">&times;</button>
                      </span>
                    ))}
                  </div>
                  <select
                    onChange={(e) => handleAddTagToTicket(e.target.value)}
                    className="mt-2 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                  >
                    <option value="">Add a tag</option>
                    {availableTags.map((tag) => (
                      <option key={tag.id} value={tag.id}>{tag.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Ticket Modal */}
      {showNewTicketModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <form onSubmit={handleCreateTicket}>
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Create New Ticket</h3>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                        Subject
                      </label>
                      <input
                        type="text"
                        id="subject"
                        required
                        value={newTicket.subject}
                        onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <textarea
                        id="description"
                        required
                        rows={4}
                        value={newTicket.description}
                        onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                        Priority
                      </label>
                      <select
                        id="priority"
                        value={newTicket.priority}
                        onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                        Category
                      </label>
                      <input
                        type="text"
                        id="category"
                        value={newTicket.category}
                        onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:col-start-2 sm:text-sm"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewTicketModal(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:mt-0 sm:col-start-1 sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 