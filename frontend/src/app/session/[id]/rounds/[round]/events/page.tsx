'use client';

import { useParams, useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Shield, Zap, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useRoundEvents } from '@/features/results/hooks/use-round-events';
import { formatBrl } from '@/lib/format-brl';

const RANDOM_EVENT_LABELS: Record<string, string> = {
  OPERATIONAL_FAILURE: 'Falha Operacional',
  REGULATORY_CHANGE: 'Mudança Regulatória',
  COMPETITOR_PROMOTION: 'Promoção Concorrente',
  REPUTATION_DAMAGE: 'Dano à Reputação',
  LOT_CONTAMINATION: 'Contaminação de Lote',
  INVENTORY_THEFT: 'Furto de Estoque',
  PAYMENT_SYSTEM_FAILURE: 'Falha no Sistema de Pagamento',
  CYBER_ATTACK: 'Ataque Cibernético',
  DATA_BREACH: 'Vazamento de Dados',
  LOGISTICS_PROBLEM: 'Problema Logístico',
  POWER_OUTAGE: 'Falta de Energia',
  CLIMATE_EVENT: 'Evento Climático',
  INPUT_COST_INCREASE: 'Aumento de Custo de Insumos',
  DEMAND_SURGE: 'Pico de Demanda',
};

export default function RoundEventsPage() {
  const params = useParams<{ id: string; round: string }>();
  const router = useRouter();
  const sessionId = params.id;
  const round = Number(params.round);

  const { data, loading, error } = useRoundEvents(sessionId, round);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
        <div className="h-40 bg-muted animate-pulse rounded-xl" />
        <div className="h-40 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-destructive">{error ?? 'Erro ao carregar eventos.'}</p>
      </div>
    );
  }

  const slaOccurred = data.slaEvents.filter((e) => e.occurred);
  const randomOccurred = data.randomEvents.filter((e) => e.occurred);

  const storeNames = Array.from(
    new Set([
      ...data.slaEvents.map((e) => e.store.name),
      ...data.randomEvents.map((e) => e.store.name),
    ]),
  ).sort();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="px-0 text-muted-foreground hover:bg-transparent"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>
      </div>

      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          Eventos da Rodada {round}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {slaOccurred.length + randomOccurred.length} evento(s) ocorrido(s) nesta rodada
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Incidentes SLA" value={slaOccurred.length} icon={<Shield className="h-4 w-4 text-destructive" />} />
        <StatTile label="Receita perdida SLA" value={formatBrl(slaOccurred.reduce((s, e) => s + e.revenueLost, 0))} icon={<AlertTriangle className="h-4 w-4 text-warning" />} />
        <StatTile label="Eventos aleatórios" value={randomOccurred.length} icon={<Zap className="h-4 w-4 text-primary" />} />
        <StatTile label="Lojas afetadas" value={storeNames.length} icon={<CheckCircle2 className="h-4 w-4 text-muted-foreground" />} />
      </div>

      {/* SLA Events */}
      <Card className="rounded-xl shadow-sm border">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-destructive" />
            Incidentes de SLA
          </CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4 space-y-2">
          {data.slaEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhum evento de SLA nesta rodada.</p>
          ) : (
            data.slaEvents.map((evt) => (
              <div
                key={evt.id}
                className={`flex items-start justify-between gap-3 rounded-lg px-3 py-2.5 text-sm ${
                  evt.occurred ? 'bg-destructive/5 border border-destructive/10' : 'bg-muted/30'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">{evt.store.name}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">{evt.capexOption.name}</span>
                    <Badge
                      variant="outline"
                      className={evt.occurred
                        ? 'bg-destructive/10 text-destructive border-destructive/20'
                        : 'bg-muted text-muted-foreground'}
                    >
                      {evt.occurred ? 'Ocorreu' : 'Não ocorreu'}
                    </Badge>
                  </div>
                  {evt.occurred && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {evt.daysDown} dia(s) parado · Receita perdida: <span className="font-mono text-destructive">{formatBrl(evt.revenueLost)}</span>
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Random Events */}
      <Card className="rounded-xl shadow-sm border">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Eventos Aleatórios
          </CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4 space-y-2">
          {data.randomEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhum evento aleatório nesta rodada.</p>
          ) : (
            data.randomEvents.map((evt) => (
              <div
                key={evt.id}
                className={`flex items-start justify-between gap-3 rounded-lg px-3 py-2.5 text-sm ${
                  evt.occurred ? 'bg-warning/5 border border-warning/10' : 'bg-muted/30'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">{evt.store.name}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">
                      {RANDOM_EVENT_LABELS[evt.eventType] ?? evt.eventType}
                    </span>
                    <Badge
                      variant="outline"
                      className={evt.occurred
                        ? 'bg-warning/10 text-warning border-warning/20'
                        : 'bg-muted text-muted-foreground'}
                    >
                      {evt.occurred ? 'Ocorreu' : 'Não ocorreu'}
                    </Badge>
                  </div>
                  {evt.occurred && evt.impactData && (
                    <ImpactSummary impactData={evt.impactData} />
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatTile({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card px-3 py-2.5 space-y-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="font-mono font-bold text-base text-foreground">{value}</p>
    </div>
  );
}

function ImpactSummary({ impactData }: { impactData: Record<string, unknown> }) {
  const parts: string[] = [];
  if (typeof impactData.costPenalty === 'number' && impactData.costPenalty > 0) {
    parts.push(`Multa: ${formatBrl(impactData.costPenalty as number)}`);
  }
  if (typeof impactData.revenueLost === 'number' && impactData.revenueLost > 0) {
    parts.push(`Receita perdida: ${formatBrl(impactData.revenueLost as number)}`);
  }
  if (typeof impactData.demandMultiplier === 'number') {
    parts.push(`Demanda: ${((impactData.demandMultiplier as number) * 100).toFixed(0)}%`);
  }
  if (typeof impactData.daysDown === 'number' && impactData.daysDown > 0) {
    parts.push(`${impactData.daysDown} dia(s) parado`);
  }
  if (parts.length === 0) return null;
  return (
    <p className="text-xs text-muted-foreground mt-1">{parts.join(' · ')}</p>
  );
}
