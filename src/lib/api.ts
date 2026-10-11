// Thin client for the ClassGrowth backend API.
// Uses the Supabase session JWT so the backend can verify the caller.

import { supabase } from '@/integrations/supabase/client';

const BASE = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001';

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: await authHeaders() });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

async function put<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: await authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

async function del<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { method: 'DELETE', headers: await authHeaders() });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

// ── Posts ────────────────────────────────────────────────────

export interface Post {
  id: string;
  title: string;
  summary: string;
  link: string;
  category: string;
  deadline: string | null;
  audience_filter: Record<string, unknown>;
  link_status: 'ok' | 'dead' | 'redirect_login' | 'unchecked';
  is_archived: boolean;
  created_at: string;
  published_at: string | null;
  created_by: string;
  section_id: string | null;
  similarity?: number;
  score?: number;
  hours_left?: number;
}

export const postsApi = {
  embedAfterPublish: (id: string) =>
    post<{ ok: boolean; linkStatus: string }>(`/posts/${id}/embed`, {}),

  forYou: () =>
    get<{ posts: Post[]; source: string }>('/posts/for-you'),

  search: (q: string) =>
    get<{ posts: Post[]; source: string }>(`/posts/search?q=${encodeURIComponent(q)}`),
};

// ── Scrape ───────────────────────────────────────────────────

export interface ScrapeResult {
  title?: string;
  summary?: string;
  deadline?: string | null;
  suggestedCategory?: string;
  suggestedAudience?: string[];
  linkStatus: string;
}

export const scrapeApi = {
  scrapeUrl: (url: string) => post<ScrapeResult>('/scrape', { url }),
};

// ── Profile ──────────────────────────────────────────────────

export interface StudentProfile {
  branch: string;
  year: number;
  cgpa_band: string;
  career_tracks: string[];
  active_hours_json: Record<string, number>;
  updated_at: string;
}

export const profileApi = {
  get: () => get<StudentProfile | null>('/profile'),
  save: (data: Omit<StudentProfile, 'active_hours_json' | 'updated_at'>) =>
    put<{ ok: boolean }>('/profile', data),
};

// ── Actions ──────────────────────────────────────────────────

export type ActionStatus = 'saved' | 'interested' | 'applied' | 'shortlisted' | 'selected';

export interface PostAction {
  post_id: string;
  status: ActionStatus;
  is_shared_with_fa: boolean;
  updated_at: string;
}

export const actionsApi = {
  getAll: () => get<PostAction[]>('/actions'),
  upsert: (post_id: string, status: ActionStatus, is_shared_with_fa = false) =>
    put<{ ok: boolean }>('/actions', { post_id, status, is_shared_with_fa }),
  remove: (post_id: string) => del<{ ok: boolean }>(`/actions/${post_id}`),
};

// ── Analytics ────────────────────────────────────────────────

export const analyticsApi = {
  postStats: (postId: string) =>
    get<{
      postId: string;
      sectionSize: number;
      views: number;
      clicks: number;
      reach: number;
      ctr: number;
      actions: Record<string, number>;
    }>(`/analytics/post/${postId}`),
};

// ── Notifications ─────────────────────────────────────────────

export const notificationsApi = {
  registerToken: (token: string) => post<{ ok: boolean }>('/notifications/token', { token }),
  scheduleReminders: (postId: string, deadline: string, title: string) =>
    post<{ ok: boolean; scheduled: number }>('/notifications/schedule', { postId, deadline, title }),
};
