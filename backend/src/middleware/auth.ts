import type { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

// Per-request anon client to verify the JWT from the Authorization header
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing Bearer token' });
    return;
  }

  const token = header.slice(7);
  const client = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  // Attach the verified user to the request
  (req as Request & { user: typeof data.user }).user = data.user;
  next();
}

export function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { supabase } = await import('../db/client.js');
    const user = (req as Request & { user?: { id: string } }).user;
    if (!user) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!data || !roles.includes(data.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}
