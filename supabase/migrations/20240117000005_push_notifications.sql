-- Add FCM token support for push notifications

-- Add FCM token columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS fcm_token TEXT,
ADD COLUMN IF NOT EXISTS fcm_token_updated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT TRUE;

-- Create index for finding users by FCM token
CREATE INDEX IF NOT EXISTS idx_profiles_fcm_token ON public.profiles(fcm_token) WHERE fcm_token IS NOT NULL;

-- Create notification_logs table to track sent notifications
CREATE TABLE IF NOT EXISTS public.notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'digest', 'reminder', 'pattern', etc.
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    delivered BOOLEAN DEFAULT FALSE,
    error TEXT
);

-- Enable RLS
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- RLS policy for notification_logs
CREATE POLICY "Users can view own notification logs"
ON public.notification_logs FOR SELECT
USING (auth.uid() = user_id);

-- Index for notification_logs
CREATE INDEX idx_notification_logs_user_id ON public.notification_logs(user_id);
CREATE INDEX idx_notification_logs_sent_at ON public.notification_logs(sent_at DESC);

-- Comment
COMMENT ON TABLE public.notification_logs IS 'Logs of push notifications sent to users';
COMMENT ON COLUMN public.profiles.fcm_token IS 'Firebase Cloud Messaging token for push notifications';
