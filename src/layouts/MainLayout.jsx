import { Link, Outlet, useNavigate } from 'react-router-dom'
import { User, LogOut } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { signOut } from '../lib/supabase'
import Sidebar from '../components/Sidebar'

export default function MainLayout() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  
  const handleSignOut = async () => {
    const { error } = await signOut()
    if (!error) {
      navigate('/login')
    }
  }

  return (
    <div className="h-screen">
      <div className="flex h-full">
        <Sidebar />

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
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
          <main className="flex-1 overflow-hidden">
            <section className="flex-1 overflow-y-auto p-4">
              <Outlet />
            </section>
          </main>
        </div>
      </div>
    </div>
  )
} 