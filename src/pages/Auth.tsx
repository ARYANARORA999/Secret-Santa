import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import SnowEffect from '@/components/SnowEffect';
import ChristmasDecorations from '@/components/ChristmasDecorations';
import { Sparkles } from 'lucide-react';

const SS_EVENT_CODE_KEY = 'ss.eventCode.v1';
const SS_PASSCODE_KEY = 'ss.eventPasscode.v1';
const SS_DISPLAY_NAME_KEY = 'ss.displayName.v1';

const Auth = () => {
  const navigate = useNavigate();
  const [eventCode, setEventCode] = useState('');
  const [passcode, setPasscode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  // Prefill event code from URL like /auth?event=ABCD12
  useEffect(() => {
    try {
      const u = new URL(window.location.href);
      const e = u.searchParams.get('event') || '';
      if (e) setEventCode(e);
    } catch {
      // ignore
    }
  }, []);

  // If already joined, go home
  useEffect(() => {
    const existing = sessionStorage.getItem(SS_DISPLAY_NAME_KEY);
    if (existing) navigate('/');
  }, [navigate]);

  const handleJoin = async () => {
    if (!eventCode.trim()) {
      toast.error('Missing event code. Please use the invite link.');
      return;
    }
    if (!passcode) {
      toast.error('Please enter the event passcode');
      return;
    }
    if (!displayName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    setLoading(true);
    try {
      // For now, store the join info in sessionStorage.
      // Next step: call Supabase RPC to validate passcode and mint player_key.
      sessionStorage.setItem(SS_EVENT_CODE_KEY, eventCode.trim());
      sessionStorage.setItem(SS_PASSCODE_KEY, passcode);
      sessionStorage.setItem(SS_DISPLAY_NAME_KEY, displayName.trim());
      toast.success('Joined!');
      navigate('/');
    } catch (err: any) {
      console.error('Join error', err);
      toast.error(err?.message || 'Failed to join');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <SnowEffect />
      <ChristmasDecorations />

      <div className="relative z-20 min-h-screen flex items-center justify-center p-4">
        <div className="card-gift max-w-md w-full p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center gap-2 mb-4">
              <span className="text-4xl animate-bounce-slow">🎅</span>
              <span className="text-4xl animate-bounce-slow" style={{ animationDelay: '0.3s' }}>🎄</span>
              <span className="text-4xl animate-bounce-slow" style={{ animationDelay: '0.6s' }}>🎁</span>
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">
              Secret Santa Login
            </h1>
            <p className="text-muted-foreground">Join the event using the invite link + passcode</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="eventCode" className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-christmas-gold" />
                Event code
              </Label>
              <Input
                id="eventCode"
                type="text"
                placeholder="From your invite link"
                value={eventCode}
                onChange={(e) => setEventCode(e.target.value)}
                className="text-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="passcode">Passcode</Label>
              <Input
                id="passcode"
                type="password"
                placeholder="Event passcode"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="text-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Your name</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="e.g. Aryan"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="text-lg"
              />
            </div>

            <Button onClick={handleJoin} disabled={loading} className="w-full btn-festive text-lg py-6">
              {loading ? 'Joining...' : 'Join Event'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
