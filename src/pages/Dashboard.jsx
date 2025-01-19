import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Clock, Users, CheckCircle, AlertCircle, MessageSquare, PlusCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { getRecentActivities } from '../lib/database'

const stats = [
  { name: 'Open Tickets', value: '12', icon: AlertCircle, color: 'text-red-500' },
  { name: 'Resolved Today', value: '8', icon: CheckCircle, color: 'text-green-500' },
  { name: 'Average Response Time', value: '2.5h', icon: Clock, color: 'text-blue-500' },
  { name: 'Active Agents', value: '4', icon: Users, color: 'text-purple-500' },
]

export default function Dashboard() {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [metadata, setMetadata] = useState(null)

  useEffect(() => {
    loadActivities()
  }, [currentPage])

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

  return (
    <div className="py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
      </div>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
        {/* Stats */}
        <div className="mt-8">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.name}
                className="relative overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:px-6 sm:py-6"
              >
                <dt>
                  <div className={`absolute rounded-md p-3 ${stat.color} bg-opacity-10`}>
                    <stat.icon
                      className={`h-6 w-6 ${stat.color}`}
                      aria-hidden="true"
                    />
                  </div>
                  <p className="ml-16 truncate text-sm font-medium text-gray-500">
                    {stat.name}
                  </p>
                </dt>
                <dd className="ml-16 flex items-baseline">
                  <p className="text-2xl font-semibold text-gray-900">
                    {stat.value}
                  </p>
                </dd>
              </div>
            ))}
          </div>
        </div>

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
              <div className="mt-4 flow-root">
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
      </div>
    </div>
  )
} 