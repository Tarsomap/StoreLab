'use client';

/**
 * Formulário para ativar MFA: exibe QR code e input para confirmar código.
 * Fluxo:
 * 1. Usuário clica em "Ativar 2FA"
 * 2. Servidor gera QR code e secret temporário
 * 3. Usuário escaneia QR code com Google Authenticator
 * 4. Usuário digita código de 6 dígitos
 * 5. Servidor valida e persiste secret
 */
import { useState } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface MfaSetupFormProps {
  onSuccess?: () => void;
}

export function MfaSetupForm({ onSuccess }: MfaSetupFormProps) {
  const { enable2fa, confirm2fa } = useAuthStore();

  const [step, setStep] = useState<'idle' | 'loaded' | 'confirming'>('idle');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleStartSetup() {
    setLoading(true);
    setError('');
    try {
      const result = await enable2fa();
      setQrCode(result.qrCode);
      setSecret(result.secret);
      setStep('loaded');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao gerar QR code';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!secret) return;

    setLoading(true);
    setError('');
    setStep('confirming');

    try {
      await confirm2fa(code, secret);
      toast.success('Autenticação em duas etapas ativada com sucesso!');
      setStep('idle');
      setQrCode(null);
      setSecret(null);
      setCode('');
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Código inválido';
      setError(message);
      toast.error(message);
      setStep('loaded');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'idle') {
    return (
      <Button
        onClick={handleStartSetup}
        disabled={loading}
        variant="outline"
        className="w-full"
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Ativar autenticação em duas etapas
      </Button>
    );
  }

  return (
    <div className="space-y-4 p-4 border border-amber-200 bg-amber-50 rounded-lg">
      <div>
        <h3 className="font-semibold text-sm mb-3">Escaneie com seu app</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Use Google Authenticator, Microsoft Authenticator ou Authy
        </p>
        {qrCode && (
          <div className="flex justify-center mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrCode} alt="QR Code MFA" className="w-48 h-48 border border-border" />
          </div>
        )}
      </div>

      <div>
        <p className="text-xs text-muted-foreground mb-2">Ou use esta chave manualmente:</p>
        <code className="block text-xs bg-white border border-border p-2 rounded font-mono break-all">
          {secret}
        </code>
      </div>

      <form onSubmit={handleConfirm} className="space-y-3">
        {error && (
          <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2">
            {error}
          </div>
        )}

        <div>
          <Label htmlFor="totp-code" className="text-xs">
            Código de 6 dígitos
          </Label>
          <Input
            id="totp-code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
            disabled={loading || step === 'confirming'}
            className="mt-1 text-center font-mono tracking-widest"
          />
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setStep('idle');
              setQrCode(null);
              setSecret(null);
              setCode('');
              setError('');
            }}
            disabled={loading}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading || code.length !== 6}
            className="flex-1"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar
          </Button>
        </div>
      </form>
    </div>
  );
}
