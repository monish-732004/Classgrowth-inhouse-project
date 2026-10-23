import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PostCard } from '@/components/PostCard';
import { useDeadlinePosts } from '@/hooks/usePosts';
import { usePostActions } from '@/hooks/usePostActions';
import type { ActionStatus } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const URGENCY_GROUPS = [
  { label: 'Today',      maxHours: 24,       dot: 'bg-destructive',  badge: 'text-destructive bg-destructive/10' },
  { label: 'This week',  maxHours: 168,      dot: 'bg-amber-500',    badge: 'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-900/20' },
  { label: 'This month', maxHours: 720,      dot: 'bg-primary',      badge: 'text-primary bg-secondary' },
  { label: 'Later',      maxHours: Infinity, dot: 'bg-muted-foreground', badge: 'text-muted-foreground bg-muted/50' },
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
    await supabase.from('post_views')
      .update({ clicked_at: new Date().toISOString() })
      .eq('user_id', userId).eq('post_id', postId);
  };

  const grouped = URGENCY_GROUPS.map((group, i) => ({
    ...group,
    posts: posts.filter(p => {
      const h = (new Date(p.deadline!).getTime() - Date.now()) / 3600000;
      const prev = URGENCY_GROUPS[i - 1]?.maxHours ?? 0;
      return h > prev && h <= group.maxHours;
    }),
  })).filter(g => g.posts.length > 0);

  return (
    <div className="min-h-screen bg-background pt-14 pb-16">
      <div className="container mx-auto px-4 max-w-2xl py-8">

        {/* Page header */}
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="-ml-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-primary" /> Deadlines
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Upcoming application deadlines, sorted by urgency.
            </p>
          </div>
        </div>

        {/* Loading skeletons */}
        {loading && (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3">
                <Skeleton className="h-5 w-1/4 rounded-full" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && posts.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <CalendarClock className="h-12 w-12 mx-auto mb-4 opacity-25" />
            <h3 className="font-medium mb-1">No upcoming deadlines</h3>
            <p className="text-sm">Check back when new opportunities are posted.</p>
          </div>
        )}

        {/* Grouped */}
        {grouped.map(({ label, posts: gp, dot, badge }) => (
          <section key={label} className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <span className={cn('h-2 w-2 rounded-full', dot)} />
              <span className={cn('text-xs font-semibold px-2.5 py-0.5 rounded-full', badge)}>
                {label}
              </span>
              <span className="text-xs text-muted-foreground">
                {gp.length} post{gp.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="space-y-3">
              {gp.map(p => (
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
          </section>
        ))}
      </div>
    </div>
  );
}
