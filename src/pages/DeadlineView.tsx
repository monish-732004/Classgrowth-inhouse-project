import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock } from 'lucide-react';
import { PostCard } from '@/components/PostCard';
import { DeadlineCountdown } from '@/components/DeadlineCountdown';
import { useDeadlinePosts } from '@/hooks/usePosts';
import { usePostActions } from '@/hooks/usePostActions';
import type { ActionStatus } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

const URGENCY_GROUPS = [
  { label: 'Today',        maxHours: 24  },
  { label: 'This week',    maxHours: 168 },
  { label: 'This month',   maxHours: 720 },
  { label: 'Later',        maxHours: Infinity },
];

export default function DeadlineView() {
  const navigate = useNavigate();
  const { posts, loading } = useDeadlinePosts();
  const { actions, upsert: upsertAction, remove: removeAction } = usePostActions();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const handleView = async (postId: string) => {
    if (!userId) return;
    await supabase.from('post_views').insert({ user_id: userId, post_id: postId });
  };

  const handleLinkClick = async (postId: string) => {
    if (!userId) return;
    await supabase
      .from('post_views')
      .update({ clicked_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('post_id', postId);
  };

  const grouped = URGENCY_GROUPS.map(group => ({
    ...group,
    posts: posts.filter(p => {
      const h = (new Date(p.deadline!).getTime() - Date.now()) / 3600000;
      const prevMax = URGENCY_GROUPS[URGENCY_GROUPS.indexOf(group) - 1]?.maxHours ?? 0;
      return h > prevMax && h <= group.maxHours;
    }),
  })).filter(g => g.posts.length > 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background pt-20 pb-12">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Clock className="h-6 w-6 text-primary" /> Deadline View
            </h1>
            <p className="text-sm text-muted-foreground">All posts with upcoming deadlines, sorted by urgency</p>
          </div>
        </div>

        {loading && <div className="animate-pulse text-muted-foreground text-center py-12">Loading…</div>}

        {!loading && posts.length === 0 && (
          <p className="text-center text-muted-foreground py-12">No upcoming deadlines right now.</p>
        )}

        {grouped.map(({ label, posts: groupPosts }) => (
          <div key={label} className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
              <span className={`inline-block w-2 h-2 rounded-full ${
                label === 'Today' ? 'bg-red-500' :
                label === 'This week' ? 'bg-amber-500' : 'bg-emerald-500'
              }`} />
              {label} — {groupPosts.length} post{groupPosts.length > 1 ? 's' : ''}
            </h2>
            <div className="space-y-3">
              {groupPosts.map(p => (
                <PostCard
                  key={p.id}
                  post={p}
                  currentAction={actions.get(p.id)?.status as ActionStatus}
                  onView={handleView}
                  onLinkClick={handleLinkClick}
                  onUpsertAction={upsertAction}
                  onRemoveAction={removeAction}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
