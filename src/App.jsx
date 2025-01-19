import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import MainLayout from './layouts/MainLayout'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'
import Users from './pages/Users'
import AcceptInvitation from './pages/AcceptInvitation'
import OrganizationSettings from './pages/OrganizationSettings'
import Tickets from './pages/Tickets'
import TicketDetails from './pages/TicketDetails'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/accept-invitation/:token" element={<AcceptInvitation />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="profile" element={<Profile />} />
            <Route path="users" element={<Users />} />
            <Route path="tickets" element={<Tickets />} />
            <Route path="tickets/:ticketId" element={<TicketDetails />} />
            <Route path="knowledge-base" element={<div>Knowledge Base coming soon...</div>} />
            <Route path="reports" element={<div>Reports coming soon...</div>} />
            <Route path="organization/settings" element={<OrganizationSettings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
