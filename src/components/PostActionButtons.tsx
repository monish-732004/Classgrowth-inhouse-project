import { useState } from 'react';
import { Bookmark, Send, Star, Trophy, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ActionStatus } from '@/lib/api';

const STEPS: { status: ActionStatus; label: string; Icon: React.ElementType }[] = [
  { status: 'saved',       label: 'Save',        Icon: Bookmark    },
  { status: 'applied',     label: 'Applied',     Icon: Send        },
  { status: 'shortlisted', label: 'Shortlisted', Icon: Star        },
  { status: 'selected',    label: 'Selected',    Icon: Trophy      },
];

const STATUS_ORDER: ActionStatus[] = ['saved', 'interested', 'applied', 'shortlisted', 'selected'];

interface Props {
  postId: string;
  current?: ActionStatus;
  onUpsert: (postId: string, status: ActionStatus) => Promise<void>;
  onRemove: (postId: string) => Promise<void>;
  disabled?: boolean;
}

export function PostActionButtons({ postId, current, onUpsert, onRemove, disabled }: Props) {
  const [busy, setBusy] = useState(false);

  const handle = async (status: ActionStatus) => {
    if (disabled || busy) return;
    setBusy(true);
    try {
      if (current === status) {
        // clicking the active status removes it
        await onRemove(postId);
      } else {
        await onUpsert(postId, status);
      }
    } finally {
      setBusy(false);
    }
  };

  const currentIdx = current ? STATUS_ORDER.indexOf(current) : -1;

  return (
    <div className="flex flex-wrap gap-1.5 mt-3" onClick={e => e.stopPropagation()}>
      {STEPS.map(({ status, label, Icon }, i) => {
        const stepIdx = STATUS_ORDER.indexOf(status);
        const isActive = current === status;
        const isPast   = currentIdx > stepIdx;
        return (
          <Button
            key={status}
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => handle(status)}
            className={cn(
              'text-xs h-7 gap-1 transition-colors',
              isActive && 'bg-primary text-primary-foreground border-primary',
              isPast   && 'bg-muted text-muted-foreground',
            )}
          >
            {isPast ? <CheckCircle2 className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
            {label}
          </Button>
        );
      })}
    </div>
  );
}
