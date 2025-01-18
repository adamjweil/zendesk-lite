import { Clock, Users, CheckCircle, AlertCircle } from 'lucide-react'

const stats = [
  { name: 'Open Tickets', value: '12', icon: AlertCircle, color: 'text-red-500' },
  { name: 'Resolved Today', value: '8', icon: CheckCircle, color: 'text-green-500' },
  { name: 'Average Response Time', value: '2.5h', icon: Clock, color: 'text-blue-500' },
  { name: 'Active Agents', value: '4', icon: Users, color: 'text-purple-500' },
]

export default function Dashboard() {
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
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Recent Activity
              </h3>
              <div className="mt-4">
                <p className="text-sm text-gray-500">
                  Activity feed coming soon...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 