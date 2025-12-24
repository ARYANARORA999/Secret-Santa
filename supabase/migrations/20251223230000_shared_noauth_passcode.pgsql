-- language=postgresql
-- Shared no-auth mode (passcode-based)
--
-- Goal: allow everyone to view the event/participants/gifts without Supabase Auth,
-- and allow writes only if the caller knows the event passcode.
--
-- IMPORTANT SECURITY NOTE:
-- This is intentionally a lightweight, "party game" security model.
-- Anyone who has the event passcode can modify the event.
-- Do not use this for sensitive data.

-- 1) Add passcode hash column to events
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS passcode_hash TEXT;

-- 2) Utility: SHA-256 hex
CREATE OR REPLACE FUNCTION public.sha256_hex(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT encode(digest(coalesce(input,''), 'sha256'), 'hex');
$$;

-- 3) Validate passcode for an event
CREATE OR REPLACE FUNCTION public.ss_validate_passcode(p_event_id uuid, p_passcode text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.events e
    WHERE e.id = p_event_id
      AND e.passcode_hash IS NOT NULL
      AND e.passcode_hash = public.sha256_hex(p_passcode)
  );
$$;

-- 4) Create or fetch the shared event (single-event app)
CREATE OR REPLACE FUNCTION public.ss_get_or_create_event(p_name text, p_passcode text)
RETURNS public.events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  e public.events;
BEGIN
  SELECT * INTO e FROM public.events ORDER BY created_at ASC LIMIT 1;
  IF FOUND THEN
    RETURN e;
  END IF;

  INSERT INTO public.events (name, created_by, passcode_hash)
  VALUES (coalesce(nullif(p_name,''), 'Secret Santa'), gen_random_uuid(), public.sha256_hex(p_passcode))
  RETURNING * INTO e;

  RETURN e;
END;
$$;

-- 5) Join event / insert participant
CREATE OR REPLACE FUNCTION public.ss_upsert_participant(p_event_id uuid, p_passcode text, p_display_name text)
RETURNS public.participants
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.participants;
BEGIN
  IF NOT public.ss_validate_passcode(p_event_id, p_passcode) THEN
    RAISE EXCEPTION 'Invalid passcode';
  END IF;

  INSERT INTO public.participants (event_id, user_id, display_name)
  VALUES (p_event_id, gen_random_uuid(), trim(p_display_name))
  RETURNING * INTO p;

  RETURN p;
END;
$$;

-- 6) Add gift
CREATE OR REPLACE FUNCTION public.ss_add_gift(
  p_event_id uuid,
  p_passcode text,
  p_from_participant_id uuid,
  p_to_participant_id uuid,
  p_status text,
  p_message text,
  p_images text[]
)
RETURNS public.gifts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  g public.gifts;
BEGIN
  IF NOT public.ss_validate_passcode(p_event_id, p_passcode) THEN
    RAISE EXCEPTION 'Invalid passcode';
  END IF;

  INSERT INTO public.gifts (event_id, from_participant_id, to_participant_id, status, message, images)
  VALUES (p_event_id, p_from_participant_id, p_to_participant_id, coalesce(p_status,'pending'), p_message, coalesce(p_images,'{}'))
  RETURNING * INTO g;

  RETURN g;
END;
$$;

-- 7) Toggle gift unlock
CREATE OR REPLACE FUNCTION public.ss_set_gift_unlocked(p_event_id uuid, p_passcode text, p_gift_id uuid, p_is_unlocked boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.ss_validate_passcode(p_event_id, p_passcode) THEN
    RAISE EXCEPTION 'Invalid passcode';
  END IF;

  UPDATE public.gifts
  SET is_unlocked = p_is_unlocked
  WHERE id = p_gift_id AND event_id = p_event_id;
END;
$$;

-- 8) Delete gift
CREATE OR REPLACE FUNCTION public.ss_delete_gift(p_event_id uuid, p_passcode text, p_gift_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.ss_validate_passcode(p_event_id, p_passcode) THEN
    RAISE EXCEPTION 'Invalid passcode';
  END IF;

  DELETE FROM public.gifts WHERE id = p_gift_id AND event_id = p_event_id;
END;
$$;

-- 9) Reveal/end event
CREATE OR REPLACE FUNCTION public.ss_set_event_revealed(p_event_id uuid, p_passcode text, p_is_revealed boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.ss_validate_passcode(p_event_id, p_passcode) THEN
    RAISE EXCEPTION 'Invalid passcode';
  END IF;

  UPDATE public.events
  SET is_revealed = p_is_revealed
  WHERE id = p_event_id;
END;
$$;

-- 10) RLS updates: allow public reads, require RPC for writes.

-- Drop existing policies that rely on auth.uid()
DROP POLICY IF EXISTS "Participants can view their events" ON public.events;
DROP POLICY IF EXISTS "Creator can update their events" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can create events" ON public.events;

DROP POLICY IF EXISTS "Participants can view event participants" ON public.participants;
DROP POLICY IF EXISTS "Users can add themselves as participants" ON public.participants;
DROP POLICY IF EXISTS "Users can update their own participant record" ON public.participants;
DROP POLICY IF EXISTS "Users can delete their own participant record" ON public.participants;

DROP POLICY IF EXISTS "Participants can view gifts in their events" ON public.gifts;
DROP POLICY IF EXISTS "Gift sender can insert gifts" ON public.gifts;
DROP POLICY IF EXISTS "Gift sender can update their gifts" ON public.gifts;
DROP POLICY IF EXISTS "Gift sender can delete their gifts" ON public.gifts;

-- Public read policies (anon and authenticated)
CREATE POLICY "Public can read events" ON public.events
FOR SELECT USING (true);

CREATE POLICY "Public can read participants" ON public.participants
FOR SELECT USING (true);

CREATE POLICY "Public can read gifts" ON public.gifts
FOR SELECT USING (true);

-- No direct writes from client (must use RPC): block with false
CREATE POLICY "No direct event writes" ON public.events
FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct event updates" ON public.events
FOR UPDATE USING (false);
CREATE POLICY "No direct event deletes" ON public.events
FOR DELETE USING (false);

CREATE POLICY "No direct participant writes" ON public.participants
FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct participant updates" ON public.participants
FOR UPDATE USING (false);
CREATE POLICY "No direct participant deletes" ON public.participants
FOR DELETE USING (false);

CREATE POLICY "No direct gift writes" ON public.gifts
FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct gift updates" ON public.gifts
FOR UPDATE USING (false);
CREATE POLICY "No direct gift deletes" ON public.gifts
FOR DELETE USING (false);
