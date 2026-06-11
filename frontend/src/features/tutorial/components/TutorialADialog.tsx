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
import { useTutorialStore } from '../store/tutorial-store';
import { TutorialACoachmarks } from './TutorialACoachmarks';
import { BookOpen } from 'lucide-react';

export function TutorialADialog() {
  const {
    hasSeenTutorialA,
    isTutorialAOpen,
    markTutorialASeen,
    closeTutorialA,
  } = useTutorialStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [runCoachmarks, setRunCoachmarks] = useState(false);

  useEffect(() => {
    if (!hasSeenTutorialA) {
      setDialogOpen(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isTutorialAOpen) {
      setDialogOpen(true);
      closeTutorialA();
    }
  }, [isTutorialAOpen, closeTutorialA]);

  function handleDismiss() {
    setDialogOpen(false);
    markTutorialASeen();
  }

  function handleAccept() {
    setDialogOpen(false);
    markTutorialASeen();
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
              Tutorial de Entrada
            </DialogTitle>
            <DialogDescription className="font-body text-sm">
              Quer ver um tour rápido sobre como inserir o código de acesso e escolher seu papel na loja?
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

      <TutorialACoachmarks
        active={runCoachmarks}
        onDone={() => setRunCoachmarks(false)}
      />
    </>
  );
}
