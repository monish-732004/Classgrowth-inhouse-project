import { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  LogOut, PlusCircle, Trash2, Link2, Loader2, AlertTriangle,
  BarChart3, Eye, MousePointerClick, Users,
} from 'lucide-react';
import { scrapeApi, postsApi, analyticsApi, notificationsApi, type ScrapeResult } from '@/lib/api';
import { useAllPostsFA } from '@/hooks/usePosts';
import type { Post } from '@/lib/api';

interface FADashboardProps { session: Session | null }

const CATEGORIES = ['Workshop', 'Placement Info', 'Test Link', 'Tech News', 'Industry Update'] as const;
type Category = typeof CATEGORIES[number];

const CATEGORY_COLORS: Record<string, string> = {
  'Workshop':        'bg-blue-500',
  'Placement Info':  'bg-green-500',
  'Test Link':       'bg-yellow-500',
  'Tech News':       'bg-purple-500',
  'Industry Update': 'bg-orange-500',
};

// ── Quality Gate modal ───────────────────────────────────────

interface QGWarning { level: 'error' | 'warn'; message: string }

function QualityGate({
  warnings, onProceed, onCancel, loading,
}: { warnings: QGWarning[]; onProceed: () => void; onCancel: () => void; loading: boolean }) {
  const errors = warnings.filter(w => w.level === 'error');
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" /> Content Quality Check
          </CardTitle>
          <CardDescription>Review before publishing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {warnings.map((w, i) => (
            <div key={i} className={`flex items-start gap-2 text-sm p-2 rounded ${
              w.level === 'error' ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300' :
                                   'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300'
            }`}>
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{w.message}</span>
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onCancel} className="flex-1">Go Back</Button>
            <Button
              onClick={onProceed}
              disabled={loading || errors.length > 0}
              className="flex-1"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {errors.length > 0 ? 'Fix Errors First' : 'Publish Anyway'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Analytics card ───────────────────────────────────────────

function PostAnalytics({ postId }: { postId: string }) {
  const [stats, setStats] = useState<{
    views: number; clicks: number; reach: number; ctr: number;
    actions: Record<string, number>;
  } | null>(null);

  useEffect(() => {
    analyticsApi.postStats(postId).then(setStats).catch(() => {});
  }, [postId]);

  if (!stats) return <div className="text-xs text-muted-foreground animate-pulse">Loading analytics…</div>;

  return (
    <div className="grid grid-cols-2 gap-2 mt-3">
      {[
        { icon: Eye,              label: 'Views',  value: stats.views },
        { icon: MousePointerClick,label: 'Clicks', value: stats.clicks },
        { icon: Users,            label: 'Reach',  value: `${(stats.reach * 100).toFixed(0)}%` },
        { icon: BarChart3,        label: 'CTR',    value: `${(stats.ctr * 100).toFixed(0)}%` },
      ].map(({ icon: Icon, label, value }) => (
        <div key={label} className="flex items-center gap-1.5 bg-muted/50 rounded p-2 text-xs">
          <Icon className="h-3 w-3 text-muted-foreground" />
          <span className="text-muted-foreground">{label}</span>
          <span className="ml-auto font-semibold">{value}</span>
        </div>
      ))}
      {Object.entries(stats.actions).map(([status, count]) => (
        <div key={status} className="flex items-center gap-1.5 bg-muted/50 rounded p-2 text-xs col-span-1">
          <span className="text-muted-foreground capitalize">{status}</span>
          <span className="ml-auto font-semibold">{count}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main dashboard ───────────────────────────────────────────

const FADashboard = ({ session }: FADashboardProps) => {
  const { toast } = useToast();
  const { posts, loading: postsLoading, refetch } = useAllPostsFA();

  // Form state
  const [url,      setUrl]      = useState('');
  const [title,    setTitle]    = useState('');
  const [summary,  setSummary]  = useState('');
  const [link,     setLink]     = useState('');
  const [category, setCategory] = useState<Category | ''>('');
  const [deadline, setDeadline] = useState('');

  // UX state
  const [scraping,    setScraping]    = useState(false);
  const [publishing,  setPublishing]  = useState(false);
  const [qgWarnings,  setQgWarnings]  = useState<QGWarning[] | null>(null);
  const [pendingPost, setPendingPost] = useState<null | object>(null);
  const [expandedId,  setExpandedId]  = useState<string | null>(null);

  const resetForm = () => {
    setUrl(''); setTitle(''); setSummary(''); setLink('');
    setCategory(''); setDeadline('');
  };

  // ── Smart Post Creator ──────────────────────────────────────
  const handleScrape = async () => {
    if (!url.trim()) return;
    setScraping(true);
    try {
      const result: ScrapeResult = await scrapeApi.scrapeUrl(url);
      if (result.title)             setTitle(result.title);
      if (result.summary)           setSummary(result.summary);
      if (result.suggestedCategory) setCategory(result.suggestedCategory as Category);
      if (result.deadline)          setDeadline(result.deadline.slice(0, 16)); // datetime-local format
      setLink(url);
      if (result.linkStatus === 'dead') {
        toast({ title: 'Link may be dead', description: 'HEAD check returned an error.', variant: 'destructive' });
      } else if (result.linkStatus === 'redirect_login') {
        toast({ title: 'Link requires login', description: 'The URL redirects to a login page.', variant: 'default' });
      }
    } catch {
      toast({ title: 'Scrape failed', description: 'Could not fetch the URL.', variant: 'destructive' });
    }
    setScraping(false);
  };

  // ── Quality Gate checks ─────────────────────────────────────
  function runQualityChecks(): QGWarning[] {
    const warnings: QGWarning[] = [];

    if (summary.trim().split(/\s+/).length < 20)
      warnings.push({ level: 'warn', message: 'Summary is under 20 words — consider expanding it.' });

    if (deadline) {
      const dl = new Date(deadline);
      if (dl < new Date())
        warnings.push({ level: 'error', message: 'Deadline is in the past. Fix or remove it.' });
    }

    return warnings;
  }

  // ── Submit ──────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !summary || !category) {
      toast({ title: 'Missing fields', description: 'Title, summary, and category are required.', variant: 'destructive' });
      return;
    }

    const warnings = runQualityChecks();
    const postData = {
      title, summary,
      link: link || null,
      category: category as Category,
      created_by: session?.user?.id ?? '',
      deadline: deadline ? new Date(deadline).toISOString() : null,
    };

    if (warnings.length > 0) {
      setPendingPost(postData);
      setQgWarnings(warnings);
      return;
    }

    await doPublish(postData);
  };

  const doPublish = async (postData: object) => {
    setPublishing(true);
    setQgWarnings(null);
    setPendingPost(null);
    try {
      const { data: created, error } = await supabase
        .from('posts')
        .insert(postData as any)
        .select()
        .single();

      if (error) throw error;

      // Trigger embedding + link check + reminder scheduling in background
      try {
        await postsApi.embedAfterPublish(created.id);
        if ((postData as any).deadline) {
          await notificationsApi.scheduleReminders(created.id, (postData as any).deadline, title);
        }
      } catch { /* non-fatal — embedding can retry */ }

      toast({ title: 'Published!', description: 'Post is live.' });
      resetForm();
      refetch();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setPublishing(false);
  };

  const handleDelete = async (postId: string) => {
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (error) {
      toast({ title: 'Error', description: 'Failed to delete post.', variant: 'destructive' });
    } else {
      toast({ title: 'Deleted' });
      refetch();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Quality Gate overlay */}
      {qgWarnings && (
        <QualityGate
          warnings={qgWarnings}
          onProceed={() => pendingPost && doPublish(pendingPost)}
          onCancel={() => { setQgWarnings(null); setPendingPost(null); }}
          loading={publishing}
        />
      )}

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">FA Dashboard</h1>
            <p className="text-muted-foreground">Manage posts, view analytics, track engagement</p>
          </div>
          <Button variant="outline" onClick={() => supabase.auth.signOut()}>
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </Button>
        </div>

        <Tabs defaultValue="create">
          <TabsList className="mb-6">
            <TabsTrigger value="create"><PlusCircle className="h-4 w-4 mr-1" />Create</TabsTrigger>
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="analytics"><BarChart3 className="h-4 w-4 mr-1" />Analytics</TabsTrigger>
          </TabsList>

          {/* ── CREATE TAB ── */}
          <TabsContent value="create">
            <Card className="shadow-card max-w-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PlusCircle className="h-5 w-5" /> New Post
                </CardTitle>
                <CardDescription>Paste a URL to auto-fill, or write from scratch</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Smart Post Creator */}
                <div className="flex gap-2 mb-5">
                  <Input
                    placeholder="Paste URL to auto-fill ↓"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    className="flex-1"
                  />
                  <Button variant="outline" onClick={handleScrape} disabled={scraping || !url.trim()}>
                    {scraping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                    <span className="ml-1 hidden sm:inline">Auto-fill</span>
                  </Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Category</Label>
                    <Select value={category} onValueChange={v => setCategory(v as Category)}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Title</Label>
                    <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Brief title" required />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Summary</Label>
                    <Textarea value={summary} onChange={e => setSummary(e.target.value)}
                      placeholder="2–3 sentence summary" rows={3} required />
                    <p className="text-xs text-muted-foreground text-right">
                      {summary.trim().split(/\s+/).filter(Boolean).length} words
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Link</Label>
                    <Input type="url" value={link} onChange={e => setLink(e.target.value)} placeholder="https://…" />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Deadline (optional)</Label>
                    <Input type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} />
                  </div>

                  <Button type="submit" className="w-full" disabled={publishing}>
                    {publishing ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Publishing…</> : 'Publish Post'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── POSTS TAB ── */}
          <TabsContent value="posts">
            {postsLoading ? (
              <div className="text-muted-foreground animate-pulse">Loading posts…</div>
            ) : (
              <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                {posts.map(post => (
                  <Card key={post.id} className="shadow-card">
                    <CardContent className="pt-5">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <Badge className={`${CATEGORY_COLORS[post.category] ?? 'bg-gray-500'} text-white`}>
                              {post.category}
                            </Badge>
                            {post.is_archived && (
                              <Badge variant="secondary">Archived</Badge>
                            )}
                            {post.link_status === 'dead' && (
                              <Badge variant="destructive" className="text-xs">Link dead</Badge>
                            )}
                            {post.deadline && (
                              <span className="text-xs text-muted-foreground">
                                Deadline: {new Date(post.deadline).toLocaleDateString('en-IN')}
                              </span>
                            )}
                          </div>
                          <h3 className="font-semibold truncate">{post.title}</h3>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{post.summary}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-8 w-8"
                            onClick={() => setExpandedId(expandedId === post.id ? null : post.id)}>
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8"
                            onClick={() => handleDelete(post.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      {expandedId === post.id && <PostAnalytics postId={post.id} />}
                    </CardContent>
                  </Card>
                ))}
                {posts.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No posts yet</p>
                )}
              </div>
            )}
          </TabsContent>

          {/* ── ANALYTICS TAB ── */}
          <TabsContent value="analytics">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Section Overview</CardTitle>
                <CardDescription>Click the chart icon on any post in the Posts tab to see its analytics.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="bg-muted/50 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold">{posts.length}</p>
                    <p className="text-sm text-muted-foreground mt-1">Total Posts</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold">{posts.filter(p => !p.is_archived).length}</p>
                    <p className="text-sm text-muted-foreground mt-1">Active Posts</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold">
                      {posts.filter(p => p.deadline && new Date(p.deadline) > new Date()).length}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Open Deadlines</p>
                  </div>
                </div>

                <div className="mt-6 space-y-2">
                  <p className="text-sm font-medium">Posts by category</p>
                  {CATEGORIES.map(cat => {
                    const count = posts.filter(p => p.category === cat).length;
                    const pct = posts.length ? (count / posts.length) * 100 : 0;
                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>{cat}</span><span className="text-muted-foreground">{count}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full ${CATEGORY_COLORS[cat]} rounded-full`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default FADashboard;
