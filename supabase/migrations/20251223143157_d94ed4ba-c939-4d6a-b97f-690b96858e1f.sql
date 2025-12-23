-- Create events table for Secret Santa events
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Secret Santa 2024',
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_revealed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create participants table
CREATE TABLE public.participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  display_name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Create gifts table
CREATE TABLE public.gifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  from_participant_id UUID REFERENCES public.participants(id) ON DELETE CASCADE NOT NULL,
  to_participant_id UUID REFERENCES public.participants(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'delivered')),
  message TEXT,
  images TEXT[] DEFAULT '{}',
  is_unlocked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for events
CREATE POLICY "Participants can view their events"
ON public.events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.participants 
    WHERE participants.event_id = events.id 
    AND participants.user_id = auth.uid()
  )
);

CREATE POLICY "Creator can update their events"
ON public.events FOR UPDATE
USING (created_by = auth.uid());

CREATE POLICY "Authenticated users can create events"
ON public.events FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- RLS Policies for participants
CREATE POLICY "Participants can view event participants"
ON public.participants FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.participants p 
    WHERE p.event_id = participants.event_id 
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can add themselves as participants"
ON public.participants FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participant record"
ON public.participants FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own participant record"
ON public.participants FOR DELETE
USING (user_id = auth.uid());

-- RLS Policies for gifts
CREATE POLICY "Participants can view gifts in their events"
ON public.gifts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.participants p 
    WHERE (p.id = gifts.from_participant_id OR p.id = gifts.to_participant_id)
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Gift sender can insert gifts"
ON public.gifts FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.participants p 
    WHERE p.id = from_participant_id 
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Gift sender can update their gifts"
ON public.gifts FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.participants p 
    WHERE p.id = gifts.from_participant_id 
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Gift sender can delete their gifts"
ON public.gifts FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.participants p 
    WHERE p.id = gifts.from_participant_id 
    AND p.user_id = auth.uid()
  )
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_events_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gifts_updated_at
BEFORE UPDATE ON public.gifts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for gifts table
ALTER PUBLICATION supabase_realtime ADD TABLE public.gifts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;