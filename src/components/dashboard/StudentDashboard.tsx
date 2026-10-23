import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  Sparkles, Clock, Search, History, Settings, Loader2, UserCircle,
  CalendarClock, Bookmark, ArrowRight, TrendingUp,
} from 'lucide-react';
import { PostCard } from '@/components/PostCard';
import { useAllPosts, useForYouPosts, useDeadlinePosts } from '@/hooks/usePosts';
import { usePostActions } from '@/hooks/usePostActions';
import { postsApi, type Post, type ActionStatus } from '@/lib/api';
import { cn } from '@/lib/utils';

const CATEGORIES = ['Workshop', 'Placement Info', 'Test Link', 'Tech News', 'Industry Update'];

const CATEGORY_COLORS: Record<string, string> = {
  'Workshop':        'bg-blue-500',
  'Placement Info':  'bg-primary',
  'Test Link':       'bg-amber-500',
  'Tech News':       'bg-sky-500',
  'Industry Update': 'bg-purple-500',
};

interface StudentDashboardProps { session: Session | null }

function PostSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex gap-2">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  );
}

const StudentDashboard = ({ session }: StudentDashboardProps) => {
  const navigate    = useNavigate();
  const { toast }   = useToast();
  const [filterCat, setFilterCat]     = useState('');
  const [searchQ,   setSearchQ]       = useState('');
  const [searching, setSearching]     = useState(false);
  const [searchResults, setSearchResults] = useState<Post[] | null>(null);
  const [firstName, setFirstName]     = useState('');

  const { posts: allPosts,      loading: allLoading      } = useAllPosts(filterCat || undefined);
  const { posts: forYouPosts,   loading: forYouLoading, source } = useForYouPosts();
  const { posts: deadlinePosts, loading: deadlineLoading } = useDeadlinePosts();
  const { actions, upsert: upsertAction, remove: removeAction } = usePostActions();

  // Greeting name
  useEffect(() => {
    if (session?.user) {
      const meta = session.user.user_metadata;
      const name = meta?.full_name ?? meta?.name ?? session.user.email?.split('@')[0] ?? '';
      setFirstName(name.split(' ')[0]);
    }
  }, [session]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const handleView = useCallback(async (postId: string) => {
    if (!session?.user?.id) return;
    await supabase.from('post_views').insert({ user_id: session.user.id, post_id: postId });
    await supabase.from('sessions').insert({ user_id: session.user.id });
  }, [session]);

  const handleLinkClick = useCallback(async (postId: string) => {
    if (!session?.user?.id) return;
    await supabase
      .from('post_views')
      .update({ clicked_at: new Date().toISOString() })
      .eq('user_id', session.user.id)
      .eq('post_id', postId);
  }, [session]);

  const handleSearch = async () => {
    if (!searchQ.trim()) { setSearchResults(null); return; }
    setSearching(true);
    try {
      const { posts } = await postsApi.search(searchQ);
      setSearchResults(posts);
    } catch {
      toast({ title: 'Search failed', variant: 'destructive' });
    }
    setSearching(false);
  };

  const sharedCardProps = { onView: handleView, onLinkClick: handleLinkClick, onUpsertAction: upsertAction, onRemoveAction: removeAction };

  const renderPosts = (posts: Post[], loading: boolean, emptyMsg: string) => {
    if (loading) return <>{[1,2,3].map(i => <PostSkeleton key={i} />)}</>;
    if (!posts.length) return (
      <div className="text-center py-16 text-muted-foreground">
        <CalendarClock className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">{emptyMsg}</p>
      </div>
    );
    return posts.map(p => (
      <PostCard key={p.id} post={p} currentAction={actions.get(p.id)?.status as ActionStatus} {...sharedCardProps} />
    ));
  };

  const upcomingDeadlines = deadlinePosts.slice(0, 4);
  const savedPosts = [...actions.values()].filter(a => a.status === 'saved').length;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 pt-8 pb-16">

        {/* ── Welcome row ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold">
              {greeting}{firstName ? `, ${firstName}` : ''}.
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Here are the opportunities worth checking today.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/profile-setup')}>
              <UserCircle className="h-3.5 w-3.5 mr-1.5" /> Profile
            </Button>
            <Button size="sm" onClick={() => navigate('/search')}>
              <Search className="h-3.5 w-3.5 mr-1.5" /> Search
            </Button>
          </div>
        </div>

        {/* ── Profile prompt ── */}
        {source === 'recency' && (
          <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/10 text-sm text-amber-800 dark:text-amber-300">
            <TrendingUp className="h-4 w-4 shrink-0" />
            <span>
              Complete your <button onClick={() => navigate('/profile-setup')} className="underline font-medium">profile</button> to get a personalized feed instead of recent posts.
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
          {/* ── Main feed ── */}
          <div>
            <Tabs defaultValue="for-you" className="space-y-4">
              <TabsList className="h-9 rounded-lg bg-muted/60 p-0.5">
                <TabsTrigger value="for-you"   className="gap-1.5 text-xs h-8 rounded-md"><Sparkles className="h-3 w-3" />For You</TabsTrigger>
                <TabsTrigger value="all"        className="text-xs h-8 rounded-md">Latest</TabsTrigger>
                <TabsTrigger value="deadlines"  className="gap-1.5 text-xs h-8 rounded-md"><Clock className="h-3 w-3" />Closing Soon</TabsTrigger>
                <TabsTrigger value="activity"   className="gap-1.5 text-xs h-8 rounded-md hidden sm:flex"><History className="h-3 w-3" />Saved</TabsTrigger>
                <TabsTrigger value="preferences" className="gap-1.5 text-xs h-8 rounded-md hidden sm:flex"><Settings className="h-3 w-3" />Prefs</TabsTrigger>
              </TabsList>

              {/* For You */}
              <TabsContent value="for-you" className="space-y-3 mt-0">
                {renderPosts(forYouPosts, forYouLoading, 'No posts yet — check back soon.')}
              </TabsContent>

              {/* Latest */}
              <TabsContent value="all" className="space-y-3 mt-0">
                <div className="flex flex-wrap gap-1.5 pb-1">
                  <button
                    onClick={() => setFilterCat('')}
                    className={cn('px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                      !filterCat ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted/60'
                    )}
                  >All</button>
                  {CATEGORIES.map(c => (
                    <button
                      key={c}
                      onClick={() => setFilterCat(filterCat === c ? '' : c)}
                      className={cn('px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                        filterCat === c ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted/60'
                      )}
                    >{c}</button>
                  ))}
                </div>
                {renderPosts(allPosts, allLoading, 'No posts yet.')}
              </TabsContent>

              {/* Closing Soon */}
              <TabsContent value="deadlines" className="space-y-3 mt-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Posts with upcoming deadlines, sorted by urgency.</p>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/deadlines')} className="text-xs gap-1">
                    Full view <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
                {renderPosts(deadlinePosts, deadlineLoading, 'No upcoming deadlines.')}
              </TabsContent>

              {/* Saved / Activity */}
              <TabsContent value="activity" className="space-y-3 mt-0">
                <ActivityTab session={session} actions={actions} upsertAction={upsertAction} removeAction={removeAction} handleView={handleView} handleLinkClick={handleLinkClick} />
              </TabsContent>

              {/* Preferences */}
              <TabsContent value="preferences" className="mt-0">
                <PreferencesTab session={session} />
              </TabsContent>
            </Tabs>
          </div>

          {/* ── Sidebar ── */}
          <aside className="hidden lg:flex flex-col gap-4">
            {/* Quick stats */}
            <Card className="shadow-card">
              <CardContent className="pt-5 space-y-3">
                <h3 className="text-sm font-semibold">Quick stats</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Total posts',    value: allPosts.length,          icon: '📋' },
                    { label: 'Deadlines',      value: upcomingDeadlines.length, icon: '⏰' },
                    { label: 'Saved',          value: savedPosts,               icon: '🔖' },
                    { label: 'For You',        value: forYouPosts.length,       icon: '✨' },
                  ].map(s => (
                    <div key={s.label} className="p-3 rounded-lg bg-muted/50 text-center">
                      <p className="text-lg">{s.icon}</p>
                      <p className="text-lg font-bold leading-none mt-1">{s.value}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Upcoming deadlines sidebar */}
            {upcomingDeadlines.length > 0 && (
              <Card className="shadow-card">
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold">Upcoming deadlines</h3>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/deadlines')} className="text-xs -mr-2 gap-1">
                      View all <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {upcomingDeadlines.map(p => {
                      const hoursLeft = (new Date(p.deadline!).getTime() - Date.now()) / 3600000;
                      const urgent = hoursLeft < 24;
                      return (
                        <div key={p.id} className="flex items-start gap-2 py-2 border-b border-border last:border-0">
                          <div className={cn('h-2 w-2 rounded-full mt-1.5 shrink-0', CATEGORY_COLORS[p.category] ?? 'bg-muted-foreground')} />
                          <div className="min-w-0">
                            <p className="text-xs font-medium leading-snug line-clamp-1">{p.title}</p>
                            <p className={cn('text-[10px] mt-0.5', urgent ? 'text-destructive font-medium' : 'text-muted-foreground')}>
                              {urgent ? '< 24h left' : `${Math.round(hoursLeft / 24)}d left`}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Categories quick filter */}
            <Card className="shadow-card">
              <CardContent className="pt-5">
                <h3 className="text-sm font-semibold mb-3">Browse by category</h3>
                <div className="flex flex-col gap-1.5">
                  {CATEGORIES.map(c => (
                    <button
                      key={c}
                      onClick={() => navigate('/search')}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left hover:bg-muted/60 transition-colors"
                    >
                      <span className={cn('h-2 w-2 rounded-full', CATEGORY_COLORS[c])} />
                      {c}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
};

// ── Activity tab ─────────────────────────────────────────────

function ActivityTab({ session, actions, upsertAction, removeAction, handleView, handleLinkClick }: {
  session: Session | null;
  actions: Map<string, any>;
  upsertAction: (id: string, s: ActionStatus) => Promise<void>;
  removeAction: (id: string) => Promise<void>;
  handleView: (id: string) => Promise<void>;
  handleLinkClick: (id: string) => Promise<void>;
}) {
  const [actFilter, setActFilter] = useState('all');
  const [actPosts,  setActPosts]  = useState<Post[]>([]);
  const [loading,   setLoading]   = useState(true);
  const ACTION_STATUSES = ['saved', 'applied', 'shortlisted', 'selected'];

  const load = useCallback(async () => {
    if (!session?.user?.id) { setLoading(false); return; }
    setLoading(true);
    let q = supabase.from('post_actions').select('post_id').eq('user_id', session.user.id);
    if (actFilter !== 'all') q = (q as any).eq('status', actFilter);
    const { data: rows } = await q;
    const ids = (rows ?? []).map((r: any) => r.post_id);
    if (!ids.length) { setActPosts([]); setLoading(false); return; }
    const { data } = await supabase.from('posts').select('*').in('id', ids);
    setActPosts((data as Post[]) ?? []);
    setLoading(false);
  }, [session, actFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {['all', ...ACTION_STATUSES].map(s => (
          <button
            key={s}
            onClick={() => setActFilter(s)}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium border transition-colors capitalize',
              actFilter === s ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted/60',
            )}
          >{s}</button>
        ))}
      </div>
      {loading
        ? <>{[1,2].map(i => <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-full" /></div>)}</>
        : actPosts.length === 0
          ? <div className="text-center py-16 text-muted-foreground"><Bookmark className="h-10 w-10 mx-auto mb-3 opacity-30" /><p className="text-sm">No saved posts yet.</p></div>
          : actPosts.map(p => (
              <PostCard key={p.id} post={p}
                currentAction={actions.get(p.id)?.status as ActionStatus}
                onView={handleView}
                onLinkClick={handleLinkClick}
                onUpsertAction={upsertAction}
                onRemoveAction={removeAction}
              />
            ))
      }
    </div>
  );
}

// ── Preferences tab ──────────────────────────────────────────

function PreferencesTab({ session }: { session: Session | null }) {
  const { toast } = useToast();
  const [saved,   setSaved]   = useState<string[]>([]);   // what's in DB
  const [prefs,   setPrefs]   = useState<string[]>([]);   // local selection
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!session?.user?.id) return;
    const { data } = await supabase
      .from('user_preferences').select('category').eq('user_id', session.user.id);
    const cats = (data ?? []).map((d: any) => d.category);
    setSaved(cats); setPrefs(cats);
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const toggle = (cat: string, checked: boolean) =>
    setPrefs(p => checked ? [...p, cat] : p.filter(x => x !== cat));

  const handleUpdate = async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    const uid = session.user.id;

    // Delete all existing prefs then insert selected ones
    await supabase.from('user_preferences').delete().eq('user_id', uid);
    if (prefs.length > 0) {
      await supabase.from('user_preferences').insert(
        prefs.map(cat => ({ user_id: uid, category: cat as any }))
      );
    }
    setSaved(prefs);
    toast({
      title: 'Preferences updated',
      description: prefs.length === 0
        ? 'Showing all categories in your feed.'
        : `Feed will now show: ${prefs.join(', ')}.`,
    });
    setLoading(false);
  };

  const isDirty = JSON.stringify([...prefs].sort()) !== JSON.stringify([...saved].sort());

  return (
    <Card className="shadow-card">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="font-semibold mb-1">Category preferences</h3>
            <p className="text-sm text-muted-foreground">
              Select the categories you want to see in your feed.
              {prefs.length === 0 && <span className="text-primary"> All categories shown.</span>}
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleUpdate}
            disabled={!isDirty || loading}
            className="shrink-0 ml-4"
          >
            {loading
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Saving…</>
              : 'Update feed'}
          </Button>
        </div>

        <div className="space-y-2">
          {CATEGORIES.map(cat => (
            <label
              key={cat}
              htmlFor={`pref-${cat}`}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors',
                prefs.includes(cat)
                  ? 'border-primary bg-secondary'
                  : 'border-border hover:bg-muted/40',
              )}
            >
              <Checkbox
                id={`pref-${cat}`}
                checked={prefs.includes(cat)}
                onCheckedChange={c => toggle(cat, c as boolean)}
              />
              <span className={cn('h-2 w-2 rounded-full shrink-0', CATEGORY_COLORS[cat])} />
              <span className="text-sm font-medium">{cat}</span>
            </label>
          ))}
        </div>

        {isDirty && (
          <p className="text-xs text-muted-foreground mt-4 text-center">
            You have unsaved changes — click <strong>Update feed</strong> to apply.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default StudentDashboard;
