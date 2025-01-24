import { Pinecone } from '@pinecone-database/pinecone'
import OpenAI from 'openai'
import { supabase } from './supabase'

// Polyfill for browser environment
if (typeof global === 'undefined') {
  globalThis.global = globalThis;
}

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Note: In production, you should proxy these requests through your backend
})

const pc = new Pinecone({
  apiKey: import.meta.env.VITE_PINECONE_API_KEY,
})

const index = pc.index(import.meta.env.VITE_PINECONE_INDEX_NAME)

const generateEmbedding = async (text) => {
  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: text,
  })
  return response.data[0].embedding
}

export const syncDataToPinecone = async () => {
  try {
    // Fetch all tickets and their comments
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select(`
        id,
        subject,
        description,
        status,
        priority,
        created_at,
        updated_at,
        creator_id,
        assignee_type,
        assigned_to,
        comments (
          id,
          content,
          created_at,
          author_id
        )
      `)

    if (ticketsError) throw ticketsError

    // Process each ticket and its comments
    for (const ticket of tickets) {
      const ticketText = `
        Ticket ID: ${ticket.id}
        Subject: ${ticket.subject}
        Description: ${ticket.description}
        Status: ${ticket.status}
        Priority: ${ticket.priority}
        Created At: ${ticket.created_at}
        Updated At: ${ticket.updated_at}
        Assignment: ${ticket.assignee_type ? `${ticket.assignee_type} (${ticket.assigned_to})` : 'Unassigned'}
      `.trim()

      const ticketEmbedding = await generateEmbedding(ticketText)

      // Clean metadata to ensure only valid types
      const cleanMetadata = {
        type: 'ticket',
        id: ticket.id.toString(),
        subject: ticket.subject || '',
        description: ticket.description || '',
        status: ticket.status || '',
        priority: ticket.priority || '',
        created_at: ticket.created_at || '',
        updated_at: ticket.updated_at || '',
        creator_id: ticket.creator_id || '',
        assignee_type: ticket.assignee_type || '',
        assigned_to: ticket.assigned_to ? ticket.assigned_to.toString() : ''
      }

      // Upsert the ticket vector
      await index.upsert([{
        id: `ticket-${ticket.id}`,
        values: ticketEmbedding,
        metadata: cleanMetadata
      }])

      // Process comments if they exist
      if (ticket.comments) {
        for (const comment of ticket.comments) {
          const commentText = `
            Comment on Ticket ${ticket.id}
            Content: ${comment.content}
            Created At: ${comment.created_at}
          `.trim()

          const commentEmbedding = await generateEmbedding(commentText)

          // Clean comment metadata
          const cleanCommentMetadata = {
            type: 'comment',
            id: comment.id.toString(),
            ticketId: ticket.id.toString(),
            content: comment.content || '',
            created_at: comment.created_at || '',
            author_id: comment.author_id || ''
          }

          // Upsert the comment vector
          await index.upsert([{
            id: `comment-${comment.id}`,
            values: commentEmbedding,
            metadata: cleanCommentMetadata
          }])
        }
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Error syncing data to Pinecone:', error)
    return { success: false, error }
  }
}

const analyzeQuery = async (query) => {
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: `You are a helpful assistant that analyzes user queries about ticket data. 
        Determine the type of analysis needed and what visualization would be most appropriate.
        
        Query types:
        - For queries about counts or numbers, use 'count' type
        - For queries about changes over time, use 'trend' type
        - For queries about distribution across categories, use 'distribution' type
        - For queries asking to list or show specific tickets, use 'list' type
        - For queries about assignments or tickets assigned to someone, use 'list' type
        
        Pay special attention to:
        - Queries about assignments:
          * "assigned to me" or "my tickets" -> assignedTo: "me"
          * "assigned to [name]" -> assignedTo: "[name]" (e.g., "Bill" -> "bill")
        - Time-based queries (e.g., "yesterday", "today", "this week")
        - Status queries (e.g., "open tickets", "closed tickets")
        - Priority queries (e.g., "high priority", "urgent tickets")
        
        Return a JSON object with the following structure:
        {
          "queryType": "count" | "trend" | "distribution" | "list" | "search",
          "filters": {
            "status": string | null,
            "priority": string | null,
            "timeRange": "day" | "week" | "month" | "year" | null,
            "assignedTo": "me" | string | null
          },
          "visualization": "none" | "bar" | "line" | "pie"
        }
        
        Example queries and responses:
        "Show my tickets" -> { queryType: "list", filters: { assignedTo: "me" } }
        "How many tickets are assigned to Bill?" -> { queryType: "list", filters: { assignedTo: "bill" } }
        "Were any tickets from yesterday assigned to Adam?" -> { queryType: "list", filters: { assignedTo: "adam", timeRange: "day" } }`
      },
      {
        role: 'user',
        content: query
      }
    ],
    response_format: { type: 'json_object' }
  })

  return JSON.parse(response.choices[0].message.content)
}

