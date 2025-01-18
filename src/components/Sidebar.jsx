import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { 
  LayoutDashboard, 
  Ticket, 
  Users, 
  LogOut,
  Building,
  User,
} from 'lucide-react'

export default function Sidebar() {
  console.log('Sidebar component mounting...')
  const location = useLocation()
  const { user, profile, signOut } = useAuth()
  
  console.log('Profile in Sidebar:', profile)
  console.log('Organization data:', profile?.organization)
  console.log('Organization name:', profile?.organization?.name)
  
  const isAdmin = profile?.role === 'admin'
  console.log('Is Admin:', isAdmin)

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      current: location.pathname === '/dashboard',
    },
    {
      name: 'Tickets',
      href: '/tickets',
      icon: Ticket,
      current: location.pathname === '/tickets',
    },
    {
      name: 'Users',
      href: '/users',
      icon: Users,
      current: location.pathname === '/users',
    },
    {
      name: 'Profile',
      href: '/profile',
      icon: User,
      current: location.pathname === '/profile',
    },
    // Only show organization settings to admins
    ...(isAdmin ? [{
      name: 'Organization Settings',
      href: '/organization/settings',
      icon: Building,
      current: location.pathname === '/organization/settings',
    }] : []),
  ]
  
  console.log('Navigation array:', navigation)

  return (
    <div className="w-64 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col h-full">
      <div className="flex-1 flex flex-col overflow-y-auto">
        <div className="flex flex-shrink-0 flex-col items-center px-4 pt-5">
          <div className="flex items-center justify-center space-x-2">
            <div className="p-2 bg-primary rounded-lg">
              <svg 
                className="w-6 h-6 text-white" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9h.01M11 9h.01M15 9h.01"
                />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900">
              Zendesk
              <span className="text-primary">Lite</span>
            </h1>
          </div>
          
          {profile?.organization?.name && (
            <p className="text-sm text-gray-500 mt-2 font-medium">
              {profile.organization.name}
            </p>
          )}
        </div>
        <nav className="mt-5 flex-1 space-y-1 bg-white px-2">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`
                group flex items-center px-2 py-2 text-sm font-medium rounded-md
                ${
                  item.current
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }
              `}
            >
              <item.icon
                className={`
                  mr-3 h-6 w-6 flex-shrink-0
                  ${
                    item.current
                      ? 'text-gray-500'
                      : 'text-gray-400 group-hover:text-gray-500'
                  }
                `}
                aria-hidden="true"
              />
              {item.name}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex-shrink-0 border-t border-gray-200 p-4">
        <div className="group block w-full flex-shrink-0">
          <div className="flex items-center">
            <div>
              <img
                className="inline-block h-9 w-9 rounded-full"
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                  profile?.full_name || 'User'
                )}&background=random`}
                alt=""
              />
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                {profile?.full_name}
              </p>
              {profile?.title && (
                <p className="text-xs text-gray-500">
                  {profile.title}
                </p>
              )}
              <p className="text-xs font-medium text-gray-500 group-hover:text-gray-700">
                {profile?.email}
              </p>
            </div>
            <button
              onClick={signOut}
              className="ml-2 inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 