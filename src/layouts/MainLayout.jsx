import { Link, Outlet, useNavigate } from 'react-router-dom'
import { Home, Ticket, Users, BookOpen, BarChart, User, LogOut } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { signOut } from '../lib/supabase'

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Tickets', href: '/tickets', icon: Ticket },
  { name: 'Users', href: '/users', icon: Users },
  { name: 'Knowledge Base', href: '/knowledge-base', icon: BookOpen },
  { name: 'Reports', href: '/reports', icon: BarChart },
]

export default function MainLayout() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    const { error } = await signOut()
    if (!error) {
      navigate('/login')
    }
  }

  return (
    <div className="min-h-full">
      <div className="flex min-h-full">
        {/* Sidebar */}
        <div className="hidden w-64 bg-white shadow-lg lg:block">
          <div className="flex h-full flex-col">
            <div className="flex flex-1 flex-col overflow-y-auto">
              {/* Logo */}
              <div className="flex h-16 flex-shrink-0 items-center px-4">
                <h1 className="text-2xl font-bold text-primary">Zendesk-Lite</h1>
              </div>
              {/* Navigation */}
              <nav className="flex-1 space-y-1 px-2 py-4">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className="group flex items-center rounded-md px-2 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  >
                    <item.icon
                      className="mr-3 h-6 w-6 flex-shrink-0 text-gray-400 group-hover:text-gray-500"
                      aria-hidden="true"
                    />
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Main content header */}
          <div className="relative z-10 flex h-16 flex-shrink-0 border-b border-gray-200 bg-white shadow-sm">
            <div className="flex flex-1 justify-between px-4 sm:px-6">
              <div className="flex flex-1">
                {/* Header content can go here */}
              </div>
              
              {/* User Menu */}
              <div className="ml-4 flex items-center md:ml-6">
                <div className="dropdown dropdown-end">
                  <button
                    className="btn btn-ghost btn-circle avatar"
                    tabIndex={0}
                  >
                    <div className="w-10 rounded-full bg-primary text-primary-content grid place-items-center">
                      <span className="text-xl font-bold">
                        {user?.email?.[0].toUpperCase()}
                      </span>
                    </div>
                  </button>
                  <ul tabIndex={0} className="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-52">
                    <li>
                      <Link to="/profile" className="flex items-center px-4 py-2 text-sm text-gray-700">
                        <User className="mr-3 h-5 w-5 text-gray-400" />
                        Profile
                      </Link>
                    </li>
                    <li>
                      <button
                        onClick={handleSignOut}
                        className="flex w-full items-center px-4 py-2 text-sm text-gray-700"
                      >
                        <LogOut className="mr-3 h-5 w-5 text-gray-400" />
                        Sign out
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Main content area */}
          <main className="flex flex-1 overflow-hidden">
            <section className="flex min-w-0 flex-1 flex-col overflow-y-auto p-4">
              <Outlet />
            </section>
          </main>
        </div>
      </div>
    </div>
  )
} 