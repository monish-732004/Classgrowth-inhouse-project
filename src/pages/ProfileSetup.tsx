import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, ArrowRight, UserCircle, Check } from 'lucide-react';
import { profileApi } from '@/lib/api';
import { cn } from '@/lib/utils';

const BRANCHES      = ['CSE', 'ECE', 'EEE', 'Mech', 'Civil', 'IT', 'AIDS', 'AIML', 'CSD', 'Other'];
const CGPA_BANDS    = ['Below 7', '7–8', '8–9', '9+'];
const CAREER_TRACKS = [
  { id: 'placement',   label: 'Placements / Jobs'            },
  { id: 'internship',  label: 'Internships'                  },
  { id: 'research',    label: 'Research / Higher Studies'    },
  { id: 'startup',     label: 'Startups / Entrepreneurship'  },
  { id: 'competitive', label: 'Competitive Programming'      },
  { id: 'core',        label: 'Core Domain (non-IT)'         },
];

const STEPS = ['Academic details', 'Career interests', 'Review & save'];

export default function ProfileSetup() {
  const navigate    = useNavigate();
  const { toast }   = useToast();
  const [step,          setStep]         = useState(0);
  const [branch,        setBranch]       = useState('');
  const [year,          setYear]         = useState('');
  const [cgpaBand,      setCgpaBand]     = useState('');
  const [careerTracks,  setCareerTracks] = useState<string[]>([]);
  const [loading,       setLoading]      = useState(false);
  const [fetching,      setFetching]     = useState(true);

  useEffect(() => {
    profileApi.get()
      .then(p => {
        if (!p) return;
        setBranch(p.branch ?? '');
        setYear(String(p.year ?? ''));
        setCgpaBand(p.cgpa_band ?? '');
        setCareerTracks(p.career_tracks ?? []);
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, []);

  const toggleTrack = (id: string) =>
    setCareerTracks(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);

  const handleSave = async () => {
    if (!branch || !year || !cgpaBand || careerTracks.length === 0) {
      toast({ title: 'Fill all fields', description: 'Please complete all steps before saving.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await profileApi.save({ branch, year: Number(year), cgpa_band: cgpaBand, career_tracks: careerTracks });
      toast({ title: 'Profile saved!', description: 'Your personalised feed will update shortly.' });
      navigate('/dashboard');
    } catch {
      toast({ title: 'Save failed', variant: 'destructive' });
    }
    setLoading(false);
  };

  if (fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-14 pb-16">
      <div className="container mx-auto px-4 max-w-lg py-12">

        {/* Back */}
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="-ml-2 mb-6">
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back to dashboard
        </Button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
            <UserCircle className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Your profile</h1>
            <p className="text-sm text-muted-foreground">Helps personalise your opportunity feed.</p>
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1 last:flex-none">
              <button
                type="button"
                onClick={() => i < step && setStep(i)}
                className={cn(
                  'h-7 w-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 transition-colors',
                  i < step  ? 'bg-primary text-primary-foreground cursor-pointer'   :
                  i === step ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' :
                               'bg-muted text-muted-foreground',
                )}
              >
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </button>
              <span className={cn('text-xs hidden sm:block', i === step ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                {s}
              </span>
              {i < STEPS.length - 1 && (
                <div className={cn('flex-1 h-px mx-1', i < step ? 'bg-primary' : 'bg-border')} />
              )}
            </div>
          ))}
        </div>

        <Card className="shadow-card">
          <CardContent className="pt-6">

            {/* Step 0 — Academic details */}
            {step === 0 && (
              <div className="space-y-5">
                <h2 className="font-semibold text-base">Academic details</h2>

                <div className="space-y-1.5">
                  <Label htmlFor="branch">Branch / Department</Label>
                  <Select value={branch} onValueChange={setBranch}>
                    <SelectTrigger id="branch"><SelectValue placeholder="Select branch" /></SelectTrigger>
                    <SelectContent>{BRANCHES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="year">Year of study</Label>
                  <Select value={year} onValueChange={setYear}>
                    <SelectTrigger id="year"><SelectValue placeholder="Select year" /></SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5].map(y => <SelectItem key={y} value={String(y)}>Year {y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cgpa">CGPA band</Label>
                  <Select value={cgpaBand} onValueChange={setCgpaBand}>
                    <SelectTrigger id="cgpa"><SelectValue placeholder="Select band" /></SelectTrigger>
                    <SelectContent>{CGPA_BANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                <Button
                  className="w-full"
                  disabled={!branch || !year || !cgpaBand}
                  onClick={() => setStep(1)}
                >
                  Next <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Step 1 — Career interests */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <h2 className="font-semibold text-base">Career interests</h2>
                  <p className="text-sm text-muted-foreground mt-1">Select all that apply — this shapes your feed.</p>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {CAREER_TRACKS.map(({ id, label }) => (
                    <label
                      key={id}
                      htmlFor={`track-${id}`}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors',
                        careerTracks.includes(id)
                          ? 'border-primary bg-secondary'
                          : 'border-border hover:bg-muted/40',
                      )}
                    >
                      <Checkbox
                        id={`track-${id}`}
                        checked={careerTracks.includes(id)}
                        onCheckedChange={() => toggleTrack(id)}
                      />
                      <span className="text-sm font-medium">{label}</span>
                    </label>
                  ))}
                </div>

                <div className="flex gap-2 pt-1">
                  <Button variant="outline" onClick={() => setStep(0)} className="flex-1">
                    <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
                  </Button>
                  <Button
                    disabled={careerTracks.length === 0}
                    onClick={() => setStep(2)}
                    className="flex-1"
                  >
                    Next <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2 — Review */}
            {step === 2 && (
              <div className="space-y-5">
                <h2 className="font-semibold text-base">Review your profile</h2>

                <dl className="divide-y divide-border text-sm">
                  {[
                    { label: 'Branch',    value: branch },
                    { label: 'Year',      value: `Year ${year}` },
                    { label: 'CGPA band', value: cgpaBand },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between py-2.5">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="font-medium">{value}</dd>
                    </div>
                  ))}
                  <div className="py-2.5">
                    <dt className="text-muted-foreground mb-2">Career interests</dt>
                    <dd className="flex flex-wrap gap-1.5">
                      {careerTracks.map(id => (
                        <span key={id} className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground border border-border">
                          {CAREER_TRACKS.find(t => t.id === id)?.label ?? id}
                        </span>
                      ))}
                    </dd>
                  </div>
                </dl>

                <p className="text-xs text-muted-foreground bg-muted/50 px-3 py-2.5 rounded-lg">
                  This information is used only to personalise your feed. It is never shared or used for external APIs.
                </p>

                <div className="flex gap-2 pt-1">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                    <ArrowLeft className="mr-1.5 h-4 w-4" /> Edit
                  </Button>
                  <Button onClick={handleSave} disabled={loading} className="flex-1">
                    {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Saving…</> : <>Save profile <Check className="ml-1.5 h-4 w-4" /></>}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
