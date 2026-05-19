'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { ShieldCheck, ShieldOff, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { MfaSetupForm } from './MfaSetupForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function MfaSecurityCard() {
  const { user, disable2fa } = useAuthStore();
  const [loading, setLoading] = useState(false);

  async function handleDisable() {
    setLoading(true);
    try {
      await disable2fa();
      toast.success('Autenticação em duas etapas desativada.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao desativar 2FA';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="shadow-sm border rounded-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" aria-hidden />
            <CardTitle className="font-display text-base font-semibold text-foreground">
              Autenticação em duas etapas (2FA)
            </CardTitle>
          </div>
          {user?.twoFactorEnabled && (
            <span className="inline-flex items-center rounded-full border border-accent px-2.5 py-0.5 text-xs font-semibold text-accent">
              Ativo
            </span>
          )}
        </div>
        <CardDescription className="text-sm text-muted-foreground">
          Use o Google Authenticator, Microsoft Authenticator ou Authy para proteger sua conta.
        </CardDescription>
      </CardHeader>
      <Separator />
      <CardContent className="pt-4">
        {user?.twoFactorEnabled ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              O 2FA está ativo. Cada login exigirá o código do seu aplicativo autenticador.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={loading} className="w-full">
                  <ShieldOff className="mr-2 h-4 w-4" />
                  Desativar autenticação em duas etapas
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Desativar 2FA?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Sua conta ficará protegida apenas por senha. Você poderá reativar o 2FA a qualquer momento.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDisable}
                    disabled={loading}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Desativar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : (
          <MfaSetupForm />
        )}
      </CardContent>
    </Card>
  );
}
