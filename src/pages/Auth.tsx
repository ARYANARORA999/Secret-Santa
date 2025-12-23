import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import SnowEffect from '@/components/SnowEffect';
import ChristmasDecorations from '@/components/ChristmasDecorations';
import { Phone, KeyRound, Sparkles } from 'lucide-react';
import { z } from 'zod';

const phoneSchema = z.string().regex(/^\+[1-9]\d{6,14}$/, 'Phone must be in format +1234567890');
const emailSchema = z.string().email('Please enter a valid email address');

const Auth = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [method, setMethod] = useState<'phone' | 'email'>('phone');

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        navigate('/');
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSendOtp = async () => {
    if (!displayName.trim()) {
      toast.error('Please enter your display name');
      return;
    }

    setLoading(true);
    try {
      if (method === 'phone') {
        try {
          phoneSchema.parse(phone);
        } catch (err) {
          toast.error('Please enter a valid phone number (e.g., +1234567890)');
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signInWithOtp({
          phone,
          options: {
            data: {
              display_name: displayName
            }
          }
        });

        if (error) throw error;

        setOtpSent(true);
        toast.success('OTP sent to your phone! 📱');
      } else {
        // email method: send magic link / email OTP
        try {
          emailSchema.parse(email);
        } catch (err) {
          toast.error('Please enter a valid email address');
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              display_name: displayName
            }
          }
        });

        if (error) throw error;

        setOtpSent(true);
        toast.success('Magic link sent — check your email ✉️');
      }
    } catch (error: any) {
      console.error('OTP Error:', error);
      toast.error(`${error?.status ? `(${error.status}) ` : ''}${error?.message || 'Failed to send code. Please try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (method !== 'phone') return; // only phone uses SMS verification code path

    if (otp.length < 6) {
      toast.error('Please enter the 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: 'sms'
      });

      if (error) throw error;

      toast.success('Welcome to Secret Santa! 🎅');
      navigate('/');
    } catch (error: any) {
      console.error('Verify Error:', error);
      toast.error(error.message || 'Invalid OTP. Please try again.');
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
              Join Secret Santa
            </h1>
            <p className="text-muted-foreground">
              Enter your phone to receive a magic code ✨
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex gap-2.justify-center mb-2">
              <button
                className={`px-4 py-2 rounded ${method === 'phone' ? 'bg-christmas-green text-white' : 'bg-transparent border'}`}
                onClick={() => setMethod('phone')}
                type="button"
              >
                Phone
              </button>
              <button
                className={`px-4 py-2 rounded ${method === 'email' ? 'bg-christmas-gold text-white' : 'bg-transparent border'}`}
                onClick={() => setMethod('email')}
                type="button"
              >
                Email
              </button>
            </div>

            {!otpSent ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-christmas-gold" />
                    Your Name
                  </Label>
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="Santa Claus"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="text-lg"
                  />
                </div>

                {method === 'phone' ? (
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-christmas-green" />
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1234567890"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="text-lg"
                    />
                    <p className="text-xs text-muted-foreground">
                      Include country code (e.g., +1 for US)
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-christmas-gold" />
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="text-lg"
                    />
                    <p className="text-xs text-muted-foreground">
                      We'll send a magic link to this email.
                    </p>
                  </div>
                )}

                <Button
                  onClick={handleSendOtp}
                  disabled={loading}
                  className="w-full btn-festive text-lg py-6"
                >
                  {loading ? 'Sending...' : method === 'phone' ? 'Send Magic Code 🪄' : 'Send Magic Link ✉️'}
                </Button>
              </>
            ) : (
              <>
                {method === 'phone' ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="otp" className="flex items-center gap-2">
                        <KeyRound className="w-4 h-4 text-christmas-gold" />
                        Enter OTP Code
                      </Label>
                      <Input
                        id="otp"
                        type="text"
                        placeholder="123456"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="text-center text-2xl tracking-widest"
                        maxLength={6}
                      />
                      <p className="text-xs text-muted-foreground text-center">
                        Check your phone for the 6-digit code
                      </p>
                    </div>

                    <Button
                      onClick={handleVerifyOtp}
                      disabled={loading}
                      className="w-full btn-gold text-lg py-6"
                    >
                      {loading ? 'Verifying...' : 'Join the Party! 🎉'}
                    </Button>

                    <Button
                      variant="ghost"
                      onClick={() => {
                        setOtpSent(false);
                        setOtp('');
                      }}
                      className="w-full"
                    >
                      Use different number
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="space-y-2 text-center">
                      <p className="text-lg">A magic link has been sent to your email. Click it to sign in.</p>
                      <p className="text-xs text-muted-foreground">If you don't see it, check your spam folder.</p>
                    </div>

                    <Button
                      variant="ghost"
                      onClick={() => {
                        setOtpSent(false);
                      }}
                      className="w-full"
                    >
                      Use different email
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
