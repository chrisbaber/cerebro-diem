-- Helper function to increment email count
CREATE OR REPLACE FUNCTION increment_email_count(email_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.email_addresses
    SET emails_received = emails_received + 1
    WHERE id = email_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
