import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0';
import { decode } from 'https://deno.land/std@0.168.0/encoding/base64.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple text extraction prompt for images/PDFs
const EXTRACT_CONTENT_PROMPT = `Extract all meaningful text and key information from this content.
Return a clean, readable summary that captures:
1. Main topics or themes
2. Key facts, names, or data points
3. Any action items or important dates

Format as plain text, keeping the most important information. Be concise but complete.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openrouterApiKey = Deno.env.get('OPENROUTER_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the JWT from the request to identify the user
    const authHeader = req.headers.get('Authorization')!;
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { type, content, url } = await req.json();

    if (!type || (!content && !url)) {
      return new Response(
        JSON.stringify({ error: 'type and (content or url) are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let extractedText = '';

    switch (type) {
      case 'url': {
        // Fetch URL content and extract text
        if (!url) {
          throw new Error('URL is required for url type');
        }

        // Use OpenRouter to extract content from URL via vision model
        const urlResponse = await fetch(url);
        const urlContent = await urlResponse.text();

        // Simple HTML to text extraction
        extractedText = urlContent
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 10000); // Limit content length

        // Use LLM to summarize the extracted content
        const summaryResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openrouterApiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://cerebrodiem.com',
            'X-Title': 'Cerebro Diem',
          },
          body: JSON.stringify({
            model: 'openai/gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'Summarize this web page content into key points. Be concise but capture all important information.',
              },
              {
                role: 'user',
                content: `URL: ${url}\n\nContent:\n${extractedText}`,
              },
            ],
            temperature: 0.3,
            max_tokens: 1000,
          }),
        });

        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json();
          extractedText = `[Imported from ${url}]\n\n${summaryData.choices[0].message.content}`;
        }
        break;
      }

      case 'image': {
        // Use vision model for OCR
        if (!content) {
          throw new Error('Base64 content is required for image type');
        }

        const visionResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openrouterApiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://cerebrodiem.com',
            'X-Title': 'Cerebro Diem',
          },
          body: JSON.stringify({
            model: 'openai/gpt-4o-mini', // gpt-4o-mini supports vision
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: EXTRACT_CONTENT_PROMPT,
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:image/jpeg;base64,${content}`,
                    },
                  },
                ],
              },
            ],
            temperature: 0.2,
            max_tokens: 1500,
          }),
        });

        if (!visionResponse.ok) {
          const errorText = await visionResponse.text();
          console.error('Vision API error:', errorText);
          throw new Error('Failed to process image');
        }

        const visionData = await visionResponse.json();
        extractedText = `[Extracted from image]\n\n${visionData.choices[0].message.content}`;
        break;
      }

      case 'pdf': {
        // For PDF, we'll use a text extraction approach
        // Note: Full PDF parsing requires additional libraries
        // For MVP, we'll extract what we can and use LLM to process
        if (!content) {
          throw new Error('Base64 content is required for pdf type');
        }

        // Decode the PDF and try to extract text markers
        const pdfBytes = decode(content);
        const pdfText = new TextDecoder('utf-8', { fatal: false }).decode(pdfBytes);

        // Basic text extraction from PDF (looks for text between stream markers)
        const textMatches = pdfText.match(/\(([^)]+)\)/g) || [];
        const rawText = textMatches
          .map(m => m.slice(1, -1))
          .filter(t => t.length > 2 && /[a-zA-Z]/.test(t))
          .join(' ')
          .slice(0, 5000);

        if (rawText.length > 50) {
          // Use LLM to clean up and summarize the extracted text
          const cleanupResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openrouterApiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://cerebrodiem.com',
              'X-Title': 'Cerebro Diem',
            },
            body: JSON.stringify({
              model: 'openai/gpt-4o-mini',
              messages: [
                {
                  role: 'system',
                  content: 'Clean up and summarize this extracted PDF text. Fix any encoding issues and present the key information clearly.',
                },
                {
                  role: 'user',
                  content: rawText,
                },
              ],
              temperature: 0.2,
              max_tokens: 1000,
            }),
          });

          if (cleanupResponse.ok) {
            const cleanupData = await cleanupResponse.json();
            extractedText = `[Extracted from PDF]\n\n${cleanupData.choices[0].message.content}`;
          } else {
            extractedText = `[Extracted from PDF]\n\n${rawText}`;
          }
        } else {
          extractedText = '[PDF import]: Unable to extract text from this PDF. It may be image-based or encrypted.';
        }
        break;
      }

      case 'text': {
        // Plain text import - just use as-is
        extractedText = content || '';
        break;
      }

      default:
        throw new Error(`Unsupported import type: ${type}`);
    }

    // Create a capture from the extracted content
    const { data: capture, error: captureError } = await supabase
      .from('captures')
      .insert({
        user_id: user.id,
        raw_text: extractedText,
        source: 'import',
        processed: false,
      })
      .select()
      .single();

    if (captureError) throw captureError;

    // Trigger classification (fire and forget)
    fetch(`${supabaseUrl}/functions/v1/classify-capture`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ capture_id: capture.id }),
    }).catch(console.error);

    return new Response(
      JSON.stringify({
        success: true,
        capture,
        extracted_text: extractedText,
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
