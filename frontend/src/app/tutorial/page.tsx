'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import {
  Users,
  Store,
  ClipboardList,
  BookOpen,
  Trophy,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Timer,
  BarChart3,
  Zap,
  ShieldCheck,
  ShoppingCart,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

type Role = 'facilitator' | 'player';

const FACILITATOR_STEPS = [
  {
    icon: <Users className="h-6 w-6 text-primary" />,
    title: 'Crie uma Sessão',
    description:
      'No dashboard, clique em "Nova Sessão". Defina o nome, demanda total e o caixa inicial de cada loja (padrão R$ 700.000). Opcionalmente, configure um timer por rodada.',
    tip: 'A demanda total é distribuída entre as lojas com base no desempenho delas.',
  },
  {
    icon: <Store className="h-6 w-6 text-primary" />,
    title: 'Crie as Lojas',
    description:
      'Crie até 4 lojas. Cada loja recebe um código de acesso único. Compartilhe esse código com os jogadores para que entrem na partida e assumam seus papéis.',
    tip: 'Cada loja suporta exatamente 5 jogadores: Gerente de Loja, Suprimentos, Comercial, Operacional e Serviços.',
  },
  {
    icon: <BookOpen className="h-6 w-6 text-primary" />,
    title: 'Configure o Quiz',
    description:
      'Antes de iniciar cada rodada, cadastre 10 perguntas sobre varejo. O desempenho no quiz impacta diretamente o CSAT e, consequentemente, a demanda de cada loja.',
    tip: 'CSAT = (Operadores de Caixa / 10) × (Nota do Quiz / 100). Afeta o ranking de demanda.',
  },
  {
    icon: <Timer className="h-6 w-6 text-primary" />,
    title: 'Gerencie as Rodadas',
    description:
      'Avance o estado da sessão pelo painel (SETUP → Conf. R1 → Rodada 1 → Reconfiguração → Rodada 2 → Rodada 3 → Fim). Use o botão "Executar Rodada" para rodar o motor de cálculo após todos confirmarem o PO.',
    tip: 'O banner verde indica quando todas as lojas confirmaram o PO e você pode avançar.',
  },
  {
    icon: <BarChart3 className="h-6 w-6 text-primary" />,
    title: 'Analise os Resultados',
    description:
      'Após executar cada rodada, acesse "Ver Resultados" para o pódio e ranking, ou "Relatório Consolidado" para ver todas as métricas financeiras de cada loja por rodada.',
    tip: 'Use "Eventos por Rodada" para entender os impactos de SLA e eventos aleatórios no resultado de cada time.',
  },
];

const PLAYER_STEPS = [
  {
    icon: <Store className="h-6 w-6 text-accent" />,
    title: 'Entre na Sua Loja',
    description:
      'Peça o código de acesso ao facilitador. Na tela de Join, insira o código e escolha seu papel. Cada papel tem responsabilidades específicas no Plano Operacional.',
    tip: 'Só o Gerente de Loja pode confirmar o PO. Demais papéis colaboram nas decisões.',
  },
  {
    icon: <ShoppingCart className="h-6 w-6 text-accent" />,
    title: 'Monte o Plano de Estoque',
    description:
      'O Gerente de Suprimentos decide quantas unidades comprar de cada categoria (Perecíveis, Mercearia, Eletro, Hipel). O Gerente Comercial define a margem de preço sobre o custo unitário.',
    tip: 'Atenção ao estoque compartilhado: todas as lojas competem pelo mesmo estoque disponível.',
  },
  {
    icon: <ShieldCheck className="h-6 w-6 text-accent" />,
    title: 'Escolha os Investimentos (CAPEX)',
    description:
      'Decida quais tecnologias implementar: Segurança, Freezer, Rede, Site, Self-Checkout, Automação. Cada CAPEX tem custo de aquisição e impacto em licenças mensais, mas reduz riscos de incidentes.',
    tip: 'Sem o CAPEX, há chance de incidente de SLA a cada rodada — dias parados = receita perdida.',
  },
  {
    icon: <Users className="h-6 w-6 text-accent" />,
    title: 'Defina a Equipe Operacional',
    description:
      'O Gerente Operacional define quantos operadores de caixa contratar. O Gerente de Serviços define operadores de serviço. Mais operadores = maior CSAT, mas maior custo com folha salarial.',
    tip: 'Fórmula: CSAT = (caixas / 10) × (nota quiz / 100). Impacta sua fatia da demanda.',
  },
  {
    icon: <BookOpen className="h-6 w-6 text-accent" />,
    title: 'Responda o Quiz',
    description:
      'Cada membro responde 10 perguntas sobre gestão de varejo. A média da equipe vira o "quizScore" que entra no cálculo do CSAT. Responda com atenção — impacta diretamente o resultado da loja.',
    tip: 'Só é possível responder o quiz uma vez por rodada. O score é consolidado automaticamente.',
  },
  {
    icon: <Zap className="h-6 w-6 text-accent" />,
    title: 'Eventos e Resultados',
    description:
      'Após o facilitador executar a rodada, você verá os resultados: EBITDA, ranking e quais eventos ocorreram (SLA e aleatórios). Use essas informações para reconfigurar seu plano nas próximas rodadas.',
    tip: 'Na Reconfiguração (entre R1 e R2), você pode ajustar estoques, preços e CAPEX. Aproveite!',
  },
];

