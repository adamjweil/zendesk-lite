import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const IS_DEVELOPMENT = Deno.env.get('ENVIRONMENT') === 'development'

    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set')
    }

    const body = await req.json()
    console.log('Request body:', body)

    const { email, token, organization, inviter } = body

    if (!email || !token || !organization || !inviter) {
      throw new Error('Missing required fields in request body')
    }

    // Use the request origin as the APP_URL
    const origin = req.headers.get('origin') || 'http://localhost:5173'
    const inviteUrl = `${origin}/accept-invitation?token=${token}`

    const ADMIN_EMAIL = 'adamjweil@gmail.com' // Your verified email
    
    // In test mode, we can only send to verified emails
    const recipient = IS_DEVELOPMENT ? ADMIN_EMAIL : email
    console.log('Sending email to:', recipient)
    console.log('Invite URL:', inviteUrl)

    // Send email only to the invited user
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Zendesk Lite <onboarding@resend.dev>',
        to: recipient,
        subject: `You've been invited to join ${organization.name}`,
        html: `
          <h2>You've been invited!</h2>
          <p>${inviter.full_name} has invited you to join ${organization.name} on Zendesk Lite.</p>
          <p>The invitation was sent to: ${email}</p>
          <p>Click the link below to accept the invitation:</p>
          <a href="${inviteUrl}" style="display: inline-block; padding: 10px 20px; background-color: #0284c7; color: white; text-decoration: none; border-radius: 5px;">
            Accept Invitation
          </a>
          <p>This invitation link will expire in 7 days.</p>
        `,
      }),
    })

    const responseData = await response.json()
    console.log('Resend API response:', responseData)

    if (!response.ok) {
      throw new Error(`Failed to send email: ${JSON.stringify(responseData)}`)
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error sending invitation:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
}) 