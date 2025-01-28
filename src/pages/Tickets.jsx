import { useState, useEffect } from 'react'
import { Plus, Filter, Search, Calendar, User, X, MessageSquare, Clock, AlertCircle, ChevronUp, ChevronDown, Users, Upload, Download } from 'lucide-react'
import { getTickets, createTicket, getTicketComments, updateTicket, createComment, getTags, getTagsForTicket, addTagToTicket, removeTagFromTicket, getOrganizationUsers, getTeams, assignTicket, uploadFile, getTicketFiles, getFileUrl, deleteFile } from '../lib/database'
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
    assignee_type: '',
    assigned_to: '',
    tags: []
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
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [ticketFiles, setTicketFiles] = useState([])
  const [modalFiles, setModalFiles] = useState([])
  const [modalUploading, setModalUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [fileUrls, setFileUrls] = useState({})
  const [fullSizeFile, setFullSizeFile] = useState(null)

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
      loadTicketFiles()
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
      console.log('Tickets loaded:', data)
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

  const loadFileUrl = async (file) => {
    if (!fileUrls[file.id]) {
      const { data } = await getFileUrl(file.file_path)
      if (data) {
        setFileUrls(prev => ({
          ...prev,
          [file.id]: data.signedUrl
        }))
      }
    }
    return fileUrls[file.id]
  }

  const loadTicketFiles = async () => {
    if (!selectedTicket) return
    const { data, error } = await getTicketFiles(selectedTicket.id)
    if (error) {
      console.error('Error loading ticket files:', error)
    } else {
      setTicketFiles(data || [])
      // Load signed URLs for all image files
      const imageFiles = (data || []).filter(file => isImageFile(file.filename))
      for (const file of imageFiles) {
        loadFileUrl(file)
      }
    }
  }

  const handleFileDownload = async (file) => {
    const { data, error } = await getFileUrl(file.file_path)
    if (error) {
      console.error('Error getting file URL:', error)
    } else {
      window.open(data.signedUrl, '_blank')
    }
  }

  const handleFileDelete = async (fileId) => {
    const { error } = await deleteFile(fileId)
    if (error) {
      console.error('Error deleting file:', error)
    } else {
      loadTicketFiles()
    }
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
    setUploading(true)
    try {
      // First create the ticket
      const { tags, ...ticketData } = {
        ...newTicket,
        creator_id: profile.id,
        organization_id: profile.organization_id,
      }
      
      const { data: ticket, error } = await createTicket(ticketData)
      if (error) {
        console.error('Error creating ticket:', error)
        return
      }

      console.log('Created ticket:', ticket)

      // Upload files if any
      if (files.length > 0) {
        console.log('Uploading files:', files)
        for (const file of files) {
          const { error: uploadError } = await uploadFile(file, ticket.id)
          if (uploadError) {
            console.error('Error uploading file:', uploadError)
          }
        }
      }

      // Add tags to the ticket
      if (tags.length > 0) {
        for (const tagId of tags) {
          await addTagToTicket(ticket.id, tagId)
        }
      }
      
      setShowNewTicketModal(false)
      setNewTicket({
        subject: '',
        description: '',
        priority: 'medium',
        assignee_type: '',
        assigned_to: '',
        tags: []
      })
      setFiles([])
      // Ensure we reload tickets to get updated file attachment information
      await loadTickets()
    } catch (error) {
      console.error('Error in ticket creation:', error)
    } finally {
      setUploading(false)
    }
  }

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files)
    setFiles(prev => [...prev, ...newFiles])
  }

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
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

  const handleModalFileUpload = async (e) => {
    e.preventDefault()
    setModalUploading(true)
    try {
      const files = Array.from(e.target.files)
      for (const file of files) {
        const { error: uploadError } = await uploadFile(file, selectedTicket.id)
        if (uploadError) {
          console.error('Error uploading file:', uploadError)
        }
      }
      // Refresh the files list
      loadTicketFiles()
    } catch (error) {
      console.error('Error uploading files:', error)
    } finally {
      setModalUploading(false)
    }
  }

  const isImageFile = (filename) => {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp']
    const extension = filename.split('.').pop().toLowerCase()
    return imageExtensions.includes(extension)
  }

  const handlePreviewClick = async (file) => {
    const { data } = await getFileUrl(file.file_path)
    if (data) {
      setPreviewUrl(data.signedUrl)
    }
  }

  const handleExpandImage = (file) => {
    setFullSizeFile(file)
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
                            <div className="flex items-center">
                              <div className="flex-1">
                                <div className="text-xs font-medium text-primary">
                                  {ticket.subject}
                                  {ticket.has_attachments && (
                                    <span className="ml-2 inline-flex items-center group">
                                      <Upload 
                                        className="h-3.5 w-3.5 text-gray-400 group-hover:text-primary transition-colors duration-150" 
                                        title="Has attachments"
                                      />
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500 truncate mt-0.5">
                                  {ticket.description}
                                </div>
                              </div>
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

                {/* File Attachments Section */}
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-medium text-gray-900">Attachments</h3>
                    <div className="flex items-center space-x-2">
                      {fullSizeFile && (
                        <button
                          onClick={() => setFullSizeFile(null)}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Exit Full View
                        </button>
                      )}
                      <div className="relative">
                        <input
                          type="file"
                          multiple
                          onChange={handleModalFileUpload}
                          className="hidden"
                          id="modal-file-upload"
                          disabled={modalUploading}
                        />
                        <label
                          htmlFor="modal-file-upload"
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary cursor-pointer"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {modalUploading ? 'Uploading...' : 'Add Files'}
                        </label>
                      </div>
                    </div>
                  </div>
                  {fullSizeFile && isImageFile(fullSizeFile.filename) ? (
                    <div className="relative bg-gray-100 rounded-lg overflow-hidden" style={{ height: 'calc(100vh - 400px)' }}>
                      {fileUrls[fullSizeFile.id] ? (
                        <img
                          src={fileUrls[fullSizeFile.id]}
                          alt={fullSizeFile.filename}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="flex items-center justify-center w-full h-full">
                          <Upload className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                      <div className="absolute bottom-4 right-4 flex space-x-2">
                        <button
                          onClick={() => handleFileDownload(fullSizeFile)}
                          className="p-2 text-white bg-gray-800 bg-opacity-50 rounded-full hover:bg-opacity-75"
                          title="Download"
                        >
                          <Download className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleFileDelete(fullSizeFile.id)}
                          className="p-2 text-white bg-gray-800 bg-opacity-50 rounded-full hover:bg-opacity-75"
                          title="Delete"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {ticketFiles.map((file) => (
                        <div key={file.id} className="relative group">
                          {isImageFile(file.filename) ? (
                            <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                              <button
                                onClick={() => handlePreviewClick(file)}
                                className="w-full h-full flex items-center justify-center"
                              >
                                {fileUrls[file.id] ? (
                                  <img
                                    src={fileUrls[file.id]}
                                    alt={file.filename}
                                    className="object-cover w-full h-full"
                                  />
                                ) : (
                                  <div className="flex items-center justify-center w-full h-full">
                                    <Upload className="h-8 w-8 text-gray-400" />
                                  </div>
                                )}
                              </button>
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handleExpandImage(file)}
                                    className="p-2 text-white hover:text-blue-200"
                                    title="Expand"
                                  >
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => handleFileDownload(file)}
                                    className="p-2 text-white hover:text-blue-200"
                                    title="Download"
                                  >
                                    <Download className="h-5 w-5" />
                                  </button>
                                  <button
                                    onClick={() => handleFileDelete(file.id)}
                                    className="p-2 text-white hover:text-red-200"
                                    title="Delete"
                                  >
                                    <X className="h-5 w-5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="aspect-square bg-gray-50 rounded-lg p-4 flex flex-col items-center justify-center border border-gray-200">
                              <Upload className="h-8 w-8 text-gray-400 mb-2" />
                              <span className="text-sm text-gray-900 truncate w-full text-center">
                                {file.filename}
                              </span>
                              <span className="text-xs text-gray-500">
                                ({(file.size_bytes / 1024).toFixed(1)} KB)
                              </span>
                              <div className="mt-2 flex space-x-2">
                                <button
                                  onClick={() => handleFileDownload(file)}
                                  className="text-gray-600 hover:text-gray-900"
                                  title="Download"
                                >
                                  <Download className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleFileDelete(file.id)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Delete"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      {ticketFiles.length === 0 && (
                        <div className="col-span-full text-sm text-gray-500 text-center py-4">
                          No attachments yet
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Image Preview Modal */}
                {previewUrl && (
                  <div 
                    className="fixed z-50 inset-0 overflow-y-auto" 
                    onClick={() => setPreviewUrl(null)}
                  >
                    <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center">
                      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
                      <div className="relative inline-block bg-white rounded-lg overflow-hidden shadow-xl max-w-3xl max-h-[90vh]">
                        <img 
                          src={previewUrl} 
                          alt="Preview" 
                          className="max-w-full max-h-[90vh] object-contain"
                        />
                        <button
                          className="absolute top-4 right-4 text-white bg-gray-800 bg-opacity-50 rounded-full p-2 hover:bg-opacity-75"
                          onClick={(e) => {
                            e.stopPropagation()
                            setPreviewUrl(null)
                          }}
                        >
                          <X className="h-6 w-6" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

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
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Create New Ticket</h3>
                  <button
                    type="button"
                    onClick={() => setShowNewTicketModal(false)}
                    className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <form onSubmit={handleCreateTicket} className="bg-white">
                <div className="px-4 py-5 sm:p-6 space-y-6">
                  {/* Subject */}
                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                      Subject <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="subject"
                      required
                      value={newTicket.subject}
                      onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                      placeholder="Enter ticket subject"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <div className="mt-1">
                      <textarea
                        id="description"
                        required
                        rows={4}
                        value={newTicket.description}
                        onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                        className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border border-gray-300 rounded-md"
                        placeholder="Provide detailed information about the ticket..."
                      />
                    </div>
                  </div>

                  {/* Priority and Assignment Row */}
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                        Priority <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="priority"
                        value={newTicket.priority}
                        onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                      >
                        <option value="low">🟢 Low</option>
                        <option value="medium">🟡 Medium</option>
                        <option value="high">🟠 High</option>
                        <option value="urgent">🔴 Urgent</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="assignment" className="block text-sm font-medium text-gray-700">
                        Assign To
                      </label>
                      <select
                        id="assignment"
                        value={`${newTicket.assignee_type}:${newTicket.assigned_to}`}
                        onChange={(e) => {
                          const [assigneeType, assignedTo] = e.target.value.split(':')
                          setNewTicket({
                            ...newTicket,
                            assignee_type: assigneeType || '',
                            assigned_to: assignedTo || ''
                          })
                        }}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                      >
                        <option value="">-- Select Assignee --</option>
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
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tags
                    </label>
                    <div className="border border-gray-300 rounded-md p-4 bg-gray-50">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {availableTags.map((tag) => (
                          <label key={tag.id} className="inline-flex items-center bg-white px-3 py-2 rounded-md shadow-sm hover:bg-gray-50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={newTicket.tags.includes(tag.id)}
                              onChange={(e) => {
                                const updatedTags = e.target.checked
                                  ? [...newTicket.tags, tag.id]
                                  : newTicket.tags.filter(id => id !== tag.id)
                                setNewTicket({ ...newTicket, tags: updatedTags })
                              }}
                              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">{tag.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* File Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Attachments
                    </label>
                    <div className="space-y-4">
                      {/* File List */}
                      {files.length > 0 && (
                        <div className="space-y-2">
                          {files.map((file, index) => (
                            <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md">
                              <div className="flex items-center">
                                <Upload className="h-4 w-4 text-gray-400 mr-2" />
                                <span className="text-sm text-gray-600">{file.name}</span>
                                <span className="text-xs text-gray-400 ml-2">
                                  ({(file.size / 1024).toFixed(1)} KB)
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeFile(index)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Upload Button */}
                      <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                        <div className="space-y-1 text-center">
                          <Upload className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="flex text-sm text-gray-600">
                            <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary">
                              <span>Upload files</span>
                              <input
                                id="file-upload"
                                name="file-upload"
                                type="file"
                                multiple
                                className="sr-only"
                                onChange={handleFileChange}
                              />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                          </div>
                          <p className="text-xs text-gray-500">
                            Any file up to 10MB
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={uploading}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? 'Creating...' : 'Create Ticket'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewTicketModal(false)
                      setFiles([])
                    }}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
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