import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailPayload {
  to: string
  from: string
  subject: string
  text: string
  html?: string
  attachments?: Array<{
    filename: string
    content: string
    type: string
  }>
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payload: EmailPayload = await req.json()
    const supportEmail = payload.to.split('@')[0] // Get the local part of the email address

    // Find the organization by support email
    const { data: org, error: orgError } = await supabaseClient
      .from('organizations')
      .select('id')
      .eq('support_email', payload.to)
      .single()

    if (orgError || !org) {
      console.error('Organization not found:', orgError)
      return new Response(
        JSON.stringify({ error: 'Invalid support email address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create a new ticket
    const { data: ticket, error: ticketError } = await supabaseClient
      .from('tickets')
      .insert([
        {
          subject: payload.subject,
          description: payload.text || 'No content provided',
          status: 'new',
          priority: 'medium',
          category: 'email',
          // We'll need to handle creator_id differently since this is coming from email
          metadata: {
            source: 'email',
            from: payload.from,
            original_email: payload
          }
        }
      ])
      .select()
      .single()

    if (ticketError) {
      console.error('Error creating ticket:', ticketError)
      return new Response(
        JSON.stringify({ error: 'Failed to create ticket' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ message: 'Ticket created successfully', ticket }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error processing email:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 