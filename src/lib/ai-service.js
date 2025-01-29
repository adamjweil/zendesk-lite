import { Pinecone } from '@pinecone-database/pinecone'
import OpenAI from 'openai'
import { supabase } from './supabase'
import { langfuse } from './langfuse'

// Polyfill for browser environment
if (typeof global === 'undefined') {
  const global = globalThis;
  Object.defineProperty(window, 'global', {
    get: function() {
      return global;
    },
    configurable: true,
    enumerable: true
  });
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

// Add timestamp tracking
let lastUpdateTimestamp = null

export const syncDataToPinecone = async () => {
  try {
    // Check if there are any updates since last sync
    const { data: latestChanges, error: changesError } = await supabase
      .from('tickets')
      .select('updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)

    if (changesError) throw changesError

    const latestChangeTime = latestChanges?.[0]?.updated_at
    
    // If no changes since last sync, skip
    if (lastUpdateTimestamp && latestChangeTime && new Date(latestChangeTime) <= new Date(lastUpdateTimestamp)) {
      console.log('No new changes since last sync, skipping...')
      return { success: true, skipped: true }
    }

    // Proceed with sync if there are changes
    console.log('Changes detected, syncing...')
    
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

    // Update the timestamp after successful sync
    lastUpdateTimestamp = new Date().toISOString()
    return { success: true }
  } catch (error) {
    console.error('Error syncing data to Pinecone:', error)
    return { success: false, error }
  }
}

const analyzeQuery = async (query) => {
  const trace = langfuse.trace({
    name: 'analyze_query',
    input: { query },
    metadata: {
      queryLength: query.length,
      queryType: 'user_input'
    }
  });

  const span = trace.span({
    name: 'query_analysis',
    input: { query }
  });

  try {
    const startTime = Date.now();
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
          - For queries about listing or showing specific tickets, use 'list' type
          - For queries about assignments or tickets assigned to someone, use 'list' type
          
          Pay special attention to:
          - Time-based queries:
            * "today", "completed today", "closed today" -> timeRange: "day", status: "closed"
            * "yesterday", "closed yesterday" -> timeRange: "yesterday", status: "closed"
            * "last week" -> timeRange: "week"
          - Status queries:
            * "completed", "closed" -> status: "closed"
            * "open tickets", "active tickets" -> status: "open"
          - Assignment queries:
            * "assigned to me" or "my tickets" -> assignedTo: "me"
            * "assigned to [name]" -> assignedTo: "[name]"
            * "assigned to [team] team" -> assignedToTeam: "[team]"
            * "tickets for [team] team" -> assignedToTeam: "[team]"
            * "assigned to members of [team] team" -> assignedToTeamMembers: "[team]"
            * "tickets assigned to [team] team members" -> assignedToTeamMembers: "[team]"
          - Priority queries (e.g., "high priority", "urgent tickets")
          
          Return a JSON object with the following structure:
          {
            "queryType": "count" | "trend" | "distribution" | "list" | "search",
            "filters": {
              "status": string | null,
              "priority": string | null,
              "timeRange": "day" | "yesterday" | "week" | "month" | "year" | null,
              "assignedTo": "me" | string | null,
              "assignedToTeam": string | null,
              "assignedToTeamMembers": string | null
            },
            "visualization": "none" | "bar" | "line" | "pie"
          }
          
          Example queries and responses:
          "How many tickets were closed yesterday?" -> { queryType: "count", filters: { status: "closed", timeRange: "yesterday" } }
          "Show tickets closed today" -> { queryType: "list", filters: { status: "closed", timeRange: "day" } }
          "How many tickets are assigned to the approvers team?" -> { queryType: "count", filters: { assignedToTeam: "approvers" } }
          "How many tickets are assigned to members of the approvers team?" -> { queryType: "count", filters: { assignedToTeamMembers: "approvers" } }`
        },
        {
          role: 'user',
          content: query
        }
      ],
      response_format: { type: 'json_object' }
    });
    const endTime = Date.now();

    const result = JSON.parse(response.choices[0].message.content);
    
    span.end({
      output: result,
      status: 'success',
      metadata: {
        processingTimeMs: endTime - startTime,
        tokenCount: response.usage.total_tokens,
        queryType: result.queryType,
        hasFilters: Object.keys(result.filters || {}).length > 0
      }
    });
    
    return result;
  } catch (error) {
    span.end({
      status: 'error',
      statusMessage: error.message,
      metadata: {
        errorType: error.name,
        errorStack: error.stack
      }
    });
    throw error;
  }
}

const processQueryResults = async (results, analysis) => {
  let data = []
  let text = ''
  const filteredResults = results.filter(r => r.metadata.type === 'ticket')

  // Helper function to create ticket link
  const createTicketLink = async (ticket) => {
    const priorityEmoji = {
      urgent: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢'
    }[ticket.metadata.priority.toLowerCase()] || '⚪️'

    // Get assignee name if ticket is assigned
    let assigneeName = 'Unassigned';
    if (ticket.metadata.assigned_to) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', ticket.metadata.assigned_to)
          .single();
        
        if (profile?.full_name) {
          assigneeName = profile.full_name;
        }
      } catch (error) {
        console.error('Error fetching assignee name:', error);
      }
    }

    const statusColors = {
      open: 'text-green-600',
      closed: 'text-gray-600',
      pending: 'text-yellow-600',
      'in progress': 'text-blue-600'
    };
    
    const statusColor = statusColors[ticket.metadata.status.toLowerCase()] || 'text-gray-600';
    
    return `<span class="flex items-center gap-2">
      <span class="flex-shrink-0">${priorityEmoji}</span>
      <a href="/tickets/${ticket.metadata.id}" target="_blank" class="text-primary hover:underline font-medium">${ticket.metadata.subject}</a>
      <span class="${statusColor} font-medium">(${ticket.metadata.status})</span>
      <span class="text-gray-500">•</span>
      <span class="flex items-center gap-1 text-gray-500">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        ${assigneeName}
      </span>
    </span>`;
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

  console.log('Debug - Current User:', {
    currentUserId,
    userObject: user
  });

  // Helper function to check if a ticket is assigned to a team member
  const isAssignedToTeamMember = async (ticket, teamName) => {
    try {
      // First get the team ID from the team name
      const { data: teams, error: teamError } = await supabase
        .from('teams')
        .select('id, name')
        .ilike('name', teamName)
        .limit(1);

      if (teamError || !teams?.length) {
        console.error('Error fetching team:', teamError);
        return false;
      }

      const teamId = teams[0].id;

      // Get all team members
      const { data: teamMembers, error: membersError } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', teamId);

      if (membersError) {
        console.error('Error fetching team members:', membersError);
        return false;
      }

      // Check if the ticket is assigned to any team member
      const isAssignedToMember = teamMembers.some(member => 
        String(member.user_id) === String(ticket.metadata.assigned_to)
      );

      console.log('Debug - Team member assignment check:', {
        ticketId: ticket.metadata.id,
        teamId,
        teamMembers: teamMembers.map(m => m.user_id),
        ticketAssignedTo: ticket.metadata.assigned_to,
        isAssignedToMember
      });

      return isAssignedToMember;
    } catch (error) {
      console.error('Error checking team member assignment:', error);
      return false;
    }
  };

  // Helper function to check if a ticket is assigned to a specific team
  const isAssignedToTeam = async (ticket, teamName) => {
    console.log('Debug - Raw ticket metadata:', {
      ticketId: ticket.metadata.id,
      subject: ticket.metadata.subject,
      allMetadata: ticket.metadata,
      assigneeType: ticket.metadata.assignee_type,
      assignedTo: ticket.metadata.assigned_to
    });

    try {
      // First get the team ID from the team name
      const { data: teams, error: teamError } = await supabase
        .from('teams')
        .select('id, name')
        .ilike('name', teamName)
        .limit(1);

      if (teamError) {
        console.error('Error fetching team:', teamError);
        return false;
      }

      if (!teams || teams.length === 0) {
        console.log(`No team found with name: ${teamName}`);
        return false;
      }

      const teamId = teams[0].id;
      console.log('Debug - Found team:', { teamName, teamId });

      // Check if the ticket is assigned directly to the team
      const isTeamAssigned = 
        ticket.metadata.assignee_type?.toLowerCase() === 'team' && 
        ticket.metadata.assigned_to === teamId;

      console.log('Debug - Team assignment check:', {
        ticketId: ticket.metadata.id,
        teamId,
        ticketAssigneeType: ticket.metadata.assignee_type,
        ticketAssignedTo: ticket.metadata.assigned_to,
        isTeamAssigned
      });

      return isTeamAssigned;
    } catch (error) {
      console.error('Error checking team assignment:', error);
      return false;
    }
  };

  // Helper function to check if a ticket is assigned to a specific user
  const isAssignedToUser = async (ticket, targetUser) => {
    // Debug - Log the incoming ticket data
    console.log('Debug - Checking ticket assignment:', {
      ticketId: ticket.metadata.id,
      ticketStatus: ticket.metadata.status,
      rawAssignedTo: ticket.metadata.assigned_to,
      targetUser,
      currentUserId
    });

    if (!ticket.metadata.assigned_to) {
      console.log(`Debug - Ticket ${ticket.metadata.id} has no assignment`);
      return false;
    }
    
    if (targetUser === 'me') {
      // Convert both IDs to strings for comparison
      const assignedToStr = String(ticket.metadata.assigned_to);
      const currentUserIdStr = String(currentUserId);
      
      const matches = assignedToStr === currentUserIdStr;
      
      // Debug logging for 'me' assignment check
      console.log('Debug - Checking assignment to current user:', {
        ticketId: ticket.metadata.id,
        assignedToType: typeof ticket.metadata.assigned_to,
        assignedToValue: ticket.metadata.assigned_to,
        currentUserIdType: typeof currentUserId,
        currentUserIdValue: currentUserId,
        assignedToStr,
        currentUserIdStr,
        matches
      });
      
      return matches;
    }

    try {
      // Get the user profile by name
      const { data: users, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .ilike('full_name', `%${targetUser}%`)
        .limit(1);

      if (error) throw error;
      
      if (users && users.length > 0) {
        const userId = users[0].id;
        // Debug logging for name-based assignment check
        console.log('Checking assignment by name:', {
          ticketId: ticket.metadata.id,
          assignedTo: ticket.metadata.assigned_to,
          lookedUpUserId: userId,
          matches: ticket.metadata.assigned_to === userId
        });
        return ticket.metadata.assigned_to === userId;
      }
      
      return false;
    } catch (error) {
      console.error('Error looking up user:', error);
      return false;
    }
  };

  switch (analysis.queryType) {
    case 'count':
    case 'list':
      let filteredTickets = [...filteredResults]
      
      // Debug logging
      console.log('Debug - Initial tickets:', {
        total: filteredResults.length,
        tickets: filteredResults.map(t => ({
          id: t.metadata.id,
          subject: t.metadata.subject,
          assigneeType: t.metadata.assignee_type,
          assignedTo: t.metadata.assigned_to
        }))
      });
      
      // Apply time-based filters
      if (analysis.filters?.timeRange) {
        const today = new Date()
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        today.setHours(0, 0, 0, 0)
        yesterday.setHours(0, 0, 0, 0)
        
        filteredTickets = filteredTickets.filter(t => {
          // Get the relevant date based on the query context
          let relevantDate;
          if (analysis.filters?.status === 'closed') {
            // For closed tickets, use the last_updated timestamp as the closing time
            relevantDate = new Date(t.metadata.updated_at || t.metadata.created_at)
          } else {
            // For other queries, use created_at
            relevantDate = new Date(t.metadata.created_at)
          }
          relevantDate.setHours(0, 0, 0, 0)

          // Check if the date matches today or yesterday based on the query
          const isToday = relevantDate.getTime() === today.getTime()
          const isYesterday = relevantDate.getTime() === yesterday.getTime()
          
          console.log(`Ticket ${t.metadata.id} date check:`, {
            relevantDate,
            today,
            yesterday,
            isToday,
            isYesterday,
            status: t.metadata.status,
            updated_at: t.metadata.updated_at,
            created_at: t.metadata.created_at,
            timeRange: analysis.filters.timeRange
          })

          // Return based on the timeRange filter
          switch (analysis.filters.timeRange) {
            case 'yesterday':
              return isYesterday;
            case 'day':
              return isToday;
            default:
              return false;
          }
        })
        console.log('Tickets after time filter:', {
          count: filteredTickets.length,
          timeRange: analysis.filters.timeRange,
          tickets: filteredTickets.map(t => ({
            id: t.metadata.id,
            status: t.metadata.status,
            updated_at: t.metadata.updated_at
          }))
        })
      }
      
      // Apply status filter
      if (analysis.filters?.status) {
        const targetStatus = analysis.filters.status.toLowerCase()
        console.log('Filtering by status:', targetStatus)
        filteredTickets = filteredTickets.filter(t => {
          const ticketStatus = t.metadata.status.toLowerCase()
          console.log(`Ticket ${t.metadata.id} status check:`, {
            ticketStatus,
            targetStatus,
            matches: ticketStatus === targetStatus
          })
          return ticketStatus === targetStatus
        })
        console.log('Tickets after status filter:', filteredTickets.length)
      }
      
      // Apply team member assignment filter
      if (analysis.filters?.assignedToTeamMembers) {
        console.log('Debug - Starting team member assignment filtering:', {
          requestedTeam: analysis.filters.assignedToTeamMembers,
          totalTicketsBeforeFilter: filteredTickets.length
        });
        
        const teamMemberResults = await Promise.all(
          filteredTickets.map(async t => {
            const isAssigned = await isAssignedToTeamMember(t, analysis.filters.assignedToTeamMembers);
            return {
              ticket: t,
              isAssigned,
              metadata: {
                id: t.metadata.id,
                subject: t.metadata.subject,
                assignedTo: t.metadata.assigned_to
              }
            };
          })
        );
        
        const matchingResults = teamMemberResults.filter(r => r.isAssigned);
        console.log('Debug - Team member assignment matches:', {
          totalMatches: matchingResults.length,
          matches: matchingResults.map(r => r.metadata)
        });
        
        filteredTickets = matchingResults.map(r => r.ticket);
      }
      
      // Apply team assignment filter
      if (analysis.filters?.assignedToTeam) {
        console.log('Debug - Starting team assignment filtering:', {
          requestedTeam: analysis.filters.assignedToTeam,
          totalTicketsBeforeFilter: filteredTickets.length,
          ticketsBeforeFilter: filteredTickets.map(t => ({
            id: t.metadata.id,
            subject: t.metadata.subject,
            assigneeType: t.metadata.assignee_type,
            assignedTo: t.metadata.assigned_to
          }))
        });
        
        // Use Promise.all to handle async filtering
        const teamAssignmentResults = await Promise.all(
          filteredTickets.map(async t => {
            const isAssigned = await isAssignedToTeam(t, analysis.filters.assignedToTeam);
            return {
              ticket: t,
              isAssigned,
              metadata: {
                id: t.metadata.id,
                subject: t.metadata.subject,
                assigneeType: t.metadata.assignee_type,
                assignedTo: t.metadata.assigned_to
              }
            };
          })
        );
        
        const matchingResults = teamAssignmentResults.filter(r => r.isAssigned);
        console.log('Debug - Team assignment matches:', {
          totalMatches: matchingResults.length,
          matches: matchingResults.map(r => r.metadata)
        });
        
        filteredTickets = matchingResults.map(r => r.ticket);
      }
      
      // Apply assignment filter
      if (analysis.filters?.assignedTo) {
        console.log('Debug - Starting assignment filtering:', {
          filterType: analysis.filters.assignedTo,
          totalTicketsBeforeFilter: filteredTickets.length,
          currentUserId
        });
        
        // Use Promise.all to handle async filtering
        const assignmentResults = await Promise.all(
          filteredTickets.map(async t => {
            const isAssigned = await isAssignedToUser(t, analysis.filters.assignedTo);
            console.log(`Debug - Assignment check result for ticket ${t.metadata.id}:`, {
              isAssigned,
              status: t.metadata.status,
              assigned_to: t.metadata.assigned_to
            });
            return {
              ticket: t,
              isAssigned
            };
          })
        );
        
        filteredTickets = assignmentResults
          .filter(r => r.isAssigned)
          .map(r => r.ticket);
          
        console.log('Debug - Assignment filtering complete:', {
          totalTicketsAfterFilter: filteredTickets.length,
          remainingTickets: filteredTickets.map(t => ({
            id: t.metadata.id,
            status: t.metadata.status,
            assigned_to: t.metadata.assigned_to
          }))
        });
      }
      
      // Apply other filters
      if (analysis.filters?.priority) {
        filteredTickets = filteredTickets.filter(t => 
          t.metadata.priority.toLowerCase() === analysis.filters.priority.toLowerCase()
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
        if (analysis.filters?.assignedToTeamMembers) {
          text = `No tickets are currently assigned to members of the ${analysis.filters.assignedToTeamMembers} team.`;
        } else if (analysis.filters?.assignedToTeam) {
          text = `No tickets are currently assigned to the ${analysis.filters.assignedToTeam} team.`;
        } else if (analysis.filters?.assignedTo) {
          const assignee = analysis.filters.assignedTo === 'me' ? 'you' : analysis.filters.assignedTo;
          text = `No tickets are currently assigned to ${assignee}.`;
        } else if (analysis.filters?.timeRange === 'yesterday' && analysis.filters?.status === 'closed') {
          text = 'No tickets were closed yesterday.';
        } else {
          text = 'No tickets match your query.';
        }
      } else {
        const assignee = analysis.filters?.assignedTo === 'me' ? 'you' : analysis.filters.assignedTo;
        const team = analysis.filters?.assignedToTeam;
        const teamMembers = analysis.filters?.assignedToTeamMembers;
        const assignmentContext = teamMembers 
          ? ` assigned to members of the ${teamMembers} team`
          : team 
            ? ` assigned to the ${team} team`
            : analysis.filters?.assignedTo 
              ? ` assigned to ${assignee}` 
              : '';
        let timeContext = '';
        
        if (analysis.filters?.timeRange === 'yesterday') {
          timeContext = ' closed yesterday';
        } else if (analysis.filters?.timeRange === 'day') {
          timeContext = ' created today';
        }
        
        if (analysis.queryType === 'count') {
          text = `${filteredTickets.length} ticket${filteredTickets.length === 1 ? ' was' : 's were'}${timeContext}${assignmentContext}:`;
        } else {
          text = `Here are ${filteredTickets.length} tickets${timeContext}${assignmentContext}:`;
        }
        
        // Create ticket links with assignee info
        const ticketLinks = await Promise.all(
          filteredTickets.map(async ticket => {
            const link = await createTicketLink(ticket);
            return `\n- ${link} - Created ${formatRelativeDate(ticket.metadata.created_at)}`;
          })
        );
        
        text += ticketLinks.join('');
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

// Update setupRealtimeSync to track changes
export const setupRealtimeSync = () => {
  const handleChange = async (payload) => {
    console.log('Change detected:', payload)
    // Only invalidate the timestamp if it's a relevant change
    if (payload.new && payload.new !== payload.old) {
      lastUpdateTimestamp = null
      localStorage.removeItem('lastSyncTime')
    }
  }

  const channel = supabase
    .channel('schema-db-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tickets' },
      handleChange
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'comments' },
      handleChange
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

// Update forceSync to be smarter
export const forceSync = async () => {
  console.log('Checking if sync needed...')
  
  // If we have a lastUpdateTimestamp and it's within the last 5 minutes, skip sync
  if (lastUpdateTimestamp) {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    if (new Date(lastUpdateTimestamp) > fiveMinutesAgo) {
      console.log('Sync skipped - data is recent')
      return { success: true, skipped: true }
    }
  }

  try {
    const result = await syncDataToPinecone()
    return result
  } catch (error) {
    console.error('Error during sync:', error)
    throw error
  }
}

const testQueries = [
  "Show all high priority tickets",
  "How many tickets were created today?",
  "What's the trend of tickets over the last week?",
  "Show me tickets assigned to John",
  "List all urgent tickets that are still open"
];

async function runQueryTests() {
  const trace = langfuse.trace({
    name: 'query_test_suite',
    metadata: {
      testType: 'query_coverage',
      timestamp: new Date().toISOString()
    }
  });

  for (const query of testQueries) {
    const querySpan = trace.span({
      name: 'test_query',
      input: { query }
    });

    try {
      const result = await processMessage(query);
      querySpan.end({
        status: 'success',
        output: result,
        metadata: {
          hasResults: result.data !== null,
          isHTML: result.isHTML,
          visualType: result.visualType
        }
      });
    } catch (error) {
      querySpan.end({
        status: 'error',
        statusMessage: error.message
      });
    }
  }
}

const validateResults = (result, expectedResults) => {
  if (!result || !result.data) {
    return false;
  }

  // Check minimum results
  if (expectedResults.minResults && result.data.length < expectedResults.minResults) {
    return false;
  }

  // Check priority
  if (expectedResults.shouldContainPriority) {
    const hasPriority = result.data.some(
      item => item.metadata?.priority?.toLowerCase() === expectedResults.shouldContainPriority.toLowerCase()
    );
    if (!hasPriority) return false;
  }

  // Check status
  if (expectedResults.status) {
    const hasStatus = result.data.some(
      item => item.metadata?.status?.toLowerCase() === expectedResults.status.toLowerCase()
    );
    if (!hasStatus) return false;
  }

  // Check timeframe (this is a basic check, you might want to make it more sophisticated)
  if (expectedResults.timeframe === "today") {
    const today = new Date().toISOString().split('T')[0];
    const hasToday = result.data.some(
      item => item.metadata?.created_at?.startsWith(today)
    );
    if (!hasToday) return false;
  }

  return true;
};

const calculateCosineSimilarity = (vec1, vec2) => {
  const dotProduct = vec1.reduce((acc, val, i) => acc + val * vec2[i], 0);
  const mag1 = Math.sqrt(vec1.reduce((acc, val) => acc + val * val, 0));
  const mag2 = Math.sqrt(vec2.reduce((acc, val) => acc + val * val, 0));
  return dotProduct / (mag1 * mag2);
};

const testQueryPerformance = async () => {
  const trace = langfuse.trace({
    name: 'query_performance_test',
    metadata: {
      testType: 'performance',
      timestamp: new Date().toISOString()
    }
  });

  const testQueries = [
    {
      query: "Show high priority tickets",
      expectedResults: {
        minResults: 1,
        shouldContainPriority: "high"
      }
    },
    {
      query: "Show tickets created today",
      expectedResults: {
        timeframe: "today"
      }
    },
    {
      query: "Show urgent open tickets",
      expectedResults: {
        status: "open",
        priority: "urgent"
      }
    }
  ];

  for (const test of testQueries) {
    const querySpan = trace.span({
      name: 'performance_test',
      input: test
    });

    const startTime = Date.now();
    try {
      const result = await processMessage(test.query);
      const duration = Date.now() - startTime;

      querySpan.end({
        status: 'success',
        output: {
          responseTime: duration,
          hasData: !!result.data,
          resultCount: result.data?.length || 0
        },
        metadata: {
          meetsExpectations: validateResults(result, test.expectedResults),
          responseTimeMs: duration
        }
      });
    } catch (error) {
      querySpan.end({
        status: 'error',
        statusMessage: error.message
      });
    }
  }
};

const testEmbeddingQuality = async () => {
  const trace = langfuse.trace({
    name: 'embedding_quality_test',
    metadata: {
      testType: 'semantic_search'
    }
  });

  const similarityTests = [
    {
      baseQuery: "urgent tickets",
      similarQueries: [
        "high priority issues",
        "critical tickets",
        "emergency tasks"
      ]
    },
    {
      baseQuery: "tickets assigned to John",
      similarQueries: [
        "John's tasks",
        "what is John working on",
        "show John's tickets"
      ]
    }
  ];

  for (const test of similarityTests) {
    const testSpan = trace.span({
      name: 'similarity_test',
      input: test
    });

    try {
      const baseEmbedding = await generateEmbedding(test.baseQuery);
      const similarResults = [];

      for (const query of test.similarQueries) {
        const queryEmbedding = await generateEmbedding(query);
        const similarity = calculateCosineSimilarity(baseEmbedding, queryEmbedding);
        similarResults.push({ query, similarity });
      }

      testSpan.end({
        status: 'success',
        output: similarResults,
        metadata: {
          averageSimilarity: similarResults.reduce((acc, curr) => acc + curr.similarity, 0) / similarResults.length
        }
      });
    } catch (error) {
      testSpan.end({
        status: 'error',
        statusMessage: error.message
      });
    }
  }
};

const testUserSession = async () => {
  const sessionTrace = langfuse.trace({
    name: 'user_session_test',
    metadata: {
      testType: 'user_journey'
    }
  });

  const userJourney = [
    "Show all open tickets",
    "How many high priority tickets are there?",
    "Show tickets assigned to me",
    "What's the trend of tickets this week?",
    "Show distribution of ticket priorities"
  ];

  let previousResponse = null;
  
  for (const query of userJourney) {
    const querySpan = sessionTrace.span({
      name: 'journey_step',
      input: { 
        query,
        previousResponse 
      }
    });

    try {
      const result = await processMessage(query);
      previousResponse = result;

      querySpan.end({
        status: 'success',
        output: result,
        metadata: {
          hasVisualization: !!result.visualType,
          responseType: result.visualType || 'text',
          dataPoints: result.data?.length || 0
        }
      });
    } catch (error) {
      querySpan.end({
        status: 'error',
        statusMessage: error.message
      });
    }
  }
};

const runComprehensiveTests = async () => {
  const suiteTrace = langfuse.trace({
    name: 'comprehensive_test_suite',
    metadata: {
      testType: 'full_coverage',
      timestamp: new Date().toISOString()
    }
  });

  try {
    // Test data sync
    const syncSpan = suiteTrace.span({ name: 'sync_test' });
    await forceSync();
    syncSpan.end({ status: 'success' });

    // Run all tests
    await Promise.all([
      testQueryPerformance(),
      testEmbeddingQuality(),
      testUserSession()
    ]);

    suiteTrace.update({
      status: 'success',
      metadata: {
        completedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    suiteTrace.update({
      status: 'error',
      statusMessage: error.message
    });
  }
};

export {
  // processMessage,
  // syncDataToPinecone,
  // setupRealtimeSync,
  // forceSync,
  generateEmbedding,
  validateResults,
  calculateCosineSimilarity,
  testQueryPerformance,
  testEmbeddingQuality,
  testUserSession,
  runComprehensiveTests
} 