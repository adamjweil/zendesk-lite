import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getTickets, updateTicket, getTicketComments, createComment, getOrganizationUsers } from '../lib/database'
import { MessageSquare, Clock, AlertCircle } from 'lucide-react'

export default function TicketDetails() {
  const { ticketId } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [ticket, setTicket] = useState(null)
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [isInternalNote, setIsInternalNote] = useState(false)
  const [organizationUsers, setOrganizationUsers] = useState([])

  useEffect(() => {
    loadTicketDetails()
    loadOrganizationUsers()
  }, [ticketId])

  const loadOrganizationUsers = async () => {
    const { data, error } = await getOrganizationUsers()
    if (error) {
      console.error('Error loading organization users:', error)
    } else {
      setOrganizationUsers(data || [])
    }
  }

  const loadTicketDetails = async () => {
    setLoading(true)
    const [ticketResponse, commentsResponse] = await Promise.all([
      getTickets({ id: ticketId }),
      getTicketComments(ticketId)
    ])

    if (ticketResponse.error) {
      console.error('Error loading ticket:', ticketResponse.error)
      navigate('/tickets')
    } else {
      setTicket(ticketResponse.data?.[0])
    }

    if (commentsResponse.error) {
      console.error('Error loading comments:', commentsResponse.error)
    } else {
      setComments(commentsResponse.data || [])
    }

    setLoading(false)
  }

  const handleStatusChange = async (newStatus) => {
    const { error } = await updateTicket(ticketId, { status: newStatus })
    if (error) {
      console.error('Error updating ticket status:', error)
    } else {
      loadTicketDetails()
    }
  }

  const handleAssigneeChange = async (newAssigneeId) => {
    const { error } = await updateTicket(ticketId, { assignee_id: newAssigneeId })
    if (error) {
      console.error('Error updating ticket assignee:', error)
    } else {
      loadTicketDetails()
    }
  }

  const handleAddComment = async (e) => {
    e.preventDefault()
    const commentData = {
      ticket_id: ticketId,
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
      loadTicketDetails()
    }
  }

  useEffect(() => {
    if (ticket) {
      console.log('Selected ticket:', ticket)
    }
  }, [ticket])

  if (loading) {
    return <div className="p-4">Loading ticket details...</div>
  }

  if (!ticket) {
    return <div className="p-4">Ticket not found</div>
  }

  return (
    <div className="h-full flex flex-col">
      {/* Ticket Header */}
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6 mb-6">
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              {ticket.subject}
            </h2>
            <div className="mt-1 flex flex-col sm:flex-row sm:flex-wrap sm:mt-0 sm:space-x-6">
              <div className="mt-2 flex items-center text-sm text-gray-500">
                <Clock className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                Created {new Date(ticket.created_at).toLocaleDateString()}
              </div>
              <div className="mt-2 flex items-center text-sm text-gray-500">
                <AlertCircle className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                Priority: {ticket.priority}
              </div>
            </div>
          </div>
          <div className="mt-4 flex space-x-3 md:mt-0 md:ml-4">
            <select
              value={ticket.status}
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
              value={ticket.assignee_id || ''}
              onChange={(e) => handleAssigneeChange(e.target.value)}
              className="inline-flex justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <option value="">Unassigned</option>
              {organizationUsers
                .filter(user => ['admin', 'agent'].includes(user.role))
                .map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name}
                  </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4">
          <div className="prose max-w-none">
            <p>{ticket.description}</p>
          </div>
        </div>
      </div>

      {/* Comments Section */}
      <div className="bg-white shadow sm:rounded-lg flex-1 overflow-hidden flex flex-col">
        <div className="px-4 py-5 sm:p-6 flex-1 overflow-y-auto">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Comments & Notes
          </h3>
          <div className="space-y-4">
            {comments.map((comment) => (
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
        </div>

        {/* Add Comment Form */}
        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
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
      </div>
    </div>
  )
} 