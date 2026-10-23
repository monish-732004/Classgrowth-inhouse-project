import { ExternalLink, AlertTriangle, Lock, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DeadlineCountdown } from './DeadlineCountdown';
import { PostActionButtons } from './PostActionButtons';
import { PostReactions } from './PostReactions';
import type { Post, ActionStatus } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const CATEGORY_COLORS: Record<string, string> = {
  'Workshop':        'bg-blue-500',
  'Placement Info':  'bg-green-500',
  'Test Link':       'bg-yellow-500',
  'Tech News':       'bg-purple-500',
  'Industry Update': 'bg-orange-500',
};

function LinkStatusBadge({ status }: { status: Post['link_status'] }) {
  if (status === 'ok' || status === 'unchecked') return null;
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
      status === 'dead'           ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' :
      'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    )}>
      {status === 'dead' ? <AlertTriangle className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
      {status === 'dead' ? 'Link dead' : 'Login required'}
    </span>
  );
}

interface Props {
  post: Post;
  currentAction?: ActionStatus;
  onView?: (postId: string) => void;
  onLinkClick?: (postId: string) => void;
  onUpsertAction: (postId: string, status: ActionStatus) => Promise<void>;
  onRemoveAction: (postId: string) => Promise<void>;
  showActions?: boolean;
}

export function PostCard({
  post, currentAction, onView, onLinkClick, onUpsertAction, onRemoveAction, showActions = true,
}: Props) {
  const color = CATEGORY_COLORS[post.category] ?? 'bg-gray-500';
  const isDeadlinePast = post.deadline ? new Date(post.deadline) < new Date() : false;
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  return (
    <Card
      className={cn(
        'shadow-card hover:shadow-hover transition-shadow cursor-pointer',
        post.is_archived && 'opacity-60',
      )}
      onClick={() => onView?.(post.id)}
    >
      <CardContent className="pt-5 pb-4">
        {/* Top row: category + status badges */}
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <Badge className={`${color} text-white`}>{post.category}</Badge>
          {post.is_archived && (
            <span className="inline-flex items-center gap-1 text-xs bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400 px-2 py-0.5 rounded-full">
              <CheckCircle className="h-3 w-3" /> Applications closed
            </span>
          )}
          <LinkStatusBadge status={post.link_status} />
          {post.deadline && !post.is_archived && (
            <DeadlineCountdown deadline={post.deadline} />
          )}
          {isDeadlinePast && !post.is_archived && (
            <span className="text-xs text-muted-foreground">
              Deadline: {new Date(post.deadline!).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Poster image */}
        {post.image_url && (
          <div className="mb-3 -mx-5 -mt-1">
            <img
              src={post.image_url}
              alt={post.title}
              className="w-full max-h-56 object-cover rounded-t-none"
              loading="lazy"
            />
          </div>
        )}

        {/* Title + summary */}
        <h3 className="font-semibold text-base leading-snug mb-1">{post.title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{post.summary}</p>

        {/* Link */}
        {post.link && (
          <a
            href={post.link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 text-sm text-primary hover:underline inline-flex items-center gap-1"
            onClick={e => { e.stopPropagation(); onLinkClick?.(post.id); }}
          >
            View Link <ExternalLink className="h-3 w-3" />
          </a>
        )}

        {/* Action buttons */}
        {showActions && !post.is_archived && (
          <PostActionButtons
            postId={post.id}
            current={currentAction}
            onUpsert={onUpsertAction}
            onRemove={onRemoveAction}
          />
        )}

        {/* Reactions */}
        <PostReactions postId={post.id} userId={userId} />

        {/* Footer */}
        <p className="text-xs text-muted-foreground mt-3">
          {new Date(post.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </CardContent>
    </Card>
  );
}
