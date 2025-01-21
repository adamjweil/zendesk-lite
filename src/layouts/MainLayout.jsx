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