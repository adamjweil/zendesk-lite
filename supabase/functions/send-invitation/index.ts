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
    const ADMIN_EMAIL = 'adamjweil@gmail.com' // Your verified email

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

    console.log('Sending email to:', email)
    console.log('Invite URL:', inviteUrl)

    // In development, always send to admin email but include intended recipient in subject
    const emailTo = IS_DEVELOPMENT ? ADMIN_EMAIL : email
    const subjectPrefix = IS_DEVELOPMENT ? `[TEST - ${email}] ` : ''

    // Send email using Resend's API directly
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Zendesk Lite <onboarding@resend.dev>',
        to: emailTo,
        subject: `${subjectPrefix}You've been invited to join ${organization.name}`,
        html: `
          <h2>You've been invited!</h2>
          ${IS_DEVELOPMENT ? `<p><strong>TEST MODE - Original recipient: ${email}</strong></p>` : ''}
          <p>${inviter.full_name} has invited you to join ${organization.name} on Zendesk Lite.</p>
          <p>Click the link below to accept the invitation:</p>
          <a href="${inviteUrl}" style="display: inline-block; padding: 10px 20px; background-color: #0284c7; color: white; text-decoration: none; border-radius: 5px;">
            Accept Invitation
          </a>
          <p>This invitation link will expire in 7 days.</p>
          ${IS_DEVELOPMENT ? `
          <hr>
          <p><strong>Development Mode Notice:</strong></p>
          <p>This is a test email. In production, this would be sent to: ${email}</p>
          ` : ''}
        `,
      }),
    })

    const result = await response.json()
    console.log('Resend API response:', result)

    if (!response.ok) {
      console.error('Resend API error:', result)
      throw new Error(result.message || 'Failed to send email')
    }

    return new Response(JSON.stringify({ 
      success: true,
      development: IS_DEVELOPMENT,
      originalRecipient: email,
      actualRecipient: emailTo
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error in send-invitation function:', error)
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack,
      details: 'Check function logs for more details'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
}) 