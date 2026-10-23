import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search as SearchIcon, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { PostCard } from '@/components/PostCard';
import { usePostActions } from '@/hooks/usePostActions';
import { postsApi, type Post, type ActionStatus } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

const CATEGORIES = ['Workshop', 'Placement Info', 'Test Link', 'Tech News', 'Industry Update'];

export default function Search() {
  const navigate      = useNavigate();
  const { toast }     = useToast();
  const { actions, upsert, remove } = usePostActions();

  const [q,        setQ]       = useState('');
  const [results,  setResults] = useState<Post[] | null>(null);
  const [source,   setSource]  = useState('');
  const [loading,  setLoading] = useState(false);
  const [userId,   setUserId]  = useState<string | null>(null);
  const [catFilter, setCatFilter] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    // Focus input on mount
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleSearch = useCallback(async (query = q) => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const { posts, source: s } = await postsApi.search(query);
      setResults(posts);
      setSource(s);
    } catch {
      toast({ title: 'Search failed', description: 'Could not reach the search service.', variant: 'destructive' });
    }
    setLoading(false);
  }, [q, toast]);

  const handleView = async (postId: string) => {
    if (!userId) return;
    await supabase.from('post_views').insert({ user_id: userId, post_id: postId });
  };

  const handleLinkClick = async (postId: string) => {
    if (!userId) return;
    await supabase.from('post_views')
      .update({ clicked_at: new Date().toISOString() })
      .eq('user_id', userId).eq('post_id', postId);
  };

  const filtered = results
    ? catFilter ? results.filter(p => p.category === catFilter) : results
    : null;

  const clear = () => { setQ(''); setResults(null); setSource(''); setCatFilter(''); inputRef.current?.focus(); };

  return (
    <div className="min-h-screen bg-background pt-14 pb-16">
      <div className="container mx-auto px-4 max-w-2xl py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="-ml-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Search</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Find anything across all announcements.</p>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative mb-4">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            ref={inputRef}
            placeholder="Search posts…"
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="pl-9 pr-20 h-11"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
            {q && (
              <button type="button" onClick={clear} className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <Button size="sm" onClick={() => handleSearch()} disabled={loading || !q.trim()} className="h-7 text-xs">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Search'}
            </Button>
          </div>
        </div>

        {/* Results meta + category filter */}
        {results !== null && (
          <div className="flex flex-col gap-3 mb-5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{results.length}</span> result{results.length !== 1 ? 's' : ''}
                {' '}·{' '}
                <span className="italic">{source === 'semantic' ? 'semantic search' : 'full-text search'}</span>
              </p>
              {catFilter && (
                <button onClick={() => setCatFilter('')} className="text-xs text-primary hover:underline">
                  Clear filter
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.filter(c => results.some(p => p.category === c)).map(c => (
                <button
                  key={c}
                  onClick={() => setCatFilter(catFilter === c ? '' : c)}
                  className={cn(
                    'px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors',
                    catFilter === c
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border hover:bg-muted/60',
                  )}
                >{c}</button>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {results === null && !loading && (
          <div className="text-center py-20 text-muted-foreground">
            <SearchIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p className="text-sm">Type a query and press Enter or Search.</p>
            <p className="text-xs mt-1 opacity-60">Uses semantic + full-text search across all posts.</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3">
                <Skeleton className="h-5 w-1/3 rounded-full" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {!loading && filtered !== null && (
          <div className="space-y-3">
            {filtered.length === 0
              ? <div className="text-center py-12 text-muted-foreground text-sm">No results found.</div>
              : filtered.map(p => (
                  <PostCard
                    key={p.id}
                    post={p}
                    currentAction={actions.get(p.id)?.status as ActionStatus}
                    onView={handleView}
                    onLinkClick={handleLinkClick}
                    onUpsertAction={upsert}
                    onRemoveAction={remove}
                  />
                ))
            }
          </div>
        )}
      </div>
    </div>
  );
}
