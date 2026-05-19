# Timer de Rodada

**Data:** 19/05/2026  
**Status:** ✅ Implementado e funcional

---

## Contexto

O facilitador pode configurar um limite de tempo por rodada (ex.: 15 minutos). O countdown aparece em tempo real para todos os participantes via WebSocket. O backend controla o estado do timer com precisão — pausas acumulam o tempo decorrido, e o frontend calcula o tempo restante localmente a partir dos timestamps recebidos.

---

## Fluxo

```
Criação da sessão
  → facilitador marca "Ativar timer" + define duração em minutos
  → POST /sessions com timerEnabled=true e timerDuration (em segundos)

Durante ROUND_1 / ROUND_2 / ROUND_3
  → facilitador clica "Iniciar" → PATCH /sessions/:id/timer/start
  → backend define timerStartedAt = now, emite session:timer_updated (STARTED)
  → todos os clientes recebem o evento e iniciam countdown local

  → facilitador clica "Pausar" → PATCH /sessions/:id/timer/pause
  → backend acumula elapsedBeforePause += (now - timerStartedAt), define timerPausedAt
  → emite session:timer_updated (PAUSED) → countdown congela nos clientes

  → facilitador clica "Continuar" → PATCH /sessions/:id/timer/start novamente
  → backend reseta timerStartedAt = now, limpa timerPausedAt
  → emite session:timer_updated (STARTED) → countdown retoma

  → facilitador clica "Encerrar" → PATCH /sessions/:id/timer/stop
  → backend zera timerStartedAt, timerPausedAt, elapsedBeforePause
  → emite session:timer_updated (STOPPED) → countdown volta ao valor cheio

  → timer chega a zero (remaining ≤ 0)
  → frontend detecta localmente via setInterval (sem evento do servidor)
  → TimerDisplay exibe "Tempo esgotado!" em vermelho pulsante
  → SessionTimerCard exibe banner de alerta para o facilitador
  → banner do jogador (PO) muda para fundo vermelho + "Tempo esgotado!"
  → facilitador avança manualmente para a próxima fase via ContextualActions

  → jogador confirma o PO enquanto timer está em execução
  → POST /sessions/:id/timer/finish (fire-and-forget, em background)
  → backend salva finishedAt, remainingTime e status do jogador na rodada
```

---

## Backend

### Schema (Prisma) — tabela `Session`

| Campo | Tipo | Descrição |
|---|---|---|
| `timerEnabled` | `Boolean` | Se o timer está ativo para a sessão |
| `timerDuration` | `Int?` | Duração configurada **em segundos** |
| `timerStartedAt` | `DateTime?` | Momento em que o timer foi iniciado/retomado |
| `timerPausedAt` | `DateTime?` | Momento em que o timer foi pausado |
| `elapsedBeforePause` | `Int` | Segundos acumulados antes da última pausa |

Tabela `PlayerRoundStatus`:

| Campo | Tipo | Descrição |
|---|---|---|
| `remainingTime` | `Int?` | Segundos restantes no momento em que o jogador marcou finalização antecipada |

### Endpoints

| Método | Rota | Guard | Descrição |
|---|---|---|---|
| `PATCH` | `/sessions/:id/timer/start` | JWT + FACILITATOR | Inicia ou retoma o timer |
| `PATCH` | `/sessions/:id/timer/pause` | JWT + FACILITATOR | Pausa e acumula elapsed |
| `PATCH` | `/sessions/:id/timer/stop` | JWT + FACILITATOR | Encerra e reseta tudo |
| `POST` | `/sessions/:id/timer/finish` | JWT | Jogador marca finalização antecipada |

### Cálculo de tempo restante (`calculateRemainingTime`)

```
Estado não iniciado / encerrado  →  timerDuration - elapsedBeforePause
Estado pausado                   →  timerDuration - elapsedBeforePause
Estado em execução               →  timerDuration - elapsedBeforePause - (now - timerStartedAt).segundos
```

> O frontend replica exatamente esta lógica com `setInterval` local, sem precisar receber ticks do servidor.

