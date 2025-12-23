import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gift } from '@/types/gift';
import SnowEffect from '@/components/SnowEffect';
import ChristmasHeader from '@/components/ChristmasHeader';
import ChristmasDecorations from '@/components/ChristmasDecorations';
import UserSelector from '@/components/UserSelector';
import { supabase } from '@/integrations/supabase/client';
import AddGiftForm from '@/components/AddGiftForm';
import GiftGallery from '@/components/GiftGallery';
import EndEventButton from '@/components/EndEventButton';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2 } from 'lucide-react';

const STORAGE_KEY_PARTICIPANTS = 'secret-santa-participants';
const STORAGE_KEY_GIFTS = 'secret-santa-gifts';
const STORAGE_KEY_USER = 'secret-santa-current-user';
const STORAGE_KEY_REVEALED = 'secret-santa-revealed';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();

  // Attempt to derive the authenticated user's display name from Supabase user metadata
  const authDisplayName = user?.user_metadata?.display_name || user?.user_metadata?.full_name || '';

  const [participants, setParticipants] = useState<string[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY_PARTICIPANTS);
    return stored ? JSON.parse(stored) : [];
  });

  const [participantsMap, setParticipantsMap] = useState<Record<string, string>>({}); // id -> display_name

  const [currentUser, setCurrentUser] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_USER) || '';
  });

  const [eventId, setEventId] = useState<string | null>(null);
  const [promptedForName, setPromptedForName] = useState(false);

  // Ensure an event exists for this app. If none exists, the first authenticated
  // user will create it. We store the id in local state.
  const ensureEvent = async () => {
    try {
      const { data, error } = await supabase.from('events').select('*').limit(1).single();
      if (error && (error as any).code !== 'PGRST116') {
        // PGRST116 is "No rows found" for single(); ignore and create
      }

      if (data) {
        setEventId(data.id);
        return data.id;
      }

      if (user) {
        const insert = await supabase.from('events').insert({ name: 'Secret Santa', created_by: user.id }).select().single();
        if (!insert.error && insert.data) {
          setEventId(insert.data.id);
          return insert.data.id;
        }
      }
    } catch (err) {
      console.error('ensureEvent error', err);
    }
    return null;
  };

  const mapDbGiftToGift = (r: any) => {
    return {
      id: r.id,
      fromName: participantsMap[r.from_participant_id] || 'Someone',
      toName: participantsMap[r.to_participant_id] || 'Someone',
      status: r.status as any,
      images: (r.images || []).map((url: string) => ({ id: crypto.randomUUID(), url })),
      isUnlocked: !!r.is_unlocked,
      message: r.message || undefined,
      createdAt: new Date(r.created_at),
    };
  };

  const loadGiftsFromDb = async (evtId: string) => {
    try {
      const { data, error } = await supabase.from('gifts').select('*').eq('event_id', evtId).order('created_at', { ascending: true });
      if (error) throw error;
      if (data) {
        setGifts(data.map(mapDbGiftToGift));
      }
    } catch (err) {
      console.error('loadGiftsFromDb', err);
    }
  };

  const loadParticipantsFromDb = async (evtId: string) => {
    try {
      const { data, error } = await supabase.from('participants').select('id,display_name').eq('event_id', evtId).order('created_at', { ascending: true });
      if (error) throw error;
      if (data) {
        const names = data.map((r: any) => r.display_name);
        setParticipants(names);
        const map: Record<string, string> = {};
        data.forEach((r: any) => (map[r.id] = r.display_name));
        setParticipantsMap(map);
      }
    } catch (err) {
      console.error('loadParticipantsFromDb', err);
    }
  };

  const [gifts, setGifts] = useState<Gift[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY_GIFTS);
    return stored ? JSON.parse(stored) : [];
  });

  const [isEventRevealed, setIsEventRevealed] = useState<boolean>(() => {
    const stored = localStorage.getItem(STORAGE_KEY_REVEALED);
    return stored ? JSON.parse(stored) : false;
  });

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // When a user logs in, ensure their name is in the participants list and
  // auto-select them as the current user so they can only act as themselves.
  useEffect(() => {
    if (!loading && user) {
      const name = authDisplayName || '';
      if (name) {
        setParticipants((prev) => (prev.includes(name) ? prev : [...prev, name]));
        setCurrentUser((cur) => (cur || name));
      }
    }
  }, [user, loading, authDisplayName]);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PARTICIPANTS, JSON.stringify(participants));
  }, [participants]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_GIFTS, JSON.stringify(gifts));
  }, [gifts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_USER, currentUser);
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_REVEALED, JSON.stringify(isEventRevealed));
  }, [isEventRevealed]);

  // When a user logs in we will ensure an event exists and load participants + gifts from DB
  useEffect(() => {
    if (!loading && user) {
      (async () => {
        const id = await ensureEvent();
        if (id) {
          await loadParticipantsFromDb(id);
          await loadGiftsFromDb(id);
          setEventId(id);
        }
      })();
    }
  }, [user, loading]);

  // Prompt for a display name on first sign-in if missing
  useEffect(() => {
    if (user && !authDisplayName && !promptedForName) {
      const name = window.prompt('Welcome! Please enter your display name for Secret Santa:');
      if (name && name.trim()) {
        supabase.auth.updateUser({ data: { display_name: name.trim() } }).then(({ error }) => {
          if (error) {
            console.error('Failed to update display name', error);
            toast.error('Failed to save display name');
          } else {
            setPromptedForName(true);
            // After setting name, ensure event and reload participants so the name appears
            (async () => {
              const id = eventId || await ensureEvent();
              if (id) await loadParticipantsFromDb(id);
            })();
          }
        });
      } else {
        setPromptedForName(true);
      }
    }
  }, [user, authDisplayName, promptedForName, eventId]);

  // Poll for changes as a lightweight realtime fallback (every 3s)
  useEffect(() => {
    if (!eventId) return;
    const iv = setInterval(() => {
      loadParticipantsFromDb(eventId);
      loadGiftsFromDb(eventId);
    }, 3000);
    return () => clearInterval(iv);
  }, [eventId]);
  const handleAddParticipant = (name: string) => {
    // If logged in and event exists, insert into DB so others can see it
    if (user && eventId) {
      supabase.from('participants').insert({ event_id: eventId, user_id: user.id, display_name: name }).then(({ error }) => {
        if (error) {
          console.error('Add participant error', error);
          toast.error('Failed to add participant');
        } else {
          // reload participants
          loadParticipantsFromDb(eventId);
          toast.success(`${name} joined the party! 🎉`);
        }
      });
    } else {
      setParticipants((prev) => [...prev, name]);
      toast.success(`${name} joined the party! 🎉`);
    }
  };

  const handleRemoveParticipant = (name: string) => {
    if (user && eventId) {
      // Only allow removing your own participant record in DB (RLS will enforce)
      supabase.from('participants').delete().eq('event_id', eventId).eq('display_name', name).then(({ error }) => {
        if (error) {
          console.error('Remove participant error', error);
          toast.error('Failed to remove participant');
        } else {
          loadParticipantsFromDb(eventId);
          if (currentUser === name) setCurrentUser('');
          toast.success(`${name} left the party`);
        }
      });
    } else {
      setParticipants((prev) => prev.filter((p) => p !== name));
      if (currentUser === name) {
        setCurrentUser('');
      }
      toast.success(`${name} left the party`);
    }
  };

  const handleAddGift = (gift: Gift) => {
    // Persist to DB when we have an event and authenticated user
    if (user && eventId) {
      // find participant ids
      const fromId = Object.keys(participantsMap).find((k) => participantsMap[k] === gift.fromName);
      const toId = Object.keys(participantsMap).find((k) => participantsMap[k] === gift.toName);
      if (!fromId || !toId) {
        toast.error('Could not find participants in event. Refresh and try again.');
        return;
      }

      supabase
        .from('gifts')
        .insert({
          event_id: eventId,
          from_participant_id: fromId,
          to_participant_id: toId,
          status: gift.status,
          message: gift.message || null,
          images: gift.images.map((i) => i.url),
          is_unlocked: gift.isUnlocked,
        })
        .then(({ error }) => {
          if (error) {
            console.error('Insert gift error', error);
            toast.error('Failed to add gift');
          } else {
            // reload gifts (or rely on polling)
            if (eventId) loadGiftsFromDb(eventId);
            toast.success(`Gift for ${gift.toName} wrapped and ready! 🎁`);
          }
        });
    } else {
      setGifts((prev) => [...prev, gift]);
      toast.success(`Gift for ${gift.toName} wrapped and ready! 🎁`);
    }
  };

  const handleToggleLock = (id: string) => {
    // If using DB, toggle there
    if (user && eventId) {
      // find gift row and toggle
      const g = gifts.find((x) => x.id === id);
      if (!g) return;
      const newState = !g.isUnlocked;
      supabase.from('gifts').update({ is_unlocked: newState }).eq('id', id).then(({ error }) => {
        if (error) {
          console.error('Toggle lock error', error);
          toast.error('Failed to update gift');
        } else {
          loadGiftsFromDb(eventId);
          toast.success(newState ? `Gift revealed to ${g.toName}! 🎄` : `Gift hidden from ${g.toName}`);
        }
      });
    } else {
      setGifts((prev) =>
        prev.map((g) => {
          if (g.id === id) {
            const newState = !g.isUnlocked;
            toast.success(
              newState
                ? `Gift revealed to ${g.toName}! 🎄`
                : `Gift hidden from ${g.toName}`
            );
            return { ...g, isUnlocked: newState };
          }
          return g;
        })
      );
    }
  };

  const handleDeleteGift = (id: string) => {
    if (user && eventId) {
      supabase.from('gifts').delete().eq('id', id).then(({ error }) => {
        if (error) {
          console.error('Delete gift error', error);
          toast.error('Failed to remove gift');
        } else {
          loadGiftsFromDb(eventId);
          toast.success('Gift removed');
        }
      });
    } else {
      setGifts((prev) => prev.filter((g) => g.id !== id));
      toast.success('Gift removed');
    }
  };

  const handleEndEvent = () => {
    setIsEventRevealed(true);
    toast.success('🎉 The big reveal! Everyone can now see who their Secret Santa was!');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-christmas-red mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your Secret Santa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      <SnowEffect />
      <ChristmasDecorations />
      <Toaster position="top-center" />

      <div className="relative z-20 container mx-auto px-4 pb-20">
        {/* Sign out button */}
        <div className="absolute top-4 right-4 z-30">
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground hover:text-foreground">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>

        <ChristmasHeader />

        <div className="max-w-6xl mx-auto space-y-10">
          {/* End Event / Reveal section */}
          <section className="flex justify-center">
            <EndEventButton isRevealed={isEventRevealed} onEndEvent={handleEndEvent} />
          </section>

          {/* User selector section */}
          <section>
            <UserSelector
              participants={participants}
              currentUser={currentUser}
              authName={authDisplayName}
              onSetCurrentUser={setCurrentUser}
              onAddParticipant={handleAddParticipant}
              onRemoveParticipant={handleRemoveParticipant}
            />
          </section>

          {/* Add gift button */}
          {currentUser && !isEventRevealed && (
            <section className="flex justify-center">
              <AddGiftForm
                currentUser={currentUser}
                participants={participants}
                onAddGift={handleAddGift}
              />
            </section>
          )}

          {/* Gifts gallery */}
          {currentUser && gifts.length > 0 && (
            <section>
              <GiftGallery
                gifts={gifts}
                currentUser={currentUser}
                isEventRevealed={isEventRevealed}
                onToggleLock={handleToggleLock}
                onDeleteGift={handleDeleteGift}
              />
            </section>
          )}

          {/* Instructions when no user selected */}
          {!currentUser && participants.length > 0 && (
            <div className="card-gift text-center py-12 max-w-xl mx-auto">
              <div className="text-5xl mb-4">👆</div>
              <h3 className="text-xl font-display font-semibold mb-2">
                Select yourself above!
              </h3>
              <p className="text-muted-foreground">
                Click on your name to start adding gifts
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-20 text-center py-8 text-muted-foreground text-sm">
        <p>Made with ❤️ for Secret Santa friends everywhere</p>
        <p className="mt-1">🎄 Merry Christmas! 🎄</p>
      </footer>
    </div>
  );
};

export default Index;
