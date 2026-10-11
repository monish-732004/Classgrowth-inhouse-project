import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search as SearchIcon, Loader2 } from 'lucide-react';
import { PostCard } from '@/components/PostCard';
import { usePostActions } from '@/hooks/usePostActions';
import { postsApi, type Post, type ActionStatus } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

export default function Search() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { actions, upsert, remove } = usePostActions();

  const [q,        setQ]       = useState('');
  const [results,  setResults] = useState<Post[] | null>(null);
  const [source,   setSource]  = useState('');
  const [loading,  setLoading] = useState(false);
  const [userId,   setUserId]  = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const handleSearch = async () => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const { posts, source: s } = await postsApi.search(q);
      setResults(posts);
      setSource(s);
    } catch {
      toast({ title: 'Search failed', variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleView = async (postId: string) => {
    if (!userId) return;
    await supabase.from('post_views').insert({ user_id: userId, post_id: postId });
  };

  const handleLinkClick = async (postId: string) => {
    if (!userId) return;
    await supabase.from('post_views').update({ clicked_at: new Date().toISOString() })
      .eq('user_id', userId).eq('post_id', postId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background pt-20 pb-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Search</h1>
        </div>

        <div className="flex gap-2 mb-2">
          <Input
            autoFocus
            placeholder="Type a query — semantic + full-text search…"
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={loading || !q.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SearchIcon className="h-4 w-4" />}
          </Button>
        </div>

        {results !== null && (
          <p className="text-xs text-muted-foreground mb-4">
            {results.length} result{results.length !== 1 ? 's' : ''} · {source === 'semantic' ? 'semantic search' : 'full-text search'}
          </p>
        )}

        {results === null && (
          <p className="text-center text-muted-foreground py-16">
            Search across all posts — uses local embeddings, no external API.
          </p>
        )}

        <div className="space-y-3">
          {(results ?? []).map(p => (
            <PostCard
              key={p.id}
              post={p}
              currentAction={actions.get(p.id)?.status as ActionStatus}
              onView={handleView}
              onLinkClick={handleLinkClick}
              onUpsertAction={upsert}
              onRemoveAction={remove}
            />
          ))}
          {results?.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No results found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
