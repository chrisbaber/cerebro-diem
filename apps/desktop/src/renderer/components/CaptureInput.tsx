import { useState, useRef } from 'react';
import { Mic, Send, MicOff, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabase';

export default function CaptureInput() {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const handleSubmit = async () => {
    if (!text.trim() || isProcessing) return;

    setIsProcessing(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Create capture
      const { data: capture, error: captureError } = await supabase
        .from('captures')
        .insert({
          user_id: session.user.id,
          raw_text: text.trim(),
          source: 'text',
          processed: false,
        })
        .select()
        .single();

      if (captureError) throw captureError;

      // Trigger classification
      fetch(`https://epbnucvawcggjmttwwtg.supabase.co/functions/v1/classify-capture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ capture_id: capture.id }),
      }).catch(console.error);

      setText('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        await processAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err: any) {
      setError('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Convert to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(audioBlob);
      const base64 = await base64Promise;

      // Transcribe
      const response = await fetch(
        'https://epbnucvawcggjmttwwtg.supabase.co/functions/v1/transcribe-audio',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ audio_base64: base64, format: 'webm' }),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      // Set transcribed text
      setText(result.text);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="relative flex items-center gap-2">
        <div className="flex-1 relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What's on your mind?"
            className="w-full px-4 py-3 pr-12 rounded-2xl border border-outline/30 bg-surface-variant/30
                       focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                       resize-none text-on-surface placeholder:text-on-surface-variant"
            rows={1}
            disabled={isProcessing}
          />
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || isProcessing}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full
                       text-primary hover:bg-primary-container disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors"
          >
            {isProcessing ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>

        <button
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onMouseLeave={stopRecording}
          onTouchStart={startRecording}
          onTouchEnd={stopRecording}
          disabled={isProcessing}
          className={`p-4 rounded-full transition-all ${
            isRecording
              ? 'bg-error text-white scale-110 animate-pulse'
              : 'bg-primary text-white hover:bg-primary/90'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isRecording ? <MicOff size={24} /> : <Mic size={24} />}
        </button>
      </div>

      {isRecording && (
        <p className="text-center text-sm text-on-surface-variant mt-2 animate-pulse">
          Recording... Release to stop
        </p>
      )}

      {error && (
        <p className="text-center text-sm text-error mt-2">
          {error}
        </p>
      )}
    </div>
  );
}
