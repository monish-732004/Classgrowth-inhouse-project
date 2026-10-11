import { Link, useNavigate } from 'react-router-dom';
import srmLogo from '@/assets/srm.jpg';
import { NotificationPermission } from './NotificationPermission';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { Clock, Search } from 'lucide-react';

export const Header = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getUser()
      .then(({ data: { user } }) => setIsLoggedIn(!!user))
      .catch(() => setIsLoggedIn(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setIsLoggedIn(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('theme');
      if (stored) return stored === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch { return false; }
  });

  useEffect(() => {
    try {
      document.documentElement.classList.toggle('dark', isDark);
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    } catch { /* ignore */ }
  }, [isDark]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center shrink-0">
          <img src={srmLogo} alt="SRM Logo" className="h-10 w-auto" />
          <span className="ml-2 text-lg font-semibold">ClassGrowth</span>
        </Link>

        {/* Nav links — only when logged in */}
        {isLoggedIn && (
          <nav className="hidden sm:flex items-center gap-1 text-sm font-medium">
            <Link to="/dashboard"   className="px-3 py-1.5 rounded hover:bg-muted transition-colors">Feed</Link>
            <Link to="/deadlines"   className="px-3 py-1.5 rounded hover:bg-muted transition-colors flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> Deadlines
            </Link>
            <Link to="/search"      className="px-3 py-1.5 rounded hover:bg-muted transition-colors flex items-center gap-1">
              <Search className="h-3.5 w-3.5" /> Search
            </Link>
          </nav>
        )}

        <div className="flex items-center gap-2 shrink-0">
          <NotificationPermission />
          {isLoggedIn
            ? <Link to="/dashboard" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">Dashboard</Link>
            : <Link to="/auth"      className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">Sign In</Link>
          }
          <button
            type="button"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={() => setIsDark(d => !d)}
            className="p-2 rounded-md hover:bg-muted/20 transition-colors text-lg leading-none"
          >
            {isDark ? '☀︎' : '🌙'}
          </button>
        </div>
      </div>
    </header>
  );
};
