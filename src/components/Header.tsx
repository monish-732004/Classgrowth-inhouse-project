import { Link, useNavigate, useLocation } from 'react-router-dom';
import logoImg from '@/assets/logo (2).png';
import { NotificationPermission } from './NotificationPermission';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import {
  Clock, Search, Sun, Moon, Menu, X, LayoutDashboard, User, LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const Logo = () => (
  <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
    <img src={logoImg} alt="ClassGrowth" className="h-8 w-8 object-contain rounded-lg" />
    <span className="font-semibold text-base tracking-tight">ClassGrowth</span>
  </Link>
);

const NAV_LINKS = [
  { to: '/dashboard', label: 'Feed',      icon: LayoutDashboard },
  { to: '/deadlines', label: 'Deadlines', icon: Clock           },
  { to: '/search',    label: 'Search',    icon: Search          },
];

export const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const s = localStorage.getItem('theme');
      return s ? s === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch { return false; }
  });

  useEffect(() => {
    supabase.auth.getUser()
      .then(({ data: { user } }) => setIsLoggedIn(!!user))
      .catch(() => setIsLoggedIn(false));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setIsLoggedIn(!!s?.user));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    try {
      document.documentElement.classList.toggle('dark', isDark);
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    } catch { /* ignore */ }
  }, [isDark]);

  // close mobile menu on route change
  useEffect(() => setMobileOpen(false), [location.pathname]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border/60 shadow-sm">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Logo />

          {/* Desktop nav — authenticated only */}
          {isLoggedIn && (
            <nav className="hidden md:flex items-center gap-0.5">
              {NAV_LINKS.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                    isActive(to)
                      ? 'bg-secondary text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </Link>
              ))}
            </nav>
          )}

          {/* Public nav */}
          {!isLoggedIn && (
            <nav className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
              <a href="#features"    className="hover:text-foreground transition-colors">Features</a>
              <a href="#how-it-works" className="hover:text-foreground transition-colors">How it works</a>
            </nav>
          )}

          {/* Right actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isLoggedIn && <NotificationPermission />}

            {/* Theme toggle */}
            <button
              type="button"
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={() => setIsDark(d => !d)}
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {isLoggedIn ? (
              <>
                <Link to="/profile-setup">
                  <button
                    type="button"
                    className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                    aria-label="Profile"
                  >
                    <User className="h-4 w-4" />
                  </button>
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" /> Sign out
                </button>
              </>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link to="/auth">
                  <Button variant="ghost" size="sm">Sign in</Button>
                </Link>
                <Link to="/auth">
                  <Button size="sm">Get started</Button>
                </Link>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              type="button"
              aria-label="Toggle menu"
              className="md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              onClick={() => setMobileOpen(o => !o)}
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 pt-14 bg-background/95 backdrop-blur-md animate-fade-in md:hidden">
          <nav className="container mx-auto px-4 py-6 flex flex-col gap-1">
            {isLoggedIn ? (
              <>
                {NAV_LINKS.map(({ to, label, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors',
                      isActive(to)
                        ? 'bg-secondary text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                ))}
                <Link
                  to="/profile-setup"
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                >
                  <User className="h-4 w-4" /> Profile
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors w-full text-left"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </>
            ) : (
              <>
                <a href="#features"     className="px-4 py-3 rounded-lg text-base text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors">Features</a>
                <a href="#how-it-works" className="px-4 py-3 rounded-lg text-base text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors">How it works</a>
                <div className="mt-4 flex flex-col gap-2 px-4">
                  <Link to="/auth"><Button variant="outline" className="w-full">Sign in</Button></Link>
                  <Link to="/auth"><Button className="w-full">Get started</Button></Link>
                </div>
              </>
            )}
          </nav>
        </div>
      )}
    </>
  );
};
