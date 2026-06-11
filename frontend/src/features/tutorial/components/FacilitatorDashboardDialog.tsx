'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BookOpen } from 'lucide-react';
import { useTutorialStore } from '../store/tutorial-store';
import { FacilitatorDashboardCoachmarks } from './FacilitatorDashboardCoachmarks';

export function FacilitatorDashboardDialog() {
  const {
    hasSeenTutorialC,
    isTutorialCOpen,
    markTutorialCSeen,
    closeTutorialC,
  } = useTutorialStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [runCoachmarks, setRunCoachmarks] = useState(false);

  useEffect(() => {
    if (!hasSeenTutorialC) {
      setDialogOpen(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isTutorialCOpen) {
      setDialogOpen(true);
      closeTutorialC();
    }
  }, [isTutorialCOpen, closeTutorialC]);

  function handleDismiss() {
    setDialogOpen(false);
    markTutorialCSeen();
  }

  function handleAccept() {
    setDialogOpen(false);
    markTutorialCSeen();
    setRunCoachmarks(true);
  }

  return (
    <>
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => { if (!open) handleDismiss(); }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-lg">
              <BookOpen className="w-5 h-5 text-primary" />
              Tutorial do Facilitador
            </DialogTitle>
            <DialogDescription className="font-body text-sm">
              Quer ver um tour rápido sobre como criar sessões e acompanhar as partidas?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleDismiss} className="rounded-xl">
              Agora não
            </Button>
            <Button onClick={handleAccept} className="rounded-xl">
              Ver tutorial
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FacilitatorDashboardCoachmarks
        active={runCoachmarks}
        onDone={() => setRunCoachmarks(false)}
      />
    </>
  );
}