### Evento WebSocket — `session:timer_updated`

Emitido para as salas `session:{sessionId}` e `facilitator:{sessionId}` a cada ação.

```ts
{
  action: 'STARTED' | 'PAUSED' | 'STOPPED'
  sessionId: string
  timerDuration: number | null
  timerStartedAt: string | null   // ISO string
  timerPausedAt: string | null    // ISO string
  elapsedBeforePause: number
  timestamp: string               // ISO string do momento da emissão
}
```

---

## Frontend

### Novos arquivos

#### `features/session/hooks/use-session-timer.ts`

Hook de mutações usado pelo facilitador.

```ts
const { start, pause, stop, isLoading, error } = useSessionTimer(sessionId);
```

Chama `PATCH /sessions/:id/timer/{start|pause|stop}` e gerencia estado de loading/erro.

#### `features/session/hooks/use-realtime-timer.ts`

Hook do jogador: carrega estado inicial e mantém sincronizado via WebSocket.

```ts
const timerState = useRealtimeTimer(sessionId); // TimerState | null
```

1. Na montagem: `GET /sessions/:id` para obter estado atual do timer (falha silenciosamente se não houver acesso)
2. Escuta `session:timer_updated` via `useSocket(sessionId)` e atualiza estado local

#### `features/session/hooks/use-timer-expiry.ts`

Hook reativo que retorna `true` a partir do instante em que o tempo chega a zero.

```ts
const isExpired = useTimerExpiry(timerState); // boolean
```

- Aceita `TimerState | null` — retorna `false` quando `null`
- Usa `setInterval(1000)` enquanto o timer estiver em execução; para automaticamente quando pausado ou encerrado
- Usado por `SessionTimerCard` e pela tela de PO do jogador para acionar os estados visuais de expiração sem duplicar a lógica de cálculo

#### `features/session/hooks/use-player-round-finish.ts`

Hook que registra o término antecipado do jogador na rodada ativa.

```ts
const { finish } = usePlayerRoundFinish();
finish(sessionId); // fire-and-forget
```

- Chama `POST /sessions/:id/timer/finish`
- O backend salva `finishedAt`, `remainingTime` (segundos restantes no momento da chamada) e `status: FINISHED` em `PlayerRoundStatus`
- Chamado automaticamente ao confirmar o PO, se o timer estiver rodando

#### `features/session/components/TimerDisplay.tsx`

Componente de countdown puramente visual.

**Props:**
| Prop | Tipo |
|---|---|
| `timerDuration` | `number` |
| `timerStartedAt` | `string \| null` |
| `timerPausedAt` | `string \| null` |
| `elapsedBeforePause` | `number` |
| `size` | `'sm' \| 'lg'` (default: `'lg'`) |

**Comportamento:**
- Calcula tempo restante localmente via `setInterval` de 1 segundo
- Cor padrão → âmbar quando ≤ 60 s → vermelho quando expirado
- Exibe `"pausado"` inline quando timer está em pausa
- Exibe `"Tempo esgotado!"` em vermelho pulsante quando `remaining <= 0` e timer estava em execução
- Formato `MM:SS`

#### `features/session/components/SessionTimerCard.tsx`

Card completo para o facilitador com countdown + botões de controle.

- Retorna `null` quando `timerEnabled === false` ou `timerDuration === null`
- Botões visíveis apenas em `ROUND_1`, `ROUND_2` ou `ROUND_3`
- Fora das rodadas: texto informativo "Controles disponíveis durante as rodadas"
- Usa `useTimerExpiry` para exibir banner de alerta quando o tempo esgota: _"Tempo esgotado — avance para a próxima fase quando estiver pronto."_
- Estados dos botões:

| Estado do timer | Botões exibidos |
|---|---|
| Não iniciado | Iniciar |
| Em execução | Pausar + Encerrar |
| Pausado | Continuar + Encerrar |
| Expirado (em execução) | Pausar + Encerrar + banner de alerta |

### Arquivos modificados

#### `features/session/types.ts`

