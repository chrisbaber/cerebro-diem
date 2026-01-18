import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushNotificationPayload {
  user_id?: string;
  fcm_token?: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  type?: string;
}

// Helper to create JWT for FCM v1 API
async function createJWT(serviceAccount: { client_email: string; private_key: string }): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import the private key
  const pemContents = serviceAccount.private_key
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\n/g, '');
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(unsignedToken)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  return `${unsignedToken}.${signatureB64}`;
}

// Get OAuth2 access token
async function getAccessToken(serviceAccount: { client_email: string; private_key: string }): Promise<string> {
  const jwt = await createJWT(serviceAccount);

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`OAuth error: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

/**
 * Send push notifications via Firebase Cloud Messaging v1 API
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const fcmServiceAccountJson = Deno.env.get('FCM_SERVICE_ACCOUNT');

    if (!fcmServiceAccountJson) {
      throw new Error('FCM_SERVICE_ACCOUNT not configured');
    }

    const serviceAccount = JSON.parse(fcmServiceAccountJson);
    const projectId = serviceAccount.project_id;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: PushNotificationPayload = await req.json();
    const { user_id, title, body, data, type = 'general' } = payload;
    let { fcm_token } = payload;

    // If user_id provided, look up their FCM token
    if (user_id && !fcm_token) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('fcm_token, notifications_enabled')
        .eq('id', user_id)
        .single();

      if (profileError || !profile) {
        return new Response(
          JSON.stringify({ error: 'User not found or no FCM token' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!profile.notifications_enabled) {
        return new Response(
          JSON.stringify({ success: false, reason: 'Notifications disabled by user' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      fcm_token = profile.fcm_token;
    }

    if (!fcm_token) {
      return new Response(
        JSON.stringify({ error: 'No FCM token available' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get OAuth2 access token
    const accessToken = await getAccessToken(serviceAccount);

    // Send notification via FCM v1 API
    const fcmPayload = {
      message: {
        token: fcm_token,
        notification: {
          title,
          body,
        },
        data: {
          ...data,
          type,
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channel_id: 'default',
          },
        },
      },
    };

    const fcmResponse = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fcmPayload),
      }
    );

    const fcmResult = await fcmResponse.json();

    // Log the notification
    if (user_id) {
      await supabase.from('notification_logs').insert({
        user_id,
        type,
        title,
        body,
        data,
        delivered: fcmResponse.ok,
        error: fcmResponse.ok ? null : JSON.stringify(fcmResult.error),
      });
    }

    if (fcmResponse.ok) {
      return new Response(
        JSON.stringify({ success: true, message_id: fcmResult.name }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.error('FCM Error:', fcmResult);
      return new Response(
        JSON.stringify({ success: false, error: fcmResult.error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