const processQueryResults = async (results, analysis) => {
  let data = []
  let text = ''
  const filteredResults = results.filter(r => r.metadata.type === 'ticket')

  // Helper function to create ticket link
  const createTicketLink = (ticket) => {
    const priorityEmoji = {
      urgent: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢'
    }[ticket.metadata.priority.toLowerCase()] || '⚪️'
    
    return `<a href="/tickets/${ticket.metadata.id}" target="_blank" class="text-primary hover:underline">${ticket.metadata.subject}</a> ${priorityEmoji} (${ticket.metadata.status})`
  }

  // Helper function to check if a date is yesterday
  const isYesterday = (dateStr) => {
    const date = new Date(dateStr)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    return date.toDateString() === yesterday.toDateString()
  }

  // Helper function to format date relative to today
  const formatRelativeDate = (dateStr) => {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) return 'today'
    if (date.toDateString() === yesterday.toDateString()) return 'yesterday'
    return date.toLocaleDateString()
  }

  // Get current user's ID
  const { data: { user } } = await supabase.auth.getUser()
  const currentUserId = user?.id

  // Helper function to check if a ticket is assigned to a specific user
  const isAssignedToUser = async (ticket, targetUser) => {
    if (targetUser === 'me') {
      return ticket.metadata.assigned_to === currentUserId
    }

    try {
      // Get the user profile by name
      const { data: users, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .ilike('full_name', targetUser)
        .limit(1)

      if (error) throw error
      
      if (users && users.length > 0) {
        const userId = users[0].id
        return ticket.metadata.assigned_to === userId
      }
      
      return false
    } catch (error) {
      console.error('Error looking up user:', error)
      return false
    }
  }

  switch (analysis.queryType) {
    case 'count':
    case 'list':
      let filteredTickets = [...filteredResults]
      
      // Debug logging
      console.log('Total tickets before filtering:', filteredResults.length)
      console.log('Analysis:', analysis)
      
      // Apply time-based filters
      if (analysis.filters?.timeRange === 'day') {
        filteredTickets = filteredTickets.filter(t => isYesterday(t.metadata.created_at))
        console.log('Tickets after time filter:', filteredTickets.length)
      }
      
      // Apply assignment filter
      if (analysis.filters?.assignedTo) {
        console.log('Filtering by assignment:', analysis.filters.assignedTo)
        // Since isAssignedToUser is now async, we need to use Promise.all
        filteredTickets = await Promise.all(
          filteredTickets.map(async t => ({
            ticket: t,
            isAssigned: await isAssignedToUser(t, analysis.filters.assignedTo)
          }))
        ).then(results => 
          results
            .filter(r => r.isAssigned)
            .map(r => r.ticket)
        )
        console.log('Tickets after assignment filter:', filteredTickets.length)
      }
      
      // Apply other filters
      if (analysis.filters?.priority) {
        filteredTickets = filteredTickets.filter(t => 
          t.metadata.priority.toLowerCase() === analysis.filters.priority.toLowerCase()
        )
      }
      if (analysis.filters?.status) {
        filteredTickets = filteredTickets.filter(t => 
          t.metadata.status.toLowerCase() === analysis.filters.status.toLowerCase()
        )
      }

      // Sort by priority and status
      filteredTickets.sort((a, b) => {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
        const aPriority = priorityOrder[a.metadata.priority.toLowerCase()] || 4
        const bPriority = priorityOrder[b.metadata.priority.toLowerCase()] || 4
        return aPriority - bPriority
      })

      if (filteredTickets.length === 0) {
        if (analysis.filters?.assignedTo) {
          const assignee = analysis.filters.assignedTo === 'me' ? 'you' : analysis.filters.assignedTo
          text = `No tickets are currently assigned to ${assignee}.`
        } else {
          text = 'No tickets match your query.'
        }
      } else {
        const assignee = analysis.filters?.assignedTo === 'me' ? 'you' : analysis.filters.assignedTo
        const assignmentContext = analysis.filters?.assignedTo ? ` assigned to ${assignee}` : ''
        const timeContext = analysis.filters?.timeRange === 'day' ? ' created yesterday' : ''
        
        if (analysis.queryType === 'count') {
          text = `${filteredTickets.length} ticket${filteredTickets.length === 1 ? ' is' : 's are'} currently${assignmentContext}:`
        } else {
          text = `Here are ${filteredTickets.length} tickets${timeContext}${assignmentContext}:`
        }
        
        filteredTickets.forEach(ticket => {
          text += `\n- ${createTicketLink(ticket)} - Created ${formatRelativeDate(ticket.metadata.created_at)}`
        })
      }
      break

    case 'trend':
      text = 'Here\'s the trend of tickets over time:'
      const grouped = filteredResults.reduce((acc, item) => {
        const date = formatRelativeDate(item.metadata.created_at)
        acc[date] = (acc[date] || 0) + 1
        return acc
      }, {})
      data = Object.entries(grouped)
        .sort((a, b) => new Date(a[0]) - new Date(b[0]))
        .map(([name, value]) => ({ name, value }))
      break

    case 'distribution':
      const field = analysis.filters?.priority ? 'priority' : 'status'
      text = `Here's the distribution of tickets by ${field}:`
      const distributionGrouped = filteredResults.reduce((acc, item) => {
        const key = item.metadata[field] || 'unknown'
        acc[key] = (acc[key] || 0) + 1
        return acc
      }, {})
      data = Object.entries(distributionGrouped).map(([name, value]) => ({ name, value }))
      break

    default:
      text = `Found ${filteredResults.length} tickets matching your query.`
  }

  return {
    text,
    data: data.length > 0 ? data : null,
    visualType: analysis.visualization !== 'none' ? analysis.visualization : null,
    isHTML: true
  }
}

export const processMessage = async (message) => {
  try {
    // First, analyze the query to understand what kind of response is needed
    const analysis = await analyzeQuery(message)

    // Generate an embedding for the query
    const queryEmbedding = await generateEmbedding(message)

    // Search Pinecone
    const queryResponse = await index.query({
      vector: queryEmbedding,
      topK: 100, // Increased to get better coverage
      includeMetadata: true
    })

    // Process the results based on the analysis
    return await processQueryResults(queryResponse.matches, analysis)
  } catch (error) {
    console.error('Error processing message:', error)
    return {
      text: 'Sorry, I encountered an error processing your request.',
      data: null,
      visualType: null,
      isHTML: false
    }
  }
}

// Set up real-time sync with Supabase
export const setupRealtimeSync = () => {
  const channel = supabase
    .channel('schema-db-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tickets'
      },
      () => syncDataToPinecone()
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'comments'
      },
      () => syncDataToPinecone()
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
} 