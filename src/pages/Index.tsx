import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  ArrowRight, Bell, Bookmark, CalendarClock, Search, Sparkles, Users,
} from 'lucide-react';
import heroBg from '@/assets/hero-bg.jpg';
import { cn } from '@/lib/utils';

const FEATURES = [
  {
    icon: Sparkles,
    title: 'Personalized discovery',
    desc: 'Opportunities ranked to your academic profile, interests, and career goals.',
  },
  {
    icon: CalendarClock,
    title: 'Deadline tracking',
    desc: 'See exactly how much time you have left, grouped by urgency.',
  },
  {
    icon: Search,
    title: 'Smart search',
    desc: 'Find anything across all announcements instantly with full-text search.',
  },
  {
    icon: Bell,
    title: 'Instant updates',
    desc: 'Get notified in the browser the moment your FA posts something new.',
  },
  {
    icon: Bookmark,
    title: 'Save for later',
    desc: 'Bookmark opportunities and track your application progress in one place.',
  },
  {
    icon: Users,
    title: 'Faculty announcements',
    desc: 'Structured updates from your Faculty Advisor — no noise, no WhatsApp chains.',
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Sign in with your SRM email',
    desc: 'Use your @srmist.edu.in account. No extra registration needed.',
  },
  {
    n: '02',
    title: 'Set up your profile',
    desc: 'Tell us your branch, year, and career interests once.',
  },
  {
    n: '03',
    title: 'Discover what matters',
    desc: 'Your feed is ranked by relevance. Never miss a deadline again.',
  },
];

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      {/* ── HERO ── */}
      <section
        className="relative min-h-[100svh] flex items-center justify-center overflow-hidden"
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 30%',
        }}
      >
        {/* overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/40 to-black/72" />

        <div className="relative z-10 container mx-auto px-4 pt-24 pb-20">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/20 bg-white/10 text-white/90 text-xs font-medium mb-6 backdrop-blur-sm animate-fade-in">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Built for the SRM student community
            </span>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-[1.1] text-balance animate-fade-up mb-5">
              Your campus opportunities,<br className="hidden sm:block" /> all in one place.
            </h1>

            <p className="text-lg text-white/80 max-w-xl leading-relaxed animate-fade-up-delay-1 mb-8">
              Discover placements, workshops, deadlines, and technical opportunities — curated by your Faculty Advisor and ranked around your interests.
            </p>

            <div className="flex flex-wrap gap-3 animate-fade-up-delay-2">
              <Button
                size="lg"
                onClick={() => navigate('/auth')}
                className="text-base px-6 shadow-lg shadow-primary/25"
              >
                Get started <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
              <a href="#features">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-base px-6 border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white backdrop-blur-sm"
                >
                  Explore features
                </Button>
              </a>
            </div>
          </div>
        </div>

        {/* scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-white/40">
          <div className="h-6 w-px bg-white/30 mx-auto mb-1" />
          <div className="text-xs tracking-widest uppercase">scroll</div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Everything you need, nothing you don't</h2>
            <p className="text-muted-foreground text-base max-w-xl mx-auto">
              ClassGrowth surfaces the right opportunities at the right time, without the noise.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="group p-6 rounded-xl border border-border bg-card hover:shadow-hover transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Icon className="h-5 w-5 text-primary group-hover:text-primary-foreground transition-colors" />
                </div>
                <h3 className="font-semibold text-base mb-1.5">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-24 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Get started in minutes</h2>
            <p className="text-muted-foreground text-base max-w-md mx-auto">
              No lengthy setup. Three steps and you're discovering opportunities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {STEPS.map(({ n, title, desc }, i) => (
              <div key={n} className="relative flex flex-col items-center text-center">
                {/* connector line */}
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-[calc(50%+2rem)] right-0 h-px bg-border" />
                )}
                <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm mb-4 shadow-sm z-10">
                  {n}
                </div>
                <h3 className="font-semibold text-base mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <h2 className="text-3xl font-bold mb-5">About ClassGrowth</h2>
          <p className="text-muted-foreground text-base leading-relaxed mb-4">
            ClassGrowth centralizes all updates from your Faculty Advisor into a clean, personalized feed. Workshops, placements, tests, tech news, and industry updates — with a short title, summary, and direct link.
          </p>
          <p className="text-muted-foreground text-base leading-relaxed">
            Log in with your SRM email, set your interests, and get a curated view of everything relevant to your academic and professional journey. Every post interaction is saved in your history for easy reference.
          </p>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 bg-primary">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">
            Ready to stay connected?
          </h2>
          <p className="text-primary-foreground/80 text-base mb-8 max-w-md mx-auto">
            Join ClassGrowth and never miss an important update again.
          </p>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => navigate('/auth')}
            className="text-base px-8 shadow-lg"
          >
            Sign up now <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-10 bg-background border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs">
                CG
              </div>
              <span className="font-semibold text-sm">ClassGrowth</span>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Built by the U1, for the U1. &copy; 2025 ClassGrowth — by R. Monish
            </p>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <a href="#features" className="hover:text-foreground transition-colors">Features</a>
              <a href="#how-it-works" className="hover:text-foreground transition-colors">How it works</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
