import { supabase } from './supabase'

export const getAgentMetrics = async (startDate, endDate) => {
  try {
    const query = supabase.from('tickets')
      .select('*')
      .eq('assignee_type', 'user')
      .eq('assigned_to', (await supabase.auth.getUser()).data.user?.id);

    if (startDate && endDate) {
      query.gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
    }

    const { data: tickets, error } = await query;

    if (error) throw error;

    const openTickets = tickets.filter(ticket => ticket.status !== 'closed');
    const closedTickets = tickets.filter(ticket => ticket.status === 'closed');

    // Calculate average time tickets have been open
    const now = new Date();
    let totalOpenTime = 0;
    openTickets.forEach(ticket => {
      const createdAt = new Date(ticket.created_at);
      totalOpenTime += now - createdAt;
    });

    // Calculate average time to close tickets
    let totalTimeToClose = 0;
    closedTickets.forEach(ticket => {
      const createdAt = new Date(ticket.created_at);
      const closedAt = new Date(ticket.updated_at);
      totalTimeToClose += closedAt - createdAt;
    });

    return {
      open_tickets: openTickets.length,
      closed_tickets: closedTickets.length,
      avg_time_open: openTickets.length ? totalOpenTime / openTickets.length / (1000 * 60 * 60) : 0, // in hours
      avg_time_to_close: closedTickets.length ? totalTimeToClose / closedTickets.length / (1000 * 60 * 60) : 0 // in hours
    };
  } catch (error) {
    console.error('Error getting agent metrics:', error);
    throw error;
  }
};

export const getAdminMetrics = async (startDate, endDate) => {
  try {
    // First get tickets
    const query = supabase.from('tickets').select('*');

    if (startDate && endDate) {
      query.gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
    }

    const { data: tickets, error } = await query;
    if (error) throw error;

    // Then get profiles and teams for mapping
    const { data: profiles } = await supabase.from('profiles').select('id, full_name');
    const { data: teams } = await supabase.from('teams').select('id, name');

    // Create lookup maps
    const profileMap = Object.fromEntries(profiles?.map(p => [p.id, p.full_name]) || []);
    const teamMap = Object.fromEntries(teams?.map(t => [t.id, t.name]) || []);

    // Basic ticket counts
    const totalTickets = tickets.length;
    const newTickets = tickets.filter(t => t.status === 'new').length;
    const openTickets = tickets.filter(t => t.status === 'open').length;
    const closedTickets = tickets.filter(t => t.status === 'closed').length;

    // Tickets by priority
    const ticketsByPriority = tickets.reduce((acc, ticket) => {
      acc[ticket.priority] = (acc[ticket.priority] || 0) + 1;
      return acc;
    }, {});

    // Tickets by status
    const ticketsByStatus = tickets.reduce((acc, ticket) => {
      acc[ticket.status] = (acc[ticket.status] || 0) + 1;
      return acc;
    }, {});

    // Tickets by assignee
    const ticketsByAssignee = tickets.reduce((acc, ticket) => {
      let assigneeName = 'Unassigned';
      if (ticket.assignee_type === 'user') {
        assigneeName = profileMap[ticket.assigned_to] || 'Unknown User';
      } else if (ticket.assignee_type === 'team') {
        assigneeName = `Team: ${teamMap[ticket.assigned_to] || 'Unknown Team'}`;
      }
      acc[assigneeName] = (acc[assigneeName] || 0) + 1;
      return acc;
    }, {});

    // Daily ticket counts
    const dailyTicketCounts = tickets.reduce((acc, ticket) => {
      const date = ticket.created_at.split('T')[0];
      const existingDay = acc.find(d => d.date === date);
      if (existingDay) {
        existingDay.count++;
      } else {
        acc.push({ date, count: 1 });
      }
      return acc;
    }, []).sort((a, b) => a.date.localeCompare(b.date));

    return {
      total_tickets: totalTickets,
      new_tickets: newTickets,
      open_tickets: openTickets,
      closed_tickets: closedTickets,
      tickets_by_priority: ticketsByPriority,
      tickets_by_status: ticketsByStatus,
      tickets_by_assignee: ticketsByAssignee,
      daily_ticket_counts: dailyTicketCounts
    };
  } catch (error) {
    console.error('Error getting admin metrics:', error);
    throw error;
  }
}; 