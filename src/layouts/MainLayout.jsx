import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Search, Command, Ticket } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import Sidebar from '../components/Sidebar'
import { useState, useEffect, useRef } from 'react'
import { getTickets } from '../lib/database'

export default function MainLayout() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef(null)
  
  // Navigation items that can be searched
  const navigationItems = [
    { title: 'Dashboard', path: '/dashboard', type: 'page' },
    { title: 'Tickets', path: '/tickets', type: 'page' },
    { title: 'Analytics', path: '/analytics', type: 'page' },
    { title: 'Profile', path: '/profile', type: 'page' },
    { title: 'Organization Settings', path: '/organization/settings', type: 'page' },
  ]

  useEffect(() => {
    // Add keyboard shortcut listener
    const handleKeyDown = (e) => {
      if (e.key === '/' && !e.target.closest('input, textarea')) {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Reset search when location changes
  useEffect(() => {
    setSearchQuery('')
    setShowResults(false)
  }, [location])

  const handleSearch = async (e) => {
    const query = e.target.value
    setSearchQuery(query)
    
    if (query.length < 1) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    setShowResults(true)
    const results = []

    // Search navigation items
    const matchingPages = navigationItems.filter(item =>
      item.title.toLowerCase().includes(query.toLowerCase())
    )
    results.push(...matchingPages)

    // Search tickets if query is 3 or more characters
    if (query.length >= 3) {
      const { data: tickets } = await getTickets({
        search: query,
        limit: 5
      })
      if (tickets) {
        results.push(...tickets.map(ticket => ({
          ...ticket,
          title: ticket.subject,
          path: `/tickets/${ticket.id}`,
          type: 'ticket',
          status: ticket.status,
          priority: ticket.priority
        })))
      }
    }

    setSearchResults(results)
  }

  const handleResultClick = (result) => {
    navigate(result.path)
    setSearchQuery('')
    setShowResults(false)
  }

  const priorityColors = {
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-blue-100 text-blue-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800',
  }

  const statusColors = {
    new: 'bg-purple-100 text-purple-800',
    open: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    resolved: 'bg-gray-100 text-gray-800',
    closed: 'bg-gray-100 text-gray-800',
  }

  return (
    <div className="h-screen">
      <div className="flex h-full">
        <Sidebar />

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header with Search */}
          <header className="bg-white border-b border-gray-200 px-4 py-3">
            <div className="max-w-3xl mx-auto w-full">
              <div className="relative" ref={searchRef}>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search tickets, pages, or type '/' for shortcuts..."
                    value={searchQuery}
                    onChange={handleSearch}
                    onFocus={() => setShowResults(true)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm transition-colors duration-200 ease-in-out"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <kbd className="hidden sm:inline-flex items-center px-2 rounded border border-gray-200 bg-gray-100 text-gray-500 text-xs">
                      <Command className="h-3 w-3 mr-1" />
                      /
                    </kbd>
                  </div>
                </div>

                {/* Search Results Dropdown */}
                {showResults && searchResults.length > 0 && (
                  <div className="absolute mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
                    <div className="max-h-96 overflow-y-auto">
                      {searchResults.map((result, index) => (
                        <button
                          key={`${result.type}-${result.path}-${index}`}
                          onClick={() => handleResultClick(result)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              {result.type === 'page' ? (
                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                  <Search className="h-4 w-4 text-gray-500" />
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <Ticket className="h-4 w-4 text-primary" />
                                </div>
                              )}
                              <div className="ml-3">
                                <p className="text-sm font-medium text-gray-900">
                                  {result.title}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {result.type === 'page' ? 'Page' : 'Ticket'}
                                </p>
                              </div>
                            </div>
                            {result.type === 'ticket' && (
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-1 text-xs rounded-full ${statusColors[result.status]}`}>
                                  {result.status}
                                </span>
                                <span className={`px-2 py-1 text-xs rounded-full ${priorityColors[result.priority]}`}>
                                  {result.priority}
                                </span>
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Results Message */}
                {showResults && searchQuery && searchResults.length === 0 && (
                  <div className="absolute mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 p-4 text-center z-50">
                    <p className="text-gray-500">No results found</p>
                  </div>
                )}
              </div>
            </div>
          </header>
 
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