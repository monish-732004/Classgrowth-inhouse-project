import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logoImg from '@/assets/logo (2).png';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, ArrowRight, BookOpen, CalendarClock, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const VALUE_PROPS = [
  { icon: Sparkles,     text: 'Personalized feed ranked to your interests' },
  { icon: CalendarClock,text: 'Never miss a deadline again'               },
  { icon: BookOpen,     text: 'All FA announcements in one clean place'   },
];

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tab,          setTab]         = useState<'signin' | 'signup'>('signin');
  const [loading,      setLoading]     = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPwd,      setShowPwd]     = useState(false);
  const [email,        setEmail]       = useState('');
  const [password,     setPassword]    = useState('');
  const [fullName,     setFullName]    = useState('');

  const ADMINEMAIL    = import.meta.env.VITE_ADMIN_MAIL;
  const ADMINPASSWORD = import.meta.env.VITE_ADMIN_PASSWORD;
  const ADMINFULLNAME = import.meta.env.VITE_ADMIN_FULLNAME;

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const userRole = email === ADMINEMAIL ? 'admin' : 'student';
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: fullName, role: userRole },
      },
    });
    if (error) {
      toast({ title: 'Sign up failed', description: error.message, variant: 'destructive' });
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        toast({ title: 'Account created!', description: 'Please check your email to confirm, then sign in.' });
        setTab('signin');
      } else {
        toast({ title: 'Welcome to ClassGrowth!' });
        navigate('/dashboard');
      }
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) {
      toast({ title: 'Google sign-in failed', description: error.message, variant: 'destructive' });
      setGoogleLoading(false);
    }
    // On success the browser redirects — no need to setGoogleLoading(false)
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (email === ADMINEMAIL) {
      const { error } = await supabase.auth.signInWithPassword({ email: ADMINEMAIL, password });
      if (error && password === ADMINPASSWORD) {
        // First-time admin setup
        await supabase.auth.signUp({
          email: ADMINEMAIL, password: ADMINPASSWORD,
          options: { data: { full_name: ADMINFULLNAME, role: 'admin', is_faculty_advisor: true } },
        });
        const { error: e2 } = await supabase.auth.signInWithPassword({ email: ADMINEMAIL, password: ADMINPASSWORD });
        if (e2) {
          toast({ title: 'Auth error', description: e2.message, variant: 'destructive' });
          setLoading(false); return;
        }
      } else if (error) {
        toast({ title: 'Access denied', description: 'Invalid admin credentials.', variant: 'destructive' });
        setLoading(false); return;
      }
      navigate('/dashboard');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: 'Sign in failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Welcome back!' });
      navigate('/dashboard');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel (brand) ── */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between bg-primary p-12 text-primary-foreground">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <img src={logoImg} alt="ClassGrowth" className="h-9 w-9 object-contain rounded-lg bg-white/20 p-0.5" />
          <span className="font-semibold text-lg">ClassGrowth</span>
        </div>

        {/* Centre copy */}
        <div>
          <h1 className="text-4xl font-bold leading-tight mb-4 text-balance">
            Your campus, organised.
          </h1>
          <p className="text-primary-foreground/75 text-base leading-relaxed mb-10">
            Stop missing workshops, placements, and tests buried in WhatsApp groups. ClassGrowth surfaces what matters, when it matters.
          </p>

          <ul className="space-y-4">
            {VALUE_PROPS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-primary-foreground/90">
                <div className="h-8 w-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4" />
                </div>
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom attribution */}
        <p className="text-primary-foreground/40 text-xs">
          &copy; 2025 ClassGrowth · Built for students
        </p>
      </div>

      {/* ── Right panel (form) ── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <img src={logoImg} alt="ClassGrowth" className="h-8 w-8 object-contain rounded-lg" />
            <span className="font-semibold text-base">ClassGrowth</span>
          </div>

          <h2 className="text-2xl font-bold mb-1">
            {tab === 'signin' ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            {tab === 'signin'
              ? 'Sign in to your account to continue.'
              : 'Create an account to get started.'}
          </p>

          {/* Tabs */}
          <div className="flex rounded-lg border border-border bg-muted/40 p-0.5 mb-6">
            {(['signin', 'signup'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  'flex-1 py-1.5 text-sm font-medium rounded-md transition-all',
                  tab === t
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t === 'signin' ? 'Sign in' : 'Sign up'}
              </button>
            ))}
          </div>

          {/* Google OAuth */}
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2.5"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
          >
            {googleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            Continue with Google
          </Button>

          {/* Divider */}
          <div className="relative my-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-3 text-xs text-muted-foreground">or continue with email</span>
            </div>
          </div>

          {tab === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="si-email">Email</Label>
                <Input
                  id="si-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="si-password">Password</Label>
                <div className="relative">
                  <Input
                    id="si-password"
                    type={showPwd ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPwd ? 'Hide password' : 'Show password'}
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in…' : <>Sign in <ArrowRight className="ml-1.5 h-4 w-4" /></>}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="su-name">Full name</Label>
                <Input
                  id="su-name"
                  type="text"
                  placeholder="Your full name"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="su-email">Email</Label>
                <Input
                  id="su-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="su-password">Password</Label>
                <div className="relative">
                  <Input
                    id="su-password"
                    type={showPwd ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPwd ? 'Hide password' : 'Show password'}
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating account…' : <>Create account <ArrowRight className="ml-1.5 h-4 w-4" /></>}
              </Button>
            </form>
          )}

          <p className="text-center text-xs text-muted-foreground mt-6">
            {tab === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => setTab(tab === 'signin' ? 'signup' : 'signin')}
              className="text-primary hover:underline font-medium"
            >
              {tab === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
