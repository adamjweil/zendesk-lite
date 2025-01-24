import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useState, useEffect } from 'react'
import { 
  LayoutDashboard, 
  Ticket, 
  Users, 
  LogOut,
  Building,
  User,
  BarChart,
  PlusCircle,
  BarChart2,
  Settings,
  Plug,
  UsersRound,
  Bot
} from 'lucide-react'
import { getTickets } from '../lib/database'
import AIChat from './AIChat'

export default function Sidebar() {
  console.log('Sidebar component mounting...')
  const location = useLocation()
  const { user, profile, signOut } = useAuth()
  const [openTickets, setOpenTickets] = useState([])
  const [isAIChatOpen, setIsAIChatOpen] = useState(false)
  
  console.log('Profile in Sidebar:', profile)
  console.log('Organization data:', profile?.organization)
  console.log('Organization name:', profile?.organization?.name)
  
  const isAdmin = profile?.role === 'admin'
  const isAgent = profile?.role === 'agent'
  console.log('Is Admin:', isAdmin)

  useEffect(() => {
    loadOpenTickets()
    // Set up polling to check for ticket updates every 30 seconds
    const interval = setInterval(loadOpenTickets, 30000)
    
    // Listen for ticket update events
    const handleTicketUpdate = () => {
      loadOpenTickets()
    }
    window.addEventListener('ticketUpdated', handleTicketUpdate)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('ticketUpdated', handleTicketUpdate)
    }
  }, [profile])

  const loadOpenTickets = async () => {
    if (!profile?.id) return
    
    const { data, error } = await getTickets({
      status: 'open',
      assignee_id: profile.id
    })
    
    if (error) {
      console.error('Error loading open tickets:', error)
    } else {
      // Sort by creation date (oldest first) and limit to 10
      const sortedTickets = (data || [])
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        .slice(0, 10)
      setOpenTickets(sortedTickets)
    }
  }

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
    // Show Submit Issue to customers and admins
    ...(!isAgent ? [{
      name: 'Submit Issue',
      href: '/submit-issue',
      icon: PlusCircle,
      current: location.pathname === '/submit-issue',
    }] : []),
    // Show Analytics to admins and agents only
    ...(isAdmin || isAgent ? [{
      name: 'Analytics',
      href: '/analytics',
      icon: BarChart2,
      current: location.pathname === '/analytics',
    }] : []),
    {
      name: 'AI Assistant',
      icon: Bot,
      onClick: () => setIsAIChatOpen(true),
      current: false,
    },
    {
      name: 'Profile',
      href: '/profile',
      icon: User,
      current: location.pathname === '/profile',
    },
    // Only show organization settings to admins
    ...(isAdmin ? [{
      name: 'Organization',
      href: '/organization/settings',
      icon: Building,
      current: location.pathname === '/organization/settings',
    }] : []),
    ...(isAdmin ? [
      { name: 'Integrations', href: '/integrations', icon: Plug, current: location.pathname === '/integrations' }
    ] : [])
  ]
  
  console.log('Navigation array:', navigation)

  const priorityColors = {
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-blue-100 text-blue-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800',
  }

  const priorityIconColors = {
    low: 'text-gray-400',
    medium: 'text-blue-500',
    high: 'text-orange-500',
    urgent: 'text-red-500',
  }

  return (
    <>
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
              <div key={item.name}>
                {item.href ? (
                  <Link
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
                ) : (
                  <button
                    onClick={item.onClick}
                    className={`
                      w-full group flex items-center px-2 py-2 text-sm font-medium rounded-md
                      text-gray-600 hover:bg-gray-50 hover:text-gray-900
                    `}
                  >
                    <item.icon
                      className="mr-3 h-6 w-6 flex-shrink-0 text-gray-400 group-hover:text-gray-500"
                      aria-hidden="true"
                    />
                    {item.name}
                  </button>
                )}
                
                {/* Show open tickets section right after Tickets nav item */}
                {item.name === 'Tickets' && openTickets.length > 0 && (
                  <div className="ml-6 mt-1">
                    <div className="space-y-1">
                      {openTickets.map((ticket) => (
                        <Link
                          key={ticket.id}
                          to={`/tickets/${ticket.id}`}
                          className={`
                            group flex items-center px-2 py-1.5 text-xs font-medium rounded-md
                            ${location.pathname === `/tickets/${ticket.id}`
                              ? 'bg-gray-100 text-gray-900'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }
                          `}
                        >
                          <Ticket className={`mr-2 h-4 w-4 flex-shrink-0 ${priorityIconColors[ticket.priority]}`} />
                          <div className="flex-1 flex items-center justify-between">
                            <span className="truncate text-[10px]" title={ticket.subject}>
                              {ticket.subject.length > 20 
                                ? `${ticket.subject.substring(0, 20)}...` 
                                : ticket.subject}
                            </span>
                            <span className={`ml-1 px-1 py-0.5 inline-flex text-[10px] leading-3 font-medium rounded-full ${priorityColors[ticket.priority]}`}>
                              {ticket.priority}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
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
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                    {profile?.full_name}
                  </p>
                  <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full ${
                    profile?.role === 'admin' 
                      ? 'bg-purple-50 text-purple-700'
                      : profile?.role === 'agent'
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-gray-50 text-gray-700'
                  }`}>
                    {profile?.role === 'admin' ? 'Admin' : profile?.role === 'agent' ? 'Agent' : 'Customer'}
                  </span>
                </div>
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
      <AIChat isOpen={isAIChatOpen} setIsOpen={setIsAIChatOpen} />
    </>
  )
} 