const GLOSSARY = [
  { term: 'EBITDA', definition: 'Lucro antes de impostos, juros, depreciação. Principal métrica de desempenho.' },
  { term: 'CSAT', definition: 'Índice de satisfação do cliente: (operadores/10) × (nota quiz/100). Afeta a demanda.' },
  { term: 'Disponibilidade', definition: 'Proporção do estoque total disponível que a loja comprou. Impacta demanda.' },
  { term: 'Cesta de Preço', definition: 'Preço médio ponderado dos produtos vendidos. Afeta ranking de demanda.' },
  { term: 'CAPEX', definition: 'Investimentos em tecnologia. Reduzem risco de SLA e impactam custos mensais.' },
  { term: 'SLA', definition: 'Nível de Serviço. Incidentes de SLA causam dias parados e perda de receita.' },
  { term: 'Demanda', definition: 'Calculada por rank score (CSAT + disponibilidade + preço). Distribui clientes entre lojas.' },
  { term: 'Reconfiguração', definition: 'Fase entre R1 e R2 onde os times podem ajustar seu PO para as próximas rodadas.' },
];

export default function TutorialPage() {
  return (
    <Suspense>
      <TutorialContent />
    </Suspense>
  );
}

function TutorialContent() {
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const isPlayer = user?.role === 'PLAYER';
  const initialRole: Role = isPlayer || searchParams.get('role') === 'player' ? 'player' : 'facilitator';
  const [role, setRole] = useState<Role>(initialRole);
  const [step, setStep] = useState(0);
  const router = useRouter();

  const steps = role === 'facilitator' ? FACILITATOR_STEPS : PLAYER_STEPS;
  const current = steps[step];
  const isFirst = step === 0;
  const isLast = step === steps.length - 1;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
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
          <h1 className="font-display text-2xl font-bold text-foreground">Como Jogar</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Guia passo a passo para o Retail Game Platform
          </p>
        </div>

        {/* Role toggle — só visível para facilitadores */}
        {!isPlayer && (
          <div className="flex gap-2 p-1 bg-muted rounded-xl w-fit">
            <button
              type="button"
              onClick={() => { setRole('facilitator'); setStep(0); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                role === 'facilitator'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Facilitador
            </button>
            <button
              type="button"
              onClick={() => { setRole('player'); setStep(0); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                role === 'player'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Jogador
            </button>
          </div>
        )}

        {/* Step indicator */}
        <div className="flex items-center gap-1.5">
          {steps.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStep(i)}
              className={`h-2 rounded-full transition-all ${
                i === step
                  ? 'w-6 bg-primary'
                  : i < step
                    ? 'w-2 bg-primary/40'
                    : 'w-2 bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Step card */}
        <Card className="rounded-xl border shadow-sm">
          <CardContent className="pt-6 pb-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted shrink-0">
                {current.icon}
              </div>
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground">
                    Passo {step + 1} de {steps.length}
                  </span>
                </div>
                <h2 className="font-display text-lg font-bold text-foreground">
                  {current.title}
                </h2>
              </div>
            </div>

            <p className="text-sm text-foreground leading-relaxed">
              {current.description}
            </p>

            <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/10 px-3 py-2.5">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">{current.tip}</p>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={isFirst}
            onClick={() => setStep((s) => s - 1)}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>

          {isLast ? (
            <Button
              size="sm"
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
              onClick={() => router.push(role === 'facilitator' ? '/dashboard' : '/join')}
            >
              <Trophy className="h-4 w-4 mr-1.5" />
              {role === 'facilitator' ? 'Ir ao Dashboard' : 'Entrar em uma Partida'}
            </Button>
          ) : (
            <Button size="sm" onClick={() => setStep((s) => s + 1)}>
              Próximo
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>

        <Separator />

        {/* Glossary */}
        <section className="space-y-3">
          <h2 className="font-display text-base font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            Glossário de Termos
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {GLOSSARY.map((item) => (
              <div key={item.term} className="rounded-lg border bg-card px-3 py-2.5">
                <p className="font-mono text-xs font-bold text-primary mb-0.5">{item.term}</p>
                <p className="text-xs text-muted-foreground">{item.definition}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

