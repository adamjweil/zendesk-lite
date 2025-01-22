import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getAgentMetrics, getAdminMetrics } from '../lib/analytics'
import { BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

const TimeFilter = ({ value, onChange }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="mt-1 block w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
  >
    <option value="all">All Time</option>
    <option value="7d">Last 7 Days</option>
    <option value="30d">Last 30 Days</option>
    <option value="90d">Last 90 Days</option>
    <option value="365d">Last Year</option>
  </select>
)

const MetricCard = ({ title, value, description }) => (
  <div className="bg-white overflow-hidden shadow rounded-lg">
    <div className="p-4">
      <div className="flex items-center">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
          {description && (
            <p className="mt-1 text-xs text-gray-500">{description}</p>
          )}
        </div>
      </div>
    </div>
  </div>
)

export default function Analytics() {
  const { profile } = useAuth()
  const [timeFilter, setTimeFilter] = useState('30d')
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const isAdmin = profile?.role === 'admin'

  useEffect(() => {
    loadMetrics()
  }, [timeFilter, profile])

  const getDateRange = () => {
    let end = new Date()
    let start = new Date()

    switch (timeFilter) {
      case '7d':
        start.setDate(end.getDate() - 7)
        break
      case '30d':
        start.setDate(end.getDate() - 30)
        break
      case '90d':
        start.setDate(end.getDate() - 90)
        break
      case '365d':
        start.setDate(end.getDate() - 365)
        break
      default:
        return { start: null, end: null }
    }

    return { start, end }
  }

  const loadMetrics = async () => {
    try {
      setLoading(true)
      const { start, end } = getDateRange()
      const data = isAdmin
        ? await getAdminMetrics(start, end)
        : await getAgentMetrics(start, end)
      setMetrics(data)
    } catch (error) {
      console.error('Error loading metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatHours = (hours) => {
    if (!hours) return 'N/A'
    if (hours < 24) return `${Math.round(hours)} hours`
    const days = Math.round(hours / 24)
    return `${days} days`
  }

  if (loading) {
    return (
      <div className="min-h-screen py-6 flex flex-col justify-center sm:py-12">
        <div className="flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2">Loading analytics...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-semibold text-gray-900">Analytics Dashboard</h1>
          <TimeFilter value={timeFilter} onChange={setTimeFilter} />
        </div>

        {isAdmin ? (
          // Admin View
          <div className="space-y-4 h-[calc(100vh-10rem)] overflow-auto">
            {/* Key Metrics */}
            <div className="grid grid-cols-3 gap-4">
              <MetricCard
                title="Total Tickets"
                value={metrics?.total_tickets || 0}
              />
              <MetricCard
                title="Open Tickets"
                value={metrics?.open_tickets || 0}
              />
              <MetricCard
                title="Closed Tickets"
                value={metrics?.closed_tickets || 0}
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-2 gap-4">
              {/* Priority Distribution */}
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Tickets by Priority</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={Object.entries(metrics?.tickets_by_priority || {}).map(([name, value], index) => ({
                          name,
                          value,
                          fill: COLORS[index % COLORS.length]
                        }))}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label
                      />
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Status Distribution */}
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Tickets by Status</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={Object.entries(metrics?.tickets_by_status || {}).map(([name, value]) => ({
                        name,
                        value
                      }))}
                      margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Assignee Distribution */}
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Tickets by Assignee</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={Object.entries(metrics?.tickets_by_assignee || {}).map(([name, value], index) => ({
                          name,
                          value,
                          fill: COLORS[index % COLORS.length]
                        }))}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label
                      />
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Daily Ticket Trend */}
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Daily Ticket Trend</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={metrics?.daily_ticket_counts || []}
                      margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(date) => new Date(date).toLocaleDateString()}
                      />
                      <YAxis />
                      <Tooltip
                        labelFormatter={(date) => new Date(date).toLocaleDateString()}
                      />
                      <Line type="monotone" dataKey="count" stroke="#8884d8" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Agent View
          <div className="h-[calc(100vh-10rem)]">
            <div className="grid grid-cols-4 gap-4">
              <MetricCard
                title="Open Tickets"
                value={metrics?.open_tickets || 0}
              />
              <MetricCard
                title="Closed Tickets"
                value={metrics?.closed_tickets || 0}
              />
              <MetricCard
                title="Average Time Open"
                value={formatHours(metrics?.avg_time_open)}
                description="Average time tickets remain open"
              />
              <MetricCard
                title="Average Time to Close"
                value={formatHours(metrics?.avg_time_to_close)}
                description="Average time to resolve tickets"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 