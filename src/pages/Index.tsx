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

const SS_EVENT_CODE_KEY = 'ss.eventCode.v1';
const SS_PASSCODE_KEY = 'ss.eventPasscode.v1';
const SS_DISPLAY_NAME_KEY = 'ss.displayName.v1';
const SS_PARTICIPANT_ID_KEY = 'ss.participantId.v1';
const SS_PLAYER_KEY_KEY = 'ss.playerKey.v1';

const STORAGE_KEY_PARTICIPANTS = 'secret-santa-participants';
const STORAGE_KEY_GIFTS = 'secret-santa-gifts';
const STORAGE_KEY_USER = 'secret-santa-current-user';
const STORAGE_KEY_REVEALED = 'secret-santa-revealed';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();

  // Multi-device join identity is stored in sessionStorage (no Supabase Auth).
  const joinedDisplayName = sessionStorage.getItem(SS_DISPLAY_NAME_KEY) || '';
  const eventCode = sessionStorage.getItem(SS_EVENT_CODE_KEY) || '';
  const passcode = sessionStorage.getItem(SS_PASSCODE_KEY) || '';
  const participantId = sessionStorage.getItem(SS_PARTICIPANT_ID_KEY) || '';
  const playerKey = sessionStorage.getItem(SS_PLAYER_KEY_KEY) || '';

  // Backwards compat: if `useAuth` has a supabase user, we can still derive a name.
  const authDisplayName = joinedDisplayName || user?.user_metadata?.display_name || user?.user_metadata?.full_name || '';

  // For now, consider we are in the new flow if we have a joinedDisplayName.
  const isJoinFlow = !!joinedDisplayName;

  // Legacy local-only auth mode flag (kept, but join flow takes priority)
  const isLocalAuthMode = !isJoinFlow && !!user && !(user as any)?.aud;

  const [participants, setParticipants] = useState<string[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY_PARTICIPANTS);
    return stored ? JSON.parse(stored) : [];
  });

  const [participantsMap, setParticipantsMap] = useState<Record<string, string>>({}); // id -> display_name

  const [currentUser, setCurrentUser] = useState<string>(() => {
    // In join-flow, the joined display name must drive currentUser.
    const joined = sessionStorage.getItem(SS_DISPLAY_NAME_KEY) || '';
    return joined || localStorage.getItem(STORAGE_KEY_USER) || '';
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
      // Keep raw ids so the UI can determine ownership even before
      // participantsMap is loaded (prevents lock/reveal buttons flickering).
      fromParticipantId: r.from_participant_id,
      toParticipantId: r.to_participant_id,

      fromName: participantsMap[r.from_participant_id] || 'Someone',
      toName: participantsMap[r.to_participant_id] || 'Someone',
      status: r.status as any,
      images: (r.images || []).map((url: string) => ({ id: crypto.randomUUID(), url })),
      isUnlocked: !!r.is_unlocked,
      message: r.message || undefined,
      createdAt: new Date(r.created_at),
    } as any;
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

  const loadEventFromDb = async (evtId: string) => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id,is_revealed')
        .eq('id', evtId)
        .single();
      if (error) throw error;
      if (data) {
        setIsEventRevealed(!!(data as any).is_revealed);
      }
    } catch (err) {
      console.error('loadEventFromDb', err);
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
    // Join-flow: require passcode + event code + display name
    if (!loading && !isLocalAuthMode && !user && !isJoinFlow) {
      navigate('/auth');
    }
  }, [user, loading, navigate, isLocalAuthMode, isJoinFlow]);

  // Join-flow: always keep currentUser in sync with the joined display name
  // so sender/recipient checks remain stable.
  useEffect(() => {
    if (!isJoinFlow) return;
    if (!joinedDisplayName) return;
    setCurrentUser((cur) => (cur && cur === joinedDisplayName ? cur : joinedDisplayName));
  }, [isJoinFlow, joinedDisplayName]);

  // Join-flow: call RPC to mint participant_id + player_key (stored in sessionStorage)
  useEffect(() => {
    if (!isJoinFlow) return;
    if (!eventCode || !passcode || !joinedDisplayName) {
      navigate('/auth');
      return;
    }
    if (participantId && playerKey) return;

    (async () => {
      try {
        // Single global event: eventCode must be GLOBAL
        const { data, error } = await (supabase as any).rpc('ss_join_global_event', {
          passcode,
          display_name: joinedDisplayName,
        });
        if (error) throw error;

        const row = Array.isArray(data ?? []) ? (data ?? [])[0] : data;
        if (!row?.participant_id || !row?.player_key) {
          throw new Error('Join failed');
        }
        sessionStorage.setItem(SS_PARTICIPANT_ID_KEY, row.participant_id);
        sessionStorage.setItem(SS_PLAYER_KEY_KEY, row.player_key);
        if (row?.event_id) setEventId(row.event_id);
      } catch (err) {
        console.error('ss_join_global_event error', err);
        const msg =
          (err as any)?.message ||
          (err as any)?.error_description ||
          (err as any)?.details ||
          'Failed to join event. Check passcode and try again.';
        toast.error(String(msg));
        navigate('/auth');
      }
    })();
  }, [isJoinFlow, eventCode, passcode, joinedDisplayName, participantId, playerKey, navigate]);

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
    if (!loading && user && !isLocalAuthMode) {
      (async () => {
        const id = await ensureEvent();
        if (id) {
          await loadParticipantsFromDb(id);
          await loadGiftsFromDb(id);
          setEventId(id);

          // Ensure this authenticated user has a participant row for the event
          try {
            const { data: existing } = await supabase
              .from('participants')
              .select('id,display_name')
              .eq('event_id', id)
              .eq('user_id', user.id)
              .limit(1)
              .single();

            if (!existing) {
              const display = authDisplayName || `Player-${user.id.slice(0,6)}`;
              await supabase.from('participants').insert({ event_id: id, user_id: user.id, display_name: display });
              await loadParticipantsFromDb(id);
            }
          } catch (err) {
            // ignore insert conflicts or permission errors — loadParticipants already called
          }
        }
      })();
    }
  }, [user, loading, isLocalAuthMode]);

  // Prompt for a display name on first sign-in if missing
  useEffect(() => {
    if (user && !isLocalAuthMode && !authDisplayName && !promptedForName) {
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
      loadEventFromDb(eventId);
    }, 3000);
    return () => clearInterval(iv);
  }, [eventId]);
  const handleAddParticipant = (_name: string) => {
    // Deployment requirement: you can't add other people manually.
    // Participants are added automatically when they log in.
    toast.error('Participants are added automatically when they log in.');
  };

  const handleRemoveParticipant = (name: string) => {
    // Client-side guard: only allow removing yourself.
    // (Server-side enforcement will be added in shared-mode RPC.)
    if (authDisplayName && name !== authDisplayName) {
      toast.error('You can only remove yourself.');
      return;
    }
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
    if (eventId && (user || isJoinFlow)) {
      // find participant ids
      const fromId = Object.keys(participantsMap).find((k) => participantsMap[k] === gift.fromName);
      const toId = Object.keys(participantsMap).find((k) => participantsMap[k] === gift.toName);
      if (!fromId || !toId) {
        toast.error('Could not find participants in event. Refresh and try again.');
        return;
      }

      // Shared join-flow: direct writes are blocked by RLS, so we must use RPC.
      if (isJoinFlow) {
        const pid = participantId;
        const pkey = playerKey;
        if (!pid || !pkey) {
          toast.error('Session expired. Please re-join the event.');
          navigate('/auth');
          return;
        }

        (async () => {
          const { error } = await (supabase as any).rpc('ss_add_gift', {
            p_event_id: eventId,
            p_from_participant_id: pid,
            p_player_key: pkey,
            p_to_participant_id: toId,
            p_status: gift.status,
            p_message: gift.message || null,
            p_images: gift.images.map((i) => i.url),
            p_is_unlocked: gift.isUnlocked,
          });
          if (error) {
            console.error('ss_add_gift error', error);
            const msg =
              (error as any)?.message ||
              (error as any)?.details ||
              (error as any)?.hint ||
              'Failed to add gift';
            toast.error(String(msg));
            return;
          }
          if (eventId) await loadGiftsFromDb(eventId);
          toast.success(`Gift for ${gift.toName} wrapped and ready! 🎁`);
        })();

        return;
      }

      // Legacy auth flow (if enabled): allow direct insert (RLS may permit depending on policies)
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
    if (eventId && (user || isJoinFlow)) {
      // find gift row and toggle
      const g = gifts.find((x) => x.id === id);
      if (!g) return;
      const newState = !g.isUnlocked;

      if (isJoinFlow) {
        const pid = participantId;
        const pkey = playerKey;
        if (!pid || !pkey) {
          toast.error('Session expired. Please re-join the event.');
          navigate('/auth');
          return;
        }

        (async () => {
          const { error } = await (supabase as any).rpc('ss_set_gift_unlocked', {
            p_event_id: eventId,
            p_participant_id: pid,
            p_player_key: pkey,
            p_gift_id: id,
            p_is_unlocked: newState,
          });
          if (error) {
            console.error('ss_set_gift_unlocked error', error);
            const msg =
              (error as any)?.message ||
              (error as any)?.details ||
              (error as any)?.hint ||
              'Failed to update gift';
            toast.error(String(msg));
            return;
          }
          await loadGiftsFromDb(eventId);
          toast.success(newState ? `Gift revealed to ${g.toName}! 🎄` : `Gift hidden from ${g.toName}`);
        })();

        return;
      }

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
    if (eventId && (user || isJoinFlow)) {
      if (isJoinFlow) {
        const pid = participantId;
        const pkey = playerKey;
        if (!pid || !pkey) {
          toast.error('Session expired. Please re-join the event.');
          navigate('/auth');
          return;
        }

        (async () => {
          const { error } = await (supabase as any).rpc('ss_delete_gift', {
            p_event_id: eventId,
            p_participant_id: pid,
            p_player_key: pkey,
            p_gift_id: id,
          });
          if (error) {
            console.error('ss_delete_gift error', error);
            const msg =
              (error as any)?.message ||
              (error as any)?.details ||
              (error as any)?.hint ||
              'Failed to remove gift';
            toast.error(String(msg));
            return;
          }
          await loadGiftsFromDb(eventId);
          toast.success('Gift removed');
        })();

        return;
      }

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
    if (eventId && isJoinFlow) {
      const pid = participantId;
      const pkey = playerKey;
      if (!pid || !pkey) {
        toast.error('Session expired. Please re-join the event.');
        navigate('/auth');
        return;
      }

      (async () => {
        const { data, error } = await (supabase as any).rpc('ss_end_event', {
          p_event_id: eventId,
          p_participant_id: pid,
          p_player_key: pkey,
        });
        if (error) {
          console.error('ss_end_event error', error);
          const msg =
            (error as any)?.message ||
            (error as any)?.details ||
            (error as any)?.hint ||
            'Failed to end event';
          toast.error(String(msg));
          return;
        }

        const ok = Array.isArray(data ?? []) ? (data ?? [])[0] : data;
        if (ok === true) {
          await loadEventFromDb(eventId);
          toast.success('🎉 The big reveal! Everyone can now see who their Secret Santa was!');
        } else {
          toast.error('Not everyone is ready yet. Ask everyone to mark ready first.');
        }
      })();

      return;
    }

    setIsEventRevealed(true);
    toast.success('🎉 The big reveal! Everyone can now see who their Secret Santa was!');
  };

  const handleSignOut = async () => {
    // Clear join-flow session
    sessionStorage.removeItem(SS_EVENT_CODE_KEY);
    sessionStorage.removeItem(SS_PASSCODE_KEY);
    sessionStorage.removeItem(SS_DISPLAY_NAME_KEY);
    sessionStorage.removeItem(SS_PARTICIPANT_ID_KEY);
    sessionStorage.removeItem(SS_PLAYER_KEY_KEY);

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
              canRemoveParticipant={(name) => !!authDisplayName && name === authDisplayName}
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
                currentParticipantId={participantId || undefined}
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
