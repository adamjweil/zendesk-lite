import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { createTicket, getTags, addTagToTicket } from '../lib/database'
import { toast } from 'react-hot-toast'

const priorities = ['low', 'medium', 'high', 'urgent']

export default function SubmitIssue() {
  const { user, profile } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [tags, setTags] = useState([])
  const [selectedTags, setSelectedTags] = useState([])
  
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    priority: 'medium',
  })

  useEffect(() => {
    loadTags()
  }, [])

  const loadTags = async () => {
    const { data, error } = await getTags()
    if (error) {
      console.error('Error loading tags:', error)
      toast.error('Failed to load categories')
      return
    }
    setTags(data || [])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (!profile?.organization_id) {
        throw new Error('You must be part of an organization to submit tickets')
      }

      const ticketData = {
        subject: formData.subject,
        description: formData.description,
        priority: formData.priority,
        status: 'new',
        creator_id: user.id,
        organization_id: profile.organization_id
      }

      console.log('Creating ticket with data:', ticketData)

      // Create the ticket
      const { data: ticket, error: ticketError } = await createTicket(ticketData)

      if (ticketError) {
        console.error('Ticket creation error:', ticketError)
        throw new Error(ticketError.message || 'Failed to create ticket')
      }

      if (!ticket) {
        console.error('No ticket data returned')
        throw new Error('Failed to create ticket - no data returned')
      }

      console.log('Ticket created successfully:', ticket)

      // Add selected tags
      if (selectedTags.length > 0) {
        console.log('Adding tags:', selectedTags, 'to ticket:', ticket.id)
        for (const tagId of selectedTags) {
          const { error: tagError } = await addTagToTicket(ticket.id, tagId)
          if (tagError) {
            console.error('Error adding tag:', tagError)
            toast.error('Some tags may not have been added properly')
          }
        }
      }

      // Reset form
      setFormData({
        subject: '',
        description: '',
        priority: 'medium',
      })
      setSelectedTags([])

      toast.success('Issue submitted successfully!')
    } catch (error) {
      console.error('Error submitting issue:', error)
      toast.error(error.message || 'Failed to submit issue')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const toggleTag = (tagId) => {
    setSelectedTags(prev => 
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    )
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-gray-50 to-white">
      <div className="py-8">
        <header>
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-gray-900 mb-1">
              Submit New Issue
            </h1>
            <p className="text-gray-600">
              Please provide details about your issue below
            </p>
          </div>
        </header>
        <main>
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <form onSubmit={handleSubmit} className="space-y-4 mt-6">
              {/* Subject */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <label htmlFor="subject" className="block text-sm font-semibold text-gray-900 mb-1">
                  Subject *
                </label>
                <input
                  type="text"
                  name="subject"
                  id="subject"
                  required
                  value={formData.subject}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-lg border-gray-200 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 sm:text-sm"
                  placeholder="Brief summary of your issue"
                />
              </div>

              {/* Description */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <label htmlFor="description" className="block text-sm font-semibold text-gray-900 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  id="description"
                  rows={4}
                  value={formData.description}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-lg border-gray-200 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 sm:text-sm"
                  placeholder="Provide a detailed description of your issue..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Priority */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Priority Level
                  </label>
                  <div className="space-y-1.5">
                    {priorities.map(priority => (
                      <label
                        key={priority}
                        className={`relative flex items-center p-2 rounded-lg cursor-pointer transition-all duration-200
                          ${formData.priority === priority 
                            ? 'bg-primary/5 border border-primary' 
                            : 'border border-gray-100 hover:border-gray-200'}`}
                      >
                        <input
                          type="radio"
                          name="priority"
                          value={priority}
                          checked={formData.priority === priority}
                          onChange={handleChange}
                          className="sr-only"
                        />
                        <div className="flex items-center gap-2 w-full">
                          <div 
                            className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center
                              ${formData.priority === priority 
                                ? 'border-primary bg-primary' 
                                : 'border-gray-300'}`}
                          >
                            {formData.priority === priority && (
                              <div className="w-1.5 h-1.5 rounded-full bg-white" />
                            )}
                          </div>
                          <span className={`text-sm font-medium ${formData.priority === priority ? 'text-primary' : 'text-gray-700'}`}>
                            {priority.charAt(0).toUpperCase() + priority.slice(1)}
                          </span>
                          {/* Priority Icons */}
                          <span className="ml-auto">
                            {priority === 'urgent' && (
                              <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                            )}
                            {priority === 'high' && (
                              <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                            )}
                            {priority === 'medium' && (
                              <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                              </svg>
                            )}
                            {priority === 'low' && (
                              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            )}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Categories (Tags) */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Categories
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map(tag => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
                          ${selectedTags.includes(tag.id)
                            ? 'bg-primary text-white shadow-sm hover:bg-primary-dark'
                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                          }`}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-primary 
                    transition-all duration-200 hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary
                    ${isSubmitting ? 'opacity-75 cursor-not-allowed' : 'hover:shadow-lg transform hover:-translate-y-0.5'}`}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Submitting...
                    </span>
                  ) : (
                    'Submit Issue'
                  )}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  )
} 