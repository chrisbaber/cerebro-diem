import { useState, useRef } from 'react';
import { Mic, Send, MicOff, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '../services/supabase';

export default function CaptureInput() {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const handleSubmit = async (overrideText?: string, source: 'text' | 'voice' = 'text') => {
    const submitText = overrideText || text;
    if (!submitText.trim()) return;

    // Immediately clear input and show "Captured!" - don't block UI
    setText('');
    setSuccess('Captured!');
    setError(null);

    // Clear success after 2 seconds
    setTimeout(() => setSuccess(null), 2000);

    // Do the actual save and classification in the background
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return;
      }

      // Create capture
      const { data: capture, error: captureError } = await supabase
        .from('captures')
        .insert({
          user_id: session.user.id,
          raw_text: submitText.trim(),
          source,
          processed: false,
        })
        .select()
        .single();

      if (captureError) {
        console.error('Capture error:', captureError);
        setError('Failed to save');
        return;
      }

      // Trigger classification in background (fire and forget)
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/classify-capture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ capture_id: capture.id }),
      }).then(async (response) => {
        if (!response.ok) {
          const result = await response.json();
          console.error('Classification error (background):', result);
        }
      }).catch((err) => {
        console.error('Classification error (background):', err);
      });
    } catch (err: any) {
      console.error('Submit error:', err);
      setError(err.message);
    }
  };

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Check supported mimeTypes
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());

        if (chunksRef.current.length === 0) {
          setError('No audio recorded. Please try again.');
          return;
        }

        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        if (audioBlob.size < 1000) {
          setError('Recording too short. Hold the button longer.');
          return;
        }

        await processAudio(audioBlob);
      };

      // Start with timeslice to collect data periodically
      mediaRecorder.start(100);
      setIsRecording(true);
    } catch (err: any) {
      console.error('Microphone error:', err);
      setError(err.name === 'NotAllowedError'
        ? 'Microphone access denied. Please allow microphone access and try again.'
        : 'Could not access microphone: ' + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    setError(null);

    try {
      // Get fresh session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated - please log in again');

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

      // Determine format from blob type
      const format = audioBlob.type.includes('mp4') ? 'mp4' : 'webm';

      // Transcribe
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe-audio`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ audio_base64: base64, format }),
        }
      );

      const responseText = await response.text();

      let result;
      try {
        result = JSON.parse(responseText);
      } catch {
        throw new Error(`Server error: ${responseText.substring(0, 100)}`);
      }

      if (!response.ok) throw new Error(result.error || `Transcription failed (${response.status})`);

      if (!result.text || result.text.trim() === '') {
        setError('Could not transcribe audio. Please speak clearly and try again.');
        setIsTranscribing(false);
        return;
      }

      // Auto-submit the transcribed text directly (no text box)
      setIsTranscribing(false);
      await handleSubmit(result.text.trim(), 'voice');
    } catch (err: any) {
      console.error('Transcription error:', err);
      setError(err.message || 'Transcription failed');
      setIsTranscribing(false);
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
            disabled={isTranscribing}
          />
          <button
            onClick={() => handleSubmit()}
            disabled={!text.trim()}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full
                       text-primary hover:bg-primary-container disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors"
          >
            <Send size={20} />
          </button>
        </div>

        <button
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onMouseLeave={stopRecording}
          onTouchStart={startRecording}
          onTouchEnd={stopRecording}
          disabled={isTranscribing}
          className={`p-4 rounded-full transition-all ${
            isRecording
              ? 'bg-error text-white scale-110 animate-pulse'
              : isTranscribing
              ? 'bg-primary/50 text-white'
              : 'bg-primary text-white hover:bg-primary/90'
          } disabled:cursor-not-allowed`}
        >
          {isTranscribing ? (
            <Loader2 size={24} className="animate-spin" />
          ) : isRecording ? (
            <MicOff size={24} />
          ) : (
            <Mic size={24} />
          )}
        </button>
      </div>

      {isRecording && (
        <p className="text-center text-sm text-on-surface-variant mt-2 animate-pulse">
          Recording... Release to stop
        </p>
      )}

      {isTranscribing && (
        <p className="text-center text-sm text-on-surface-variant mt-2">
          Transcribing...
        </p>
      )}

      {error && (
        <p className="text-center text-sm text-error mt-2">
          {error}
        </p>
      )}

      {success && (
        <p className="text-center text-sm text-green-600 mt-2 flex items-center justify-center gap-1">
          <CheckCircle size={16} />
          {success}
        </p>
      )}
    </div>
  );
}
