import { useState, useEffect } from 'react'
import { getOrganizationUsers, createInvitation, getInvitations, deleteInvitation } from '../lib/database'
import { Button } from './ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog'
import { Input } from './ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { Label } from './ui/label'
import { useToast } from './ui/use-toast'
import { Trash2 } from 'lucide-react'

export function Users() {
  const [users, setUsers] = useState([])
  const [invitations, setInvitations] = useState([])
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadUsers()
    loadInvitations()
  }, [])

  const loadUsers = async () => {
    const { data, error } = await getOrganizationUsers()
    if (error) {
      console.error('Error loading users:', error)
      return
    }
    setUsers(data || [])
  }

  const loadInvitations = async () => {
    const { data, error } = await getInvitations()
    if (error) {
      console.error('Error loading invitations:', error)
      return
    }
    setInvitations(data || [])
  }

  const handleInviteUser = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await createInvitation({
        email: inviteEmail,
        role: inviteRole,
      })

      if (error) {
        console.error('Error inviting user:', error)
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to invite user. Please try again.',
        })
        return
      }

      toast({
        title: 'Success',
        description: 'Invitation sent successfully!',
      })
      setInviteEmail('')
      setInviteRole('member')
      setIsInviteModalOpen(false)
      loadInvitations()
    } catch (error) {
      console.error('Error inviting user:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to invite user. Please try again.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteInvitation = async (invitationId) => {
    try {
      const { error } = await deleteInvitation(invitationId)
      if (error) {
        console.error('Error deleting invitation:', error)
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to delete invitation. Please try again.',
        })
        return
      }

      toast({
        title: 'Success',
        description: 'Invitation deleted successfully.',
      })
      loadInvitations()
    } catch (error) {
      console.error('Error deleting invitation:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete invitation. Please try again.',
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Users</h2>
        <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
          <DialogTrigger asChild>
            <Button>Invite User</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite User</DialogTitle>
              <DialogDescription>
                Send an invitation to join your organization.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleInviteUser}
                disabled={!inviteEmail || !inviteRole || isLoading}
              >
                {isLoading ? 'Sending...' : 'Send Invitation'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Active Users</h3>
          <div className="space-y-2">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 bg-white rounded-lg shadow"
              >
                <div>
                  <p className="font-medium">{user.full_name}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
                <div>
                  <span className="px-3 py-1 text-sm bg-gray-100 rounded-full">
                    {user.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">Pending Invitations</h3>
          <div className="space-y-2">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between p-4 bg-white rounded-lg shadow"
              >
                <div>
                  <p className="font-medium">{invitation.email}</p>
                  <p className="text-sm text-gray-500">
                    Invited by {invitation.inviter?.full_name}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="px-3 py-1 text-sm bg-gray-100 rounded-full">
                    {invitation.role}
                  </span>
                  <span className="px-3 py-1 text-sm bg-yellow-100 text-yellow-800 rounded-full">
                    {invitation.status}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteInvitation(invitation.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
} 