import { Router } from 'express';
import { z } from 'zod';
import { scrapeUrl } from '../services/scraper.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const scrapeRouter = Router();

const ScrapeBody = z.object({ url: z.string().url() });

// Only FA / co-FA / class rep can pre-fill post drafts
scrapeRouter.post(
  '/',
  requireAuth,
  requireRole('fa', 'co_fa', 'cr', 'admin'),
  async (req, res) => {
    const parsed = ScrapeBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const result = await scrapeUrl(parsed.data.url);
    res.json(result);
  }
);
