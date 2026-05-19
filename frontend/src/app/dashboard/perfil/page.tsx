'use client';

import { MfaSecurityCard } from '@/features/auth/components/MfaSecurityCard';

export default function PerfilPage() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 pb-6 sm:px-6 lg:px-0">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Minha Conta</h2>
        <p className="text-sm text-muted-foreground mt-1">Configurações de segurança da sua conta</p>
      </div>
      <MfaSecurityCard />
    </div>
  );
}
