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
import { useToast } from '@/hooks/use-toast';
import {
  LogOut, Settings, History, Sparkles, Clock, Search, UserCircle, Loader2,
} from 'lucide-react';
import { PostCard } from '@/components/PostCard';
import { useAllPosts, useForYouPosts, useDeadlinePosts } from '@/hooks/usePosts';
import { usePostActions } from '@/hooks/usePostActions';
import { postsApi, type Post, type ActionStatus } from '@/lib/api';

const CATEGORIES = ['Workshop', 'Placement Info', 'Test Link', 'Tech News', 'Industry Update'];

interface StudentDashboardProps { session: Session | null }

const StudentDashboard = ({ session }: StudentDashboardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [filterCat, setFilterCat]   = useState('');
  const [searchQ,   setSearchQ]     = useState('');
  const [searching, setSearching]   = useState(false);
  const [searchResults, setSearchResults] = useState<Post[] | null>(null);

  const { posts: allPosts,     loading: allLoading,     refetch: refetchAll }    = useAllPosts(filterCat || undefined);
  const { posts: forYouPosts,  loading: forYouLoading,  source }                 = useForYouPosts();
  const { posts: deadlinePosts,loading: deadlineLoading }                        = useDeadlinePosts();
  const { actions, upsert: upsertAction, remove: removeAction }                 = usePostActions();

  // Track view in Supabase
  const handleView = useCallback(async (postId: string) => {
    if (!session?.user?.id) return;
    await supabase.from('post_views').insert({ user_id: session.user.id, post_id: postId });
    // log session for active-hours computation
    await supabase.from('sessions').insert({ user_id: session.user.id });
  }, [session]);

  // Track click
  const handleLinkClick = useCallback(async (postId: string) => {
    if (!session?.user?.id) return;
    await supabase
      .from('post_views')
      .update({ clicked_at: new Date().toISOString() })
      .eq('user_id', session.user.id)
      .eq('post_id', postId);
  }, [session]);

  // Semantic / FTS search
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

  const sharedCardProps = {
    onView:         handleView,
    onLinkClick:    handleLinkClick,
    onUpsertAction: upsertAction,
    onRemoveAction: removeAction,
  };

  const renderPosts = (posts: Post[], loading: boolean, emptyMsg: string) => {
    if (loading) return <div className="animate-pulse text-muted-foreground py-8 text-center">Loading…</div>;
    if (!posts.length) return <p className="text-center text-muted-foreground py-8">{emptyMsg}</p>;
    return posts.map(p => (
      <PostCard key={p.id} post={p} currentAction={actions.get(p.id)?.status as ActionStatus} {...sharedCardProps} />
    ));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Your Dashboard</h1>
            <p className="text-muted-foreground">Stay updated and track your opportunities</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/profile-setup')} title="Edit profile">
              <UserCircle className="h-5 w-5" />
            </Button>
            <Button variant="outline" onClick={() => supabase.auth.signOut()}>
              <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </Button>
          </div>
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="for-you">
              <Sparkles className="h-3.5 w-3.5 mr-1" /> For You
            </TabsTrigger>
            <TabsTrigger value="deadlines">
              <Clock className="h-3.5 w-3.5 mr-1" /> Deadlines
            </TabsTrigger>
            <TabsTrigger value="search">
              <Search className="h-3.5 w-3.5 mr-1" /> Search
            </TabsTrigger>
            <TabsTrigger value="activity">
              <History className="h-3.5 w-3.5 mr-1" /> Activity
            </TabsTrigger>
            <TabsTrigger value="preferences">
              <Settings className="h-3.5 w-3.5 mr-1" /> Prefs
            </TabsTrigger>
          </TabsList>

          {/* ── ALL ── */}
          <TabsContent value="all" className="space-y-3">
            <div className="flex flex-wrap gap-2 mb-2">
              <Button
                size="sm" variant={!filterCat ? 'default' : 'outline'}
                onClick={() => setFilterCat('')}
              >All</Button>
              {CATEGORIES.map(c => (
                <Button key={c} size="sm" variant={filterCat === c ? 'default' : 'outline'}
                  onClick={() => setFilterCat(c)}>{c}</Button>
              ))}
            </div>
            {renderPosts(allPosts, allLoading, 'No posts yet')}
          </TabsContent>

          {/* ── FOR YOU ── */}
          <TabsContent value="for-you" className="space-y-3">
            {source === 'recency' && (
              <div className="text-xs text-muted-foreground bg-muted/50 rounded px-3 py-2">
                Complete your <button className="text-primary underline" onClick={() => navigate('/profile-setup')}>profile</button> to get a personalized feed. Showing recent posts for now.
              </div>
            )}
            {renderPosts(forYouPosts, forYouLoading, 'No posts yet')}
          </TabsContent>

          {/* ── DEADLINES ── */}
          <TabsContent value="deadlines" className="space-y-3">
            {renderPosts(deadlinePosts, deadlineLoading, 'No upcoming deadlines')}
          </TabsContent>

          {/* ── SEARCH ── */}
          <TabsContent value="search" className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Search posts (semantic + full-text)…"
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={searching}>
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
            {searchResults === null && (
              <p className="text-center text-muted-foreground py-8">Type a query and press Enter or Search</p>
            )}
            {searchResults !== null && renderPosts(searchResults, false, 'No results found')}
          </TabsContent>

          {/* ── ACTIVITY ── */}
          <TabsContent value="activity" className="space-y-3">
            <ActivityTab session={session} sharedCardProps={sharedCardProps} actions={actions} />
          </TabsContent>

          {/* ── PREFERENCES ── */}
          <TabsContent value="preferences">
            <PreferencesTab session={session} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// ── Activity sub-component ───────────────────────────────────

function ActivityTab({
  session, sharedCardProps, actions,
}: {
  session: Session | null;
  sharedCardProps: any;
  actions: Map<string, any>;
}) {
  const [actFilter, setActFilter] = useState<string>('all');
  const [actPosts,  setActPosts]  = useState<Post[]>([]);
  const [loading,   setLoading]   = useState(true);

  const ACTION_STATUSES = ['saved', 'applied', 'shortlisted', 'selected'];

  const { remove: removeAction, upsert: upsertAction } = usePostActions();

  const fetch = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    // Get post_ids the student has acted on
    let query = supabase
      .from('post_actions')
      .select('post_id, status')
      .eq('user_id', session.user.id);

    if (actFilter !== 'all') query = query.eq('status', actFilter);

    const { data: actionRows } = await query;
    const ids = (actionRows ?? []).map((r: any) => r.post_id);

    if (!ids.length) { setActPosts([]); setLoading(false); return; }

    const { data: posts } = await supabase.from('posts').select('*').in('id', ids);
    setActPosts((posts as Post[]) ?? []);
    setLoading(false);
  }, [session, actFilter]);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {['all', ...ACTION_STATUSES].map(s => (
          <Button key={s} size="sm" variant={actFilter === s ? 'default' : 'outline'}
            onClick={() => setActFilter(s)} className="capitalize">{s}</Button>
        ))}
      </div>
      {loading
        ? <div className="animate-pulse text-muted-foreground py-8 text-center">Loading…</div>
        : actPosts.length === 0
          ? <p className="text-center text-muted-foreground py-8">No activity yet</p>
          : actPosts.map(p => (
              <PostCard key={p.id} post={p}
                currentAction={actions.get(p.id)?.status}
                {...sharedCardProps}
                onUpsertAction={upsertAction}
                onRemoveAction={removeAction}
              />
            ))
      }
    </div>
  );
}

// ── Preferences sub-component ────────────────────────────────

function PreferencesTab({ session }: { session: Session | null }) {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (!session?.user?.id) return;
    const { data } = await supabase.from('user_preferences').select('category').eq('user_id', session.user.id);
    setPrefs((data ?? []).map((d: any) => d.category));
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const toggle = async (cat: string, checked: boolean) => {
    if (!session?.user?.id) return;
    if (checked) {
      await supabase.from('user_preferences').insert({ user_id: session.user.id, category: cat as any });
      setPrefs(p => [...p, cat]);
    } else {
      await supabase.from('user_preferences').delete().eq('user_id', session.user.id).eq('category', cat as any);
      setPrefs(p => p.filter(x => x !== cat));
    }
    toast({ title: checked ? `Added ${cat}` : `Removed ${cat}` });
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <p className="text-sm text-muted-foreground">Select categories you want to see in the All feed.</p>
        {CATEGORIES.map(cat => (
          <div key={cat} className="flex items-center gap-2">
            <Checkbox id={cat} checked={prefs.includes(cat)} onCheckedChange={c => toggle(cat, c as boolean)} />
            <Label htmlFor={cat} className="cursor-pointer">{cat}</Label>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default StudentDashboard;
