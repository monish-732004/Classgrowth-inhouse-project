import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, UserCircle } from 'lucide-react';
import { profileApi } from '@/lib/api';

const BRANCHES = ['CSE', 'ECE', 'EEE', 'Mech', 'Civil', 'IT', 'AIDS', 'AIML', 'CSD', 'Other'];
const CGPA_BANDS = ['Below 7', '7–8', '8–9', '9+'];
const CAREER_TRACKS = [
  { id: 'placement',  label: 'Placements / Jobs' },
  { id: 'internship', label: 'Internships' },
  { id: 'research',   label: 'Research / Higher Studies' },
  { id: 'startup',    label: 'Startups / Entrepreneurship' },
  { id: 'competitive',label: 'Competitive Programming' },
  { id: 'core',       label: 'Core Domain (non-IT)' },
];

export default function ProfileSetup() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [branch,       setBranch]       = useState('');
  const [year,         setYear]         = useState('');
  const [cgpaBand,     setCgpaBand]     = useState('');
  const [careerTracks, setCareerTracks] = useState<string[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [fetching,     setFetching]     = useState(true);

  // Pre-fill from existing profile
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
      toast({ title: 'Fill all fields', description: 'All fields are required to generate your personalized feed.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await profileApi.save({ branch, year: Number(year), cgpa_band: cgpaBand, career_tracks: careerTracks });
      toast({ title: 'Profile saved!', description: 'Your For You feed will update shortly.' });
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
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-start justify-center pt-24 px-4 pb-12">
      <Card className="w-full max-w-lg shadow-card">
        <CardHeader>
          <div className="flex items-center gap-3 mb-1">
            <UserCircle className="h-7 w-7 text-primary" />
            <CardTitle className="text-2xl">Your Profile</CardTitle>
          </div>
          <CardDescription>
            This information is used only to personalize your feed. No LLM or external API sees it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Branch */}
          <div className="space-y-1.5">
            <Label>Branch / Department</Label>
            <Select value={branch} onValueChange={setBranch}>
              <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
              <SelectContent>{BRANCHES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {/* Year */}
          <div className="space-y-1.5">
            <Label>Year of Study</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
              <SelectContent>
                {[1,2,3,4,5].map(y => <SelectItem key={y} value={String(y)}>Year {y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* CGPA band */}
          <div className="space-y-1.5">
            <Label>CGPA Band</Label>
            <Select value={cgpaBand} onValueChange={setCgpaBand}>
              <SelectTrigger><SelectValue placeholder="Select band" /></SelectTrigger>
              <SelectContent>{CGPA_BANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {/* Career tracks */}
          <div className="space-y-2">
            <Label>Career Interests <span className="text-xs text-muted-foreground">(select all that apply)</span></Label>
            <div className="grid grid-cols-2 gap-2">
              {CAREER_TRACKS.map(({ id, label }) => (
                <div key={id} className="flex items-center gap-2">
                  <Checkbox
                    id={id}
                    checked={careerTracks.includes(id)}
                    onCheckedChange={() => toggleTrack(id)}
                  />
                  <Label htmlFor={id} className="cursor-pointer text-sm leading-tight">{label}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => navigate('/dashboard')} className="flex-1">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Button onClick={handleSave} disabled={loading} className="flex-1">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</> : 'Save Profile'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
