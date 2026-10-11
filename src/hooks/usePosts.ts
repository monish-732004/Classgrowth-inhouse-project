import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { postsApi, type Post } from '@/lib/api';

// All posts (chronological, for the main feed)
export function useAllPosts(filterCategory?: string) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('posts')
      .select('*')
      .eq('is_archived', false)
      .order('created_at', { ascending: false });

    if (filterCategory) query = query.eq('category', filterCategory);

    const { data } = await query;
    setPosts((data as Post[]) ?? []);
    setLoading(false);
  }, [filterCategory]);

  useEffect(() => { fetch(); }, [fetch]);
  return { posts, loading, refetch: fetch };
}

// Personalized "For You" feed via backend
export function useForYouPosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [source, setSource] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { posts: p, source: s } = await postsApi.forYou();
      setPosts(p);
      setSource(s);
    } catch {
      setPosts([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  return { posts, source, loading, refetch: fetch };
}

// Deadline-sorted posts (via Supabase directly — simple query)
export function useDeadlinePosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('posts')
      .select('*')
      .not('deadline', 'is', null)
      .gt('deadline', new Date().toISOString())
      .eq('is_archived', false)
      .order('deadline', { ascending: true });

    setPosts((data as Post[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  return { posts, loading, refetch: fetch };
}

// FA: all posts including archived
export function useAllPostsFA() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });
    setPosts((data as Post[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  return { posts, loading, refetch: fetch };
}
