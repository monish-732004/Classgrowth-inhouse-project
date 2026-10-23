import { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  PlusCircle, Trash2, Link2, Loader2, AlertTriangle,
  BarChart3, Eye, MousePointerClick, Users, FileText,
  CheckCircle2, Clock, TrendingUp, ChevronDown, ChevronUp,
  ImagePlus, X,
} from 'lucide-react';
import { scrapeApi, postsApi, analyticsApi, notificationsApi, type ScrapeResult } from '@/lib/api';
import { useAllPostsFA } from '@/hooks/usePosts';
import type { Post } from '@/lib/api';
import { cn } from '@/lib/utils';

interface FADashboardProps { session: Session | null }

const CATEGORIES = ['Workshop', 'Placement Info', 'Test Link', 'Tech News', 'Industry Update'] as const;
type Category = typeof CATEGORIES[number];

const CATEGORY_STYLES: Record<string, { dot: string; badge: string }> = {
  'Workshop':        { dot: 'bg-blue-500',   badge: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' },
  'Placement Info':  { dot: 'bg-primary',    badge: 'bg-secondary text-primary' },
  'Test Link':       { dot: 'bg-amber-500',  badge: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300' },
  'Tech News':       { dot: 'bg-purple-500', badge: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300' },
  'Industry Update': { dot: 'bg-orange-500', badge: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300' },
};

// ── Tab type ─────────────────────────────────────────────────
type Tab = 'create' | 'posts' | 'analytics';

// ── Quality Gate ─────────────────────────────────────────────
interface QGWarning { level: 'error' | 'warn'; message: string }

function QualityGate({ warnings, onProceed, onCancel, loading }: {
  warnings: QGWarning[]; onProceed: () => void; onCancel: () => void; loading: boolean;
}) {
  const errors = warnings.filter(w => w.level === 'error');
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-md shadow-xl animate-fade-up">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" /> Quality check
          </CardTitle>
          <CardDescription>Review these issues before publishing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {warnings.map((w, i) => (
            <div key={i} className={cn(
              'flex items-start gap-2.5 text-sm px-3 py-2.5 rounded-lg',
              w.level === 'error'
                ? 'bg-destructive/10 text-destructive'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
            )}>
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{w.message}</span>
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={onCancel} className="flex-1">Go back</Button>
            <Button onClick={onProceed} disabled={loading || errors.length > 0} className="flex-1">
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              {errors.length > 0 ? 'Fix errors first' : 'Publish anyway'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Inline post analytics ─────────────────────────────────────
function PostAnalytics({ postId }: { postId: string }) {
  const [stats, setStats] = useState<{
    views: number; clicks: number; reach: number; ctr: number;
    actions: Record<string, number>;
  } | null>(null);
  const [reactions, setReactions] = useState<Record<string, number>>({});

  useEffect(() => {
    analyticsApi.postStats(postId).then(setStats).catch(() => {});
    supabase
      .from('post_reactions')
      .select('reaction')
      .eq('post_id', postId)
      .then(({ data }) => {
        if (!data) return;
        const c: Record<string, number> = {};
        data.forEach(r => { c[r.reaction] = (c[r.reaction] ?? 0) + 1; });
        setReactions(c);
      });
  }, [postId]);

  if (!stats) return (
    <div className="grid grid-cols-2 gap-2 mt-3">
      {[1,2,3,4].map(i => <Skeleton key={i} className="h-9 rounded-lg" />)}
    </div>
  );

  const EMOJI: Record<string, string> = { useful: '👍', insightful: '💡', applying: '🚀' };

  return (
    <div className="mt-3 pt-3 border-t border-border space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { icon: Eye,               label: 'Views',  value: stats.views },
          { icon: MousePointerClick, label: 'Clicks', value: stats.clicks },
          { icon: Users,             label: 'Reach',  value: `${(stats.reach * 100).toFixed(0)}%` },
          { icon: BarChart3,         label: 'CTR',    value: `${(stats.ctr * 100).toFixed(0)}%` },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex flex-col items-center bg-muted/50 rounded-lg py-2.5 px-2 text-xs">
            <Icon className="h-3.5 w-3.5 text-muted-foreground mb-1" />
            <span className="font-bold text-base leading-none">{value}</span>
            <span className="text-muted-foreground mt-0.5">{label}</span>
          </div>
        ))}
      </div>
      {Object.keys(reactions).length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground self-center">Reactions:</span>
          {Object.entries(reactions).map(([type, count]) => (
            <span key={type} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-muted border border-border">
              {EMOJI[type] ?? '❓'} {type} · <strong>{count}</strong>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────
const FADashboard = ({ session }: FADashboardProps) => {
  const { toast } = useToast();
  const { posts, loading: postsLoading, refetch } = useAllPostsFA();
  const [tab, setTab] = useState<Tab>('create');

  // Form
  const [url,        setUrl]        = useState('');
  const [title,      setTitle]      = useState('');
  const [summary,    setSummary]    = useState('');
  const [link,       setLink]       = useState('');
  const [category,   setCategory]   = useState<Category | ''>('');
  const [deadline,   setDeadline]   = useState('');
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const [uploading,  setUploading]  = useState(false);

  // UX
  const [scraping,    setScraping]    = useState(false);
  const [publishing,  setPublishing]  = useState(false);
  const [qgWarnings,  setQgWarnings]  = useState<QGWarning[] | null>(null);
  const [pendingPost, setPendingPost] = useState<null | object>(null);
  const [expandedId,  setExpandedId]  = useState<string | null>(null);

  const resetForm = () => {
    setUrl(''); setTitle(''); setSummary(''); setLink(''); setCategory(''); setDeadline('');
    setPosterFile(null); setPosterPreview(null);
  };

  const handlePosterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max poster size is 5 MB.', variant: 'destructive' });
      return;
    }
    setPosterFile(file);
    setPosterPreview(URL.createObjectURL(file));
  };

  const uploadPoster = async (postId: string): Promise<string | null> => {
    if (!posterFile) return null;
    const ext  = posterFile.name.split('.').pop();
    const path = `${postId}.${ext}`;
    const { error } = await supabase.storage.from('posters').upload(path, posterFile, { upsert: true });
    if (error) { console.error('Poster upload error:', error); return null; }
    const { data } = supabase.storage.from('posters').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleScrape = async () => {
    if (!url.trim()) return;
    setScraping(true);
    try {
      const result: ScrapeResult = await scrapeApi.scrapeUrl(url);
      if (result.title)             setTitle(result.title);
      if (result.summary)           setSummary(result.summary);
      if (result.suggestedCategory) setCategory(result.suggestedCategory as Category);
      if (result.deadline)          setDeadline(result.deadline.slice(0, 16));
      setLink(url);
      if (result.linkStatus === 'dead') {
        toast({ title: 'Link may be dead', variant: 'destructive' });
      } else if (result.linkStatus === 'redirect_login') {
        toast({ title: 'Link requires login', description: 'URL redirects to a login page.' });
      }
    } catch {
      toast({ title: 'Scrape failed', variant: 'destructive' });
    }
    setScraping(false);
  };

  function runQualityChecks(): QGWarning[] {
    const w: QGWarning[] = [];
    if (summary.trim().split(/\s+/).length < 20)
      w.push({ level: 'warn', message: 'Summary is under 20 words — consider expanding it.' });
    if (deadline && new Date(deadline) < new Date())
      w.push({ level: 'error', message: 'Deadline is in the past. Fix or remove it.' });
    return w;
  }

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
    if (warnings.length > 0) { setPendingPost(postData); setQgWarnings(warnings); return; }
    await doPublish(postData);
  };

  const doPublish = async (postData: object) => {
    setPublishing(true); setUploading(!!posterFile); setQgWarnings(null); setPendingPost(null);
    try {
      const { data: created, error } = await supabase
        .from('posts').insert(postData as any).select().single();
      if (error) throw error;

      // Upload poster and link it to the post
      if (posterFile) {
        const imageUrl = await uploadPoster(created.id);
        if (imageUrl) {
          await supabase.from('posts').update({ image_url: imageUrl }).eq('id', created.id);
        }
        setUploading(false);
      }

      try {
        await postsApi.embedAfterPublish(created.id);
        if ((postData as any).deadline)
          await notificationsApi.scheduleReminders(created.id, (postData as any).deadline, title);
      } catch { /* non-fatal */ }
      toast({ title: 'Published!', description: 'Post is now live for students.' });
      resetForm(); refetch(); setTab('posts');
    } catch (err: any) {
      toast({ title: 'Publish failed', description: err.message, variant: 'destructive' });
      setUploading(false);
    }
    setPublishing(false);
  };

  const handleDelete = async (postId: string) => {
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (error) toast({ title: 'Delete failed', variant: 'destructive' });
    else { toast({ title: 'Post deleted' }); refetch(); }
  };

  // Derived stats
  const activePosts    = posts.filter(p => !p.is_archived).length;
  const openDeadlines  = posts.filter(p => p.deadline && new Date(p.deadline) > new Date()).length;

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'create',    label: 'Create',    icon: PlusCircle },
    { id: 'posts',     label: 'Posts',     icon: FileText   },
    { id: 'analytics', label: 'Analytics', icon: BarChart3  },
  ];

  return (
    <div className="min-h-screen bg-background pt-14 pb-16">
      {qgWarnings && (
        <QualityGate
          warnings={qgWarnings}
          onProceed={() => pendingPost && doPublish(pendingPost)}
          onCancel={() => { setQgWarnings(null); setPendingPost(null); }}
          loading={publishing}
        />
      )}

      <div className="container mx-auto px-4 max-w-4xl py-8">

        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Faculty Advisor Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Publish and manage announcements for your students.</p>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { icon: FileText,   label: 'Total posts',    value: posts.length },
            { icon: CheckCircle2, label: 'Active',        value: activePosts  },
            { icon: Clock,      label: 'Open deadlines', value: openDeadlines },
          ].map(({ icon: Icon, label, value }) => (
            <Card key={label} className="shadow-card">
              <CardContent className="pt-4 pb-4 flex flex-col items-center text-center">
                <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center mb-2">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tab strip */}
        <div className="flex rounded-lg border border-border bg-muted/40 p-0.5 mb-6 w-fit">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-md transition-all',
                tab === id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* ── CREATE ── */}
        {tab === 'create' && (
          <Card className="shadow-card max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <PlusCircle className="h-4 w-4 text-primary" /> New post
              </CardTitle>
              <CardDescription>Paste a URL to auto-fill, or write from scratch.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* URL auto-fill */}
              <div className="flex gap-2 mb-6 p-3 rounded-lg bg-muted/50 border border-border">
                <Input
                  placeholder="Paste URL to auto-fill fields ↓"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleScrape()}
                  className="flex-1 bg-background"
                />
                <Button variant="outline" onClick={handleScrape} disabled={scraping || !url.trim()} className="shrink-0">
                  {scraping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                  <span className="ml-1.5 hidden sm:inline">Auto-fill</span>
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Category <span className="text-destructive">*</span></Label>
                  <Select value={category} onValueChange={v => setCategory(v as Category)}>
                    <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => (
                        <SelectItem key={c} value={c}>
                          <span className="flex items-center gap-2">
                            <span className={cn('h-2 w-2 rounded-full', CATEGORY_STYLES[c]?.dot ?? 'bg-muted-foreground')} />
                            {c}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Title <span className="text-destructive">*</span></Label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Brief, descriptive title" required />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label>Summary <span className="text-destructive">*</span></Label>
                    <span className={cn('text-xs', summary.trim().split(/\s+/).filter(Boolean).length < 20 ? 'text-amber-600' : 'text-muted-foreground')}>
                      {summary.trim().split(/\s+/).filter(Boolean).length} / 20+ words
                    </span>
                  </div>
                  <Textarea
                    value={summary}
                    onChange={e => setSummary(e.target.value)}
                    placeholder="2–3 sentence summary for students"
                    rows={3}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Link</Label>
                  <Input type="url" value={link} onChange={e => setLink(e.target.value)} placeholder="https://…" />
                </div>

                <div className="space-y-1.5">
                  <Label>Deadline <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
                  <Input type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} />
                </div>

                {/* Poster upload */}
                <div className="space-y-1.5">
                  <Label>Poster / image <span className="text-xs text-muted-foreground font-normal">(optional, max 5 MB)</span></Label>
                  {posterPreview ? (
                    <div className="relative w-full rounded-lg overflow-hidden border border-border">
                      <img src={posterPreview} alt="Poster preview" className="w-full max-h-64 object-contain bg-muted" />
                      <button
                        type="button"
                        onClick={() => { setPosterFile(null); setPosterPreview(null); }}
                        className="absolute top-2 right-2 h-7 w-7 rounded-full bg-background/80 flex items-center justify-center hover:bg-background transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center gap-2 px-4 py-6 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary hover:bg-secondary/30 transition-colors">
                      <ImagePlus className="h-6 w-6 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Click to upload a poster image</span>
                      <span className="text-xs text-muted-foreground">PNG, JPG, WEBP up to 5 MB</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="hidden"
                        onChange={handlePosterChange}
                      />
                    </label>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={publishing || uploading}>
                  {uploading
                    ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Uploading poster…</>
                    : publishing
                    ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Publishing…</>
                    : <>Publish post <CheckCircle2 className="ml-1.5 h-4 w-4" /></>}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* ── POSTS ── */}
        {tab === 'posts' && (
          <div className="space-y-3">
            {postsLoading ? (
              [1,2,3].map(i => (
                <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3">
                  <Skeleton className="h-5 w-24 rounded-full" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))
            ) : posts.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p className="font-medium">No posts yet</p>
                <p className="text-sm mt-1">Create your first post in the Create tab.</p>
              </div>
            ) : (
              posts.map(post => {
                const style = CATEGORY_STYLES[post.category];
                const isExpanded = expandedId === post.id;
                return (
                  <Card key={post.id} className="shadow-card">
                    <CardContent className="pt-5">
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className={cn(
                              'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium',
                              style?.badge ?? 'bg-muted text-muted-foreground',
                            )}>
                              <span className={cn('h-1.5 w-1.5 rounded-full', style?.dot ?? 'bg-current')} />
                              {post.category}
                            </span>
                            {post.is_archived && (
                              <Badge variant="secondary" className="text-xs">Archived</Badge>
                            )}
                            {post.link_status === 'dead' && (
                              <Badge variant="destructive" className="text-xs">Dead link</Badge>
                            )}
                            {post.deadline && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(post.deadline).toLocaleDateString('en-IN')}
                              </span>
                            )}
                          </div>
                          <h3 className="font-semibold text-sm leading-snug truncate">{post.title}</h3>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{post.summary}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost" size="icon" className="h-8 w-8"
                            onClick={() => setExpandedId(isExpanded ? null : post.id)}
                            title="View analytics"
                          >
                            {isExpanded
                              ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="h-8 w-8"
                            onClick={() => handleDelete(post.id)}
                            title="Delete post"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      {isExpanded && <PostAnalytics postId={post.id} />}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* ── ANALYTICS ── */}
        {tab === 'analytics' && (
          <div className="space-y-6 max-w-2xl">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4 text-primary" /> Posts by category
                </CardTitle>
                <CardDescription>Distribution of your published content.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {CATEGORIES.map(cat => {
                  const count = posts.filter(p => p.category === cat).length;
                  const pct   = posts.length ? (count / posts.length) * 100 : 0;
                  const style = CATEGORY_STYLES[cat];
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="flex items-center gap-1.5">
                          <span className={cn('h-2 w-2 rounded-full', style?.dot ?? 'bg-muted-foreground')} />
                          {cat}
                        </span>
                        <span className="text-muted-foreground">{count} post{count !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all duration-500', style?.dot ?? 'bg-muted-foreground')}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" /> Post-level analytics
                </CardTitle>
                <CardDescription>
                  Switch to the Posts tab and expand any post to see per-post view/click metrics.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" onClick={() => setTab('posts')} className="w-full">
                  <FileText className="h-4 w-4 mr-1.5" /> View all posts
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default FADashboard;
