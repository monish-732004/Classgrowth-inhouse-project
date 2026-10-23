import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

type Reaction = 'useful' | 'insightful' | 'applying';

const REACTIONS: { type: Reaction; emoji: string; label: string }[] = [
  { type: 'useful',     emoji: '👍', label: 'Useful'     },
  { type: 'insightful', emoji: '💡', label: 'Insightful' },
  { type: 'applying',   emoji: '🚀', label: 'Applying'   },
];

// One-way hash of userId+postId — browser crypto, non-reversible
async function makeHash(userId: string, postId: string): Promise<string> {
  const data = new TextEncoder().encode(userId + '|' + postId);
  const buf  = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

interface Props {
  postId: string;
  userId: string | null;
}

export function PostReactions({ postId, userId }: Props) {
  const [counts,  setCounts]  = useState<Record<Reaction, number>>({ useful: 0, insightful: 0, applying: 0 });
  const [mine,    setMine]    = useState<Reaction | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch aggregated counts
    supabase
      .from('post_reactions')
      .select('reaction')
      .eq('post_id', postId)
      .then(({ data }) => {
        if (!data) return;
        const c = { useful: 0, insightful: 0, applying: 0 } as Record<Reaction, number>;
        data.forEach(r => { if (r.reaction in c) c[r.reaction as Reaction]++; });
        setCounts(c);
      });

    // Check if this user already reacted
    if (!userId) return;
    makeHash(userId, postId).then(hash => {
      supabase
        .from('post_reactions')
        .select('reaction')
        .eq('post_id', postId)
        .eq('user_hash', hash)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setMine(data.reaction as Reaction);
        });
    });
  }, [postId, userId]);

  const toggle = async (type: Reaction) => {
    if (!userId || loading) return;
    setLoading(true);
    const hash = await makeHash(userId, postId);

    if (mine === type) {
      // Remove reaction
      await supabase
        .from('post_reactions')
        .delete()
        .eq('post_id', postId)
        .eq('user_hash', hash);
      setMine(null);
      setCounts(prev => ({ ...prev, [type]: Math.max(0, prev[type] - 1) }));
    } else {
      // Remove old reaction if any, then insert new
      if (mine) {
        await supabase.from('post_reactions').delete().eq('post_id', postId).eq('user_hash', hash);
        setCounts(prev => ({ ...prev, [mine]: Math.max(0, prev[mine] - 1) }));
      }
      await supabase.from('post_reactions').insert({ post_id: postId, reaction: type, user_hash: hash });
      setMine(type);
      setCounts(prev => ({ ...prev, [type]: prev[type] + 1 }));
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border/50" onClick={e => e.stopPropagation()}>
      <span className="text-xs text-muted-foreground mr-1">Reaction:</span>
      {REACTIONS.map(({ type, emoji, label }) => (
        <button
          key={type}
          type="button"
          disabled={!userId || loading}
          onClick={() => toggle(type)}
          title={label}
          className={cn(
            'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
            mine === type
              ? 'bg-primary/10 border-primary text-primary'
              : 'border-border hover:bg-muted/60 text-muted-foreground hover:text-foreground',
            (!userId || loading) && 'opacity-50 cursor-not-allowed',
          )}
        >
          <span>{emoji}</span>
          {counts[type] > 0 && <span>{counts[type]}</span>}
        </button>
      ))}
    </div>
  );
}
