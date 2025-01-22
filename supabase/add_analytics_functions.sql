-- Function to calculate ticket metrics for an agent
CREATE OR REPLACE FUNCTION get_agent_ticket_metrics(
    p_agent_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'open_tickets', (
            SELECT COUNT(*)
            FROM tickets
            WHERE assignee_id = p_agent_id
            AND status IN ('new', 'open', 'pending')
            AND (p_start_date IS NULL OR created_at >= p_start_date)
            AND (p_end_date IS NULL OR created_at <= p_end_date)
        ),
        'closed_tickets', (
            SELECT COUNT(*)
            FROM tickets
            WHERE assignee_id = p_agent_id
            AND status IN ('resolved', 'closed')
            AND (p_start_date IS NULL OR created_at >= p_start_date)
            AND (p_end_date IS NULL OR created_at <= p_end_date)
        ),
        'avg_time_open', (
            SELECT 
                EXTRACT(epoch FROM AVG(
                    CASE 
                        WHEN status IN ('new', 'open', 'pending') THEN NOW() - created_at
                        ELSE updated_at - created_at
                    END
                ))/3600 -- Convert to hours
            FROM tickets
            WHERE assignee_id = p_agent_id
            AND (p_start_date IS NULL OR created_at >= p_start_date)
            AND (p_end_date IS NULL OR created_at <= p_end_date)
        ),
        'avg_time_to_close', (
            SELECT EXTRACT(epoch FROM AVG(updated_at - created_at))/3600 -- Convert to hours
            FROM tickets
            WHERE assignee_id = p_agent_id
            AND status IN ('resolved', 'closed')
            AND (p_start_date IS NULL OR created_at >= p_start_date)
            AND (p_end_date IS NULL OR created_at <= p_end_date)
        )
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get organization-wide ticket metrics for admins
CREATE OR REPLACE FUNCTION get_admin_ticket_metrics(
    p_organization_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    WITH org_tickets AS (
        SELECT DISTINCT t.*
        FROM tickets t
        LEFT JOIN profiles creator ON t.creator_id = creator.id
        LEFT JOIN profiles assignee ON t.assignee_id = assignee.id
        WHERE (creator.organization_id = p_organization_id OR assignee.organization_id = p_organization_id)
        AND (p_start_date IS NULL OR t.created_at >= p_start_date)
        AND (p_end_date IS NULL OR t.created_at <= p_end_date)
    )
    SELECT json_build_object(
        'total_tickets', (
            SELECT COUNT(*)
            FROM org_tickets
        ),
        'open_tickets', (
            SELECT COUNT(*)
            FROM org_tickets
            WHERE status IN ('new', 'open', 'pending')
        ),
        'closed_tickets', (
            SELECT COUNT(*)
            FROM org_tickets
            WHERE status IN ('resolved', 'closed')
        ),
        'tickets_by_priority', (
            SELECT json_object_agg(priority, count)
            FROM (
                SELECT priority, COUNT(*) as count
                FROM org_tickets
                GROUP BY priority
            ) priority_counts
        ),
        'tickets_by_status', (
            SELECT json_object_agg(status, count)
            FROM (
                SELECT status, COUNT(*) as count
                FROM org_tickets
                GROUP BY status
            ) status_counts
        ),
        'tickets_by_assignee', (
            SELECT json_object_agg(assignee_name, count)
            FROM (
                SELECT 
                    COALESCE(p.full_name, 'Unassigned') as assignee_name,
                    COUNT(*) as count
                FROM org_tickets t
                LEFT JOIN profiles p ON t.assignee_id = p.id
                GROUP BY p.full_name
            ) assignee_counts
        ),
        'daily_ticket_counts', (
            SELECT json_agg(json_build_object(
                'date', date,
                'count', count
            ) ORDER BY date)
            FROM (
                SELECT 
                    DATE_TRUNC('day', created_at) as date,
                    COUNT(*) as count
                FROM org_tickets
                GROUP BY DATE_TRUNC('day', created_at)
            ) daily_counts
        )
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_agent_ticket_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_ticket_metrics TO authenticated; 