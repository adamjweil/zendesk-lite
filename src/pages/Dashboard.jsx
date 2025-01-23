import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquare, PlusCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { getRecentActivities, getTickets } from '../lib/database'
import { useAuth } from '../contexts/AuthContext'

export default function Dashboard() {
  const { profile } = useAuth()
  const [activities, setActivities] = useState([])
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [metadata, setMetadata] = useState(null)
  const [ticketPage, setTicketPage] = useState(1)
  const [ticketMetadata, setTicketMetadata] = useState(null)
  const TICKETS_PER_PAGE = 10

  useEffect(() => {
    if (profile?.role === 'admin') {
      loadActivities()
    } else {
      loadTickets()
    }
  }, [currentPage, ticketPage, profile])

  const loadActivities = async () => {
    setLoading(true)
    const { data, metadata: meta, error } = await getRecentActivities(currentPage)
    if (error) {
      console.error('Error loading activities:', error)
    } else {
      setActivities(data || [])
      setMetadata(meta)
    }
    setLoading(false)
  }

  const loadTickets = async () => {
    setLoading(true)
    const filters = {}
    
    if (profile?.role === 'agent') {
      filters.assignee_id = profile.id
    } else if (profile?.role === 'customer') {
      filters.creator_id = profile.id
    }

    filters.page = ticketPage
    filters.per_page = TICKETS_PER_PAGE

    const { data, error, metadata: meta } = await getTickets(filters)
    if (error) {
      console.error('Error loading tickets:', error)
    } else {
      setTickets(data || [])
      setTicketMetadata(meta)
    }
    setLoading(false)
  }

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1)
    }
  }

  const handleNextPage = () => {
    if (metadata && currentPage < metadata.totalPages) {
      setCurrentPage(prev => prev + 1)
    }
  }

  const handlePreviousTicketPage = () => {
    if (ticketPage > 1) {
      setTicketPage(prev => prev - 1)
    }
  }

  const handleNextTicketPage = () => {
    if (ticketMetadata && ticketPage < ticketMetadata.totalPages) {
      setTicketPage(prev => prev + 1)
    }
  }

  const getActivityIcon = (type) => {
    switch (type) {
      case 'ticket_created':
        return <PlusCircle className="h-5 w-5 text-green-500" />
      case 'comment_added':
        return <MessageSquare className="h-5 w-5 text-blue-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-500" />
    }
  }

  const getActivityMessage = (activity) => {
    switch (activity.type) {
      case 'ticket_created':
        return (
          <>
            <span className="font-medium">{activity.actor}</span>
            {' created ticket '}
            <Link to={`/tickets/${activity.ticket_id}`} className="font-medium text-primary hover:text-primary-dark">
              {activity.subject}
            </Link>
            {activity.assignee && (
              <>
                {' and assigned it to '}
                <span className="font-medium">{activity.assignee}</span>
              </>
            )}
          </>
        )
      case 'comment_added':
        return (
          <>
            <span className="font-medium">{activity.actor}</span>
            {' commented on '}
            <Link to={`/tickets/${activity.ticket_id}`} className="font-medium text-primary hover:text-primary-dark">
              {activity.subject}
            </Link>
            {activity.is_internal && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                Internal Note
              </span>
            )}
          </>
        )
      default:
        return null
    }
  }

  const renderTicketList = () => {
    if (loading) {
      return <div className="text-center py-8">Loading tickets...</div>
    }

    if (tickets.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          No tickets found
        </div>
      )
    }

    const openTickets = tickets.filter(ticket => ticket.status !== 'closed')
    const closedTickets = tickets.filter(ticket => ticket.status === 'closed')

    return (
      <div className="space-y-8">
        {/* Open Tickets */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {profile?.role === 'agent' ? 'Assigned to Me' : 'My Open Tickets'}
          </h3>
          <div className="overflow-hidden sm:rounded-md border border-gray-100">
            <ul className="divide-y divide-gray-200">
              {openTickets.map((ticket) => (
                <li key={ticket.id}>
                  <Link 
                    to={`/tickets/${ticket.id}`}
                    state={{ from: 'dashboard' }}
                    className="block hover:bg-gray-50"
                  >
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-primary truncate">{ticket.subject}</p>
                          <div className={`ml-2 flex-shrink-0 flex`}>
                            <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                              ${ticket.priority === 'high' ? 'bg-red-100 text-red-800' : 
                                ticket.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                                'bg-green-100 text-green-800'}`}>
                              {ticket.priority}
                            </p>
                          </div>
                        </div>
                        <div className="ml-2 flex-shrink-0 flex">
                          <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            {ticket.status}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500">
                            {profile?.role === 'agent' ? 
                              `Created by ${ticket.creator?.full_name}` : 
                              `Assigned to ${ticket.assignee?.full_name || 'Unassigned'}`}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                          <p>
                            Created {new Date(ticket.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Closed Tickets */}
        {closedTickets.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {profile?.role === 'agent' ? 'Recently Closed by Me' : 'My Closed Tickets'}
            </h3>
            <div className="overflow-hidden sm:rounded-md border border-gray-100">
              <ul className="divide-y divide-gray-200">
                {closedTickets.map((ticket) => (
                  <li key={ticket.id}>
                    <Link 
                      to={`/tickets/${ticket.id}`}
                      state={{ from: 'dashboard' }}
                      className="block hover:bg-gray-50"
                    >
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-600 truncate">{ticket.subject}</p>
                          <div className="ml-2 flex-shrink-0 flex">
                            <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                              Closed
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 sm:flex sm:justify-between">
                          <div className="sm:flex">
                            <p className="flex items-center text-sm text-gray-500">
                              {profile?.role === 'agent' ? 
                                `Created by ${ticket.creator?.full_name}` : 
                                `Assigned to ${ticket.assignee?.full_name || 'Unassigned'}`}
                            </p>
                          </div>
                          <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                            <p>
                              Closed {new Date(ticket.updated_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Ticket Pagination */}
        {ticketMetadata && ticketMetadata.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between pt-4 bg-white shadow rounded-lg p-6">
            <div className="flex flex-1 justify-between items-center">
              <button
                onClick={handlePreviousTicketPage}
                disabled={ticketPage === 1}
                className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                  ticketPage === 1
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </button>
              <span className="text-sm text-gray-700">
                Page {ticketPage} of {ticketMetadata.totalPages}
              </span>
              <button
                onClick={handleNextTicketPage}
                disabled={ticketPage >= ticketMetadata.totalPages}
                className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                  ticketPage >= ticketMetadata.totalPages
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderAdminDashboard = () => (
    <>
      {/* Recent Activity */}
      <div className="mt-8">
        <div className="rounded-lg bg-white shadow">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Recent Activity
              </h3>
              {metadata && (
                <span className="text-sm text-gray-500">
                  Showing {(currentPage - 1) * metadata.pageSize + 1} to{' '}
                  {Math.min(currentPage * metadata.pageSize, metadata.totalItems)} of{' '}
                  {metadata.totalItems} activities
                </span>
              )}
            </div>
            <div className="mt-4 flow-root max-h-[calc(100vh-24rem)] overflow-y-auto">
              <ul className="-mb-8">
                {loading ? (
                  <li className="text-sm text-gray-500">Loading activities...</li>
                ) : activities.length === 0 ? (
                  <li className="text-sm text-gray-500">No recent activity</li>
                ) : (
                  activities.map((activity, activityIdx) => (
                    <li key={activity.id}>
                      <div className="relative pb-8">
                        {activityIdx !== activities.length - 1 ? (
                          <span
                            className="absolute left-5 top-5 -ml-px h-full w-0.5 bg-gray-200"
                            aria-hidden="true"
                          />
                        ) : null}
                        <div className="relative flex items-start space-x-3">
                          <div className="relative">
                            {getActivityIcon(activity.type)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm text-gray-500">
                              {getActivityMessage(activity)}
                              <span className="whitespace-nowrap ml-2">
                                {new Date(activity.created_at).toLocaleString()}
                              </span>
                            </div>
                            {activity.type === 'comment_added' && !activity.is_internal && (
                              <div className="mt-2 text-sm text-gray-700">
                                {activity.content}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>

            {/* Pagination */}
            {metadata && metadata.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
                <div className="flex flex-1 justify-between items-center">
                  <button
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                      currentPage === 1
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Previous
                  </button>
                  <span className="text-sm text-gray-700">
                    Page {currentPage} of {metadata.totalPages}
                  </span>
                  <button
                    onClick={handleNextPage}
                    disabled={currentPage >= metadata.totalPages}
                    className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                      currentPage >= metadata.totalPages
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )

  return (
    <div className="py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          {profile?.role && (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
              ${profile.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                profile.role === 'agent' ? 'bg-blue-100 text-blue-800' :
                'bg-green-100 text-green-800'}`}>
              {profile.role}
            </span>
          )}
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8 pb-6">
        {profile?.role === 'admin' ? renderAdminDashboard() : renderTicketList()}
      </div>
    </div>
  )
} 