import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { profileApi, type StudentProfile } from '@/lib/api';

export interface FullProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  section_id: string | null;
  fcm_token: string | null;
  student?: StudentProfile | null;
}

export function useProfile() {
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setProfile(null); setLoading(false); return; }

    const { data: base } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, section_id, fcm_token')
      .eq('id', user.id)
      .single();

    if (!base) { setLoading(false); return; }

    let student: StudentProfile | null = null;
    if (base.role === 'student' || base.role === 'cr') {
      try { student = await profileApi.get(); } catch { /* no profile yet */ }
    }

    setProfile({ ...base, student });
    setLoading(false);
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  return { profile, loading, refetch: fetchProfile };
}

export function useIsFA(role: string | undefined) {
  return role === 'fa' || role === 'co_fa' || role === 'admin';
}