Novos campos em `SessionDetail`:
```ts
timerEnabled: boolean;
timerDuration: number | null;
timerStartedAt: string | null;
timerPausedAt: string | null;
elapsedBeforePause: number;
```

Campos opcionais adicionados em `Session` (lista do dashboard).

Novos campos em `UpdateSessionInput`:
```ts
timerEnabled?: boolean;
timerDuration?: number | null;
```

Novos tipos exportados: `TimerState`, `TimerUpdatePayload`.

#### `features/session/components/CreateSessionForm.tsx`

Checkbox "Ativar timer por rodada" + input numérico "Duração por rodada (minutos)".  
O campo de duração só aparece quando o checkbox está marcado.  
Na submissão: `timerDuration = minutos × 60` (conversão para segundos).

#### `features/session/components/EditSessionDialog.tsx`

Mesmos campos do formulário de criação, porém desabilitados quando a sessão está fora da fase `SETUP` (mesmo comportamento de `totalDemand` e `initialCash`). Tooltip explicativo ao hover.

#### `app/dashboard/session/[id]/page.tsx`

```tsx
{session.timerEnabled && (
  <SessionTimerCard session={session} onTimerChange={refetch} />
)}
```

Após cada ação do timer, `refetch()` recarrega a sessão e `TimerDisplay` recebe os novos timestamps.

#### `app/store/[storeId]/plan/page.tsx`

Banner acima do `PlanMetricCards` com estado reativo de expiração:

```tsx
const timerState = useRealtimeTimer(store?.sessionId);
const timerExpired = useTimerExpiry(timerState);
const { finish: finishRound } = usePlayerRoundFinish();
```

- O banner só aparece quando `timerState !== null` (facilitador ativou o timer)
- Quando em execução: fundo neutro + label "Tempo restante na rodada" + `TimerDisplay`
- Quando expirado: fundo vermelho + label "Tempo esgotado!" + `TimerDisplay`
- Ao confirmar o PO, se `timerState.timerStartedAt !== null && !timerState.timerPausedAt`, chama `finishRound(sessionId)` em background para registrar o horário e tempo restante do jogador

---

## Configuração via formulário

| Campo | UI | Valor enviado à API |
|---|---|---|
| Ativar timer | Checkbox | `timerEnabled: true/false` |
| Duração | Input em **minutos** | `timerDuration: minutos × 60` (segundos) |

Editável apenas na fase `SETUP`. Campos disponíveis em "Nova sessão" e no dialog "Editar sessão".

---

## Considerações técnicas

- **Countdown local, não por polling:** o servidor envia timestamps e o cliente calcula o restante com `setInterval(1000)`. Sem round-trips por segundo.
- **Precisão em pausas:** `elapsedBeforePause` acumula os segundos de cada ciclo de execução antes de pausar. Ao retomar, `timerStartedAt` é resetado para `now`, garantindo cálculo correto.
- **Reset atômico ao avançar fase:** `advanceStatus` inclui `timerStartedAt: null, timerPausedAt: null, elapsedBeforePause: 0` no mesmo `prisma.session.update`, evitando que o elapsed de uma rodada vaze para a próxima.
- **WebSocket idempotente:** o jogador pode chamar `useRealtimeTimer` simultaneamente com `useRealtimePlan`; ambos usam o mesmo pool de socket (`acquireSocket`), que garante uma única conexão por token.
- **Fallback silencioso:** se o jogador não tiver acesso a `GET /sessions/:id`, o timer simplesmente não aparece no carregamento inicial e passa a exibir a partir do primeiro evento WebSocket recebido.
- **Expiração detectada localmente:** nenhum evento de servidor é emitido quando o tempo chega a zero. O `useTimerExpiry` detecta via `setInterval` comparando `Date.now()` com os timestamps recebidos. O facilitador avança a fase manualmente.
- **`PlayerRoundStatus` fire-and-forget:** o registro de finalização antecipada (`POST /sessions/:id/timer/finish`) é disparado em background ao confirmar o PO. Falhas são silenciosas para não interromper o fluxo principal do jogador.
