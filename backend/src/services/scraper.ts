import * as cheerio from 'cheerio';
import * as chrono from 'chrono-node';

export interface ScrapeResult {
  title?: string;
  summary?: string;
  deadline?: string | null;    // ISO string or null
  suggestedCategory?: string;
  suggestedAudience?: string[];
  linkStatus: 'ok' | 'dead' | 'redirect_login';
}

// Keyword → category mapping (no LLM)
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Placement Info': ['placement', 'drive', 'internship', 'hiring', 'recruit', 'job', 'campus'],
  'Workshop':       ['workshop', 'webinar', 'seminar', 'bootcamp', 'training', 'session', 'hackathon'],
  'Test Link':      ['test', 'quiz', 'exam', 'assessment', 'aptitude', 'mock'],
  'Tech News':      ['launch', 'release', 'update', 'announcement', 'unveiled', 'product'],
  'Industry Update':['industry', 'market', 'trend', 'report', 'survey', 'research'],
};

// Keyword → audience mapping
const AUDIENCE_KEYWORDS: Record<string, string[]> = {
  'final_year':  ['final year', 'fourth year', '4th year', 'graduating'],
  'third_year':  ['third year', '3rd year'],
  'second_year': ['second year', '2nd year'],
  'first_year':  ['first year', '1st year', 'freshman'],
  'cse':         ['cse', 'computer science', 'cs'],
  'ece':         ['ece', 'electronics', 'electrical'],
  'mech':        ['mechanical', 'mech'],
  'cgpa_7':      ['cgpa 7', 'cgpa >= 7', 'cgpa > 7', 'minimum cgpa 7'],
  'cgpa_8':      ['cgpa 8', 'cgpa >= 8', 'cgpa > 8', 'minimum cgpa 8'],
};

// Regex patterns for Indian deadline phrasings
const DEADLINE_PATTERNS = [
  /last date[:\s]+(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i,
  /deadline[:\s]+(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i,
  /registration closes[:\s]+(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i,
  /closing date[:\s]+(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i,
  /apply before[:\s]+(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i,
  /before (\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i,
];

function suggestCategory(text: string): string | undefined {
  const lower = text.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) return category;
  }
}

function suggestAudience(text: string): string[] {
  const lower = text.toLowerCase();
  return Object.entries(AUDIENCE_KEYWORDS)
    .filter(([, keywords]) => keywords.some(k => lower.includes(k)))
    .map(([label]) => label);
}

function extractDeadline(text: string): string | null {
  // Try regex patterns first
  for (const pattern of DEADLINE_PATTERNS) {
    const m = text.match(pattern);
    if (m?.[1]) {
      const parsed = chrono.parseDate(m[1]);
      if (parsed) return parsed.toISOString();
    }
  }
  // Fall back to chrono-node full parse
  const results = chrono.parse(text, new Date(), { forwardDate: true });
  if (results.length > 0 && results[0].date()) {
    return results[0].date().toISOString();
  }
  return null;
}

async function checkLinkStatus(url: string): Promise<'ok' | 'dead' | 'redirect_login'> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeout);

    if (res.status === 404 || res.status >= 500) return 'dead';

    // Heuristic: if final URL contains login/signin keywords it's gated
    const finalUrl = res.url.toLowerCase();
    if (finalUrl.includes('login') || finalUrl.includes('signin') || finalUrl.includes('auth')) {
      return 'redirect_login';
    }
    return 'ok';
  } catch {
    return 'dead';
  }
}

export async function scrapeUrl(url: string): Promise<ScrapeResult> {
  const linkStatus = await checkLinkStatus(url);

  let html = '';
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    html = await res.text();
  } catch {
    return { linkStatus };
  }

  const $ = cheerio.load(html);

  const title =
    $('meta[property="og:title"]').attr('content') ||
    $('title').text().trim() ||
    undefined;

  const summary =
    $('meta[property="og:description"]').attr('content') ||
    $('meta[name="description"]').attr('content') ||
    undefined;

  const bodyText = $('body').text().replace(/\s+/g, ' ').slice(0, 5000);
  const searchText = `${title ?? ''} ${summary ?? ''} ${bodyText}`;

  return {
    title: title?.slice(0, 200),
    summary: summary?.slice(0, 500),
    deadline: extractDeadline(searchText),
    suggestedCategory: suggestCategory(searchText),
    suggestedAudience: suggestAudience(searchText),
    linkStatus,
  };
}
