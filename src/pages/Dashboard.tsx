import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import FADashboard from '@/components/dashboard/FADashboard';
import StudentDashboard from '@/components/dashboard/StudentDashboard';
import { useToast } from '@/hooks/use-toast';

// FA roles — includes legacy 'admin' for backward compatibility
const FA_ROLES = new Set(['fa', 'co_fa', 'admin']);

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) navigate('/auth');
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) navigate('/auth');
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!session?.user) return;
    supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          toast({ title: 'Error', description: 'Failed to load user profile', variant: 'destructive' });
        } else {
          setUserRole(data?.role ?? null);
        }
        setLoading(false);
      });
  }, [session, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-lg text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (FA_ROLES.has(userRole ?? '')) return <FADashboard session={session} />;
  return <StudentDashboard session={session} />;
};

export default Dashboard;
