import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0';
import { decode } from 'https://deno.land/std@0.168.0/encoding/base64.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Use Groq for free Whisper transcription
    const groqApiKey = Deno.env.get('GROQ_API_KEY');

    if (!groqApiKey) {
      console.error('GROQ_API_KEY not set');
      return new Response(
        JSON.stringify({ error: 'Server configuration error: GROQ_API_KEY not set' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // JWT is automatically verified by Supabase Edge Runtime when verify_jwt is true
    // We just need to proceed with the transcription

    const { audio_base64, format = 'm4a' } = await req.json();

    if (!audio_base64) {
      return new Response(
        JSON.stringify({ error: 'audio_base64 is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decode base64 to bytes
    const audioBytes = decode(audio_base64);

    // Determine content type
    const contentTypes: Record<string, string> = {
      'm4a': 'audio/mp4',
      'mp4': 'audio/mp4',
      'wav': 'audio/wav',
      'webm': 'audio/webm',
      'mp3': 'audio/mpeg',
    };
    const contentType = contentTypes[format] || 'audio/mp4';

    // Create form data for Groq Whisper API (free, fast, OpenAI-compatible)
    const formData = new FormData();
    const blob = new Blob([audioBytes], { type: contentType });
    formData.append('file', blob, `recording.${format}`);
    formData.append('model', 'whisper-large-v3');
    formData.append('language', 'en');

    // Call Groq Whisper API (free tier available)
    const whisperResponse = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
      },
      body: formData,
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error('Groq Whisper error:', errorText);
      throw new Error(`Groq Whisper API error: ${whisperResponse.status}`);
    }

    const whisperData = await whisperResponse.json();
    const transcribedText = whisperData.text;

    return new Response(
      JSON.stringify({
        success: true,
        text: transcribedText,
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
