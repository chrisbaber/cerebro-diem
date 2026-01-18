import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Process incoming emails for capture
 * This endpoint receives webhooks from email provider (SendGrid, Postmark, etc.)
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const webhookSecret = Deno.env.get('EMAIL_WEBHOOK_SECRET');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify webhook signature if configured
    const signature = req.headers.get('X-Webhook-Signature');
    if (webhookSecret && signature) {
      // Verify signature (implementation depends on email provider)
      // For now, we'll trust the request if it reaches this endpoint
    }

    const payload = await req.json();

    // Parse email based on provider format
    // This example handles a generic format - adjust for SendGrid, Postmark, etc.
    const {
      to,
      from,
      subject,
      text,
      html,
      attachments = [],
    } = payload;

    // Extract the capture address from the 'to' field
    const toAddress = Array.isArray(to) ? to[0] : to;
    const captureAddress = typeof toAddress === 'string' ? toAddress : toAddress?.address;

    if (!captureAddress) {
      return new Response(
        JSON.stringify({ error: 'No recipient address found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the email address record
    const { data: emailRecord, error: emailError } = await supabase
      .from('email_addresses')
      .select('id, user_id, is_active')
      .eq('address', captureAddress.toLowerCase())
      .single();

    if (emailError || !emailRecord) {
      console.log('Unknown email address:', captureAddress);
      return new Response(
        JSON.stringify({ error: 'Unknown capture address' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!emailRecord.is_active) {
      return new Response(
        JSON.stringify({ error: 'Capture address is disabled' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fromAddress = typeof from === 'string' ? from : from?.address || 'unknown';

    // Store the email capture
    const { data: emailCapture, error: captureError } = await supabase
      .from('email_captures')
      .insert({
        user_id: emailRecord.user_id,
        email_address_id: emailRecord.id,
        from_address: fromAddress,
        subject: subject || '(No Subject)',
        body_text: text || '',
        body_html: html || '',
        attachments: attachments.map((a: any) => ({
          name: a.filename || a.name,
          size: a.size,
          content_type: a.contentType || a.type,
        })),
      })
      .select()
      .single();

    if (captureError) throw captureError;

    // Update email count
    await supabase.rpc('increment_email_count', { email_id: emailRecord.id });

    // Create a capture from the email content
    const captureText = `[Email from ${fromAddress}]\nSubject: ${subject || '(No Subject)'}\n\n${text || ''}`.trim();

    const { data: capture, error: createError } = await supabase
      .from('captures')
      .insert({
        user_id: emailRecord.user_id,
        raw_text: captureText.slice(0, 5000), // Limit length
        source: 'email',
        processed: false,
        metadata: {
          email_from: fromAddress,
          email_subject: subject,
          email_capture_id: emailCapture.id,
        },
      })
      .select()
      .single();

    if (createError) throw createError;

    // Link capture to email
    await supabase
      .from('email_captures')
      .update({ capture_id: capture.id, processed: true })
      .eq('id', emailCapture.id);

    // Trigger classification (fire and forget)
    const authHeader = req.headers.get('Authorization');
    fetch(`${supabaseUrl}/functions/v1/classify-capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ capture_id: capture.id }),
    }).catch(console.error);

    return new Response(
      JSON.stringify({
        success: true,
        email_capture_id: emailCapture.id,
        capture_id: capture.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
