import { useState, useEffect, useCallback } from 'react';
import { actionsApi, type PostAction, type ActionStatus } from '@/lib/api';

export function usePostActions() {
  const [actions, setActions] = useState<Map<string, PostAction>>(new Map());
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const data = await actionsApi.getAll();
      setActions(new Map(data.map(a => [a.post_id, a])));
    } catch { /* not logged in or backend unavailable */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const upsert = useCallback(async (postId: string, status: ActionStatus, shareWithFA = false) => {
    await actionsApi.upsert(postId, status, shareWithFA);
    setActions(prev => {
      const next = new Map(prev);
      next.set(postId, { post_id: postId, status, is_shared_with_fa: shareWithFA, updated_at: new Date().toISOString() });
      return next;
    });
  }, []);

  const remove = useCallback(async (postId: string) => {
    await actionsApi.remove(postId);
    setActions(prev => { const next = new Map(prev); next.delete(postId); return next; });
  }, []);

  return { actions, loading, upsert, remove, refetch: fetchAll };
}
