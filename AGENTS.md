# AGENTS.md — Retail Game Platform

> Contexto para Codex. Leia este arquivo inteiro antes de qualquer tarefa.
> Última atualização: 30/03/2026

## O que é este projeto

Plataforma web gamificada que digitaliza uma dinâmica presencial de gestão de loja de varejo. 4 lojas competem em 3 rodadas. Cada loja = 5 jogadores com papéis fixos. Jogadores preenchem um Plano Operacional (PO) colaborativo, respondem quiz, e o motor de cálculo gera EBITDA automaticamente. Maior %EBITDA acumulado vence.

Repositório: github.com/Tarsomap/retail-game-platform

## Stack

- Backend: NestJS 10 + TypeScript 5 + Prisma 5 + PostgreSQL 15 (Docker)
- Frontend: Next.js 14 + Tailwind CSS + shadcn/ui + Zustand
- Real-time: Socket.io 4
- Auth: JWT (1h) + Refresh Token (7d) + bcrypt
- Backend porta 3001, frontend porta 3000

## Ambiente de desenvolvimento

- Docker: container `retail-postgres` na porta 5432
- Após reiniciar o PC: rodar `docker start retail-postgres`
- Backend .env: DATABASE_URL com postgres:postgres@localhost:5432/retail_game_dev

## Status do Projeto

### ✅ MVP — 100% Implementado e Testado
Todos os módulos backend (10) e frontend estão implementados, compilando limpo, e testados end-to-end.

**Backend (build limpo, 72 testes no engine + testes do assistente):**
- Auth: register, login, refresh, JWT guards, roles
- Users: findById, findByEmail
- Sessions: CRUD, state machine (SETUP → ROUND_1_CONFIG → ROUND_1 → RECONFIGURATION → ROUND_2 → ROUND_3 → FINISHED), invite codes
- Stores: CRUD, join via accessCode, max 4/sessão, 5 papéis, GET /stores/mine
- Plans: PO completo (category decisions, CAPEX, workforce, confirm), estoque compartilhado
- Quiz: 10 perguntas/rodada, auto-consolidação, CSAT integrado
- Engine: CSAT, Demand, Shrinkage, Financial, SLA — 72 testes, 100% cobertura
- Results: round results, ranking por %EBITDA, caixa final
- Gateway: WebSocket com 7 eventos
- Transfer: movimentação obrigatória 1-2 jogadores por loja
- Assistant: explicador sob demanda com OpenAI primário, Groq fallback, escopo fechado e sem dependência do EngineModule

**Frontend (compilando limpo):**
- Login, Register (toggle Facilitador/Jogador)
- Dashboard do facilitador: lista sessões, criar sessão, stepper de fases
- Gerenciamento de sessão: criar lojas, ver códigos, status POs, avançar rodadas
- Gerenciamento de quiz: criar 10 perguntas com 4 opções
- Join: entrar via código + papel, reentrada automática
- PO: layout 2 colunas (DRE + decisões), estoque/pricing/operadores/CAPEX
- Quiz do jogador: responder perguntas, ver score
- Resultados: ranking final com medalhas, EBITDA%, caixa final, breakdown
- Assistente StoreLab: chat flutuante contextual no AppShell para rotas autenticadas

**7 correções da empresa parceira já aplicadas.**

### 🔄 Fase Atual: B.1 — Redesign Visual (Light Mode)
Estamos implementando o design system e identidade visual do frontend.
NÃO alterar lógica de negócio, hooks, stores ou chamadas de API.
Apenas visual: cores, fontes, layout, espaçamentos, componentes UI.

### ⏳ Próximas Fases
- B.2: Dark mode + responsividade + animações
- C: Diferenciais (PDF export, gráficos, what-if, WebSocket UI)
- D: Deploy (Railway + Vercel) + CI/CD + QA + entrega final

## Constantes Validadas (spec.md v1.1 — fonte da verdade)

- Salários: caixa R$1.000, serviço R$1.200
- Manutenção: R$400 (zerada com FREEZER)
- Juros: 12% sobre excedente acima de R$700k
- Licença base: R$500 + deltas por CAPEX
- CSAT: (ops/10) × quizScore
- Impostos: Perecíveis 12%, Mercearia 7%, Eletro 25%, Hipel 17%
- Quebras/Aging: só na rodada 3, sobre estoque acumulado não vendido

## Design System — Fase B

### Direção Estética
Opção C — Hybrid: light mode como padrão + dark mode como toggle.
Tom: "Dashboard financeiro premium com energia competitiva".
NÃO usar logo/nome da empresa parceira em nenhuma tela.

### Fontes (importar via next/font/google em layout.tsx)
- Display (títulos, nomes de lojas, EBITDA): Sora
- Body (texto corrido, labels): DM Sans
- Mono (valores R$, percentuais, tabelas numéricas): JetBrains Mono

### Paleta Light (:root no globals.css)
- --primary: 222 47% 21%          azul escuro (confiança, corporativo)
- --primary-foreground: 210 40% 98%
- --accent: 142 71% 45%           verde (lucro, EBITDA positivo)
- --accent-foreground: 0 0% 100%
- --destructive: 0 84% 60%        vermelho (prejuízo, EBITDA negativo)
- --destructive-foreground: 0 0% 100%
- --warning: 38 92% 50%           âmbar (atenção, caixa médio)
- --warning-foreground: 0 0% 100%
- --background: 220 14% 96%       cinza claro
- --foreground: 222 47% 11%
- --card: 0 0% 100%
- --card-foreground: 222 47% 11%
- --muted: 220 14% 92%
- --muted-foreground: 220 9% 46%
- --border: 220 13% 88%

### Paleta Dark (.dark no globals.css) — NÃO implementar agora, vem na Fase B.2
- --primary: 217 91% 60%
- --background: 222 47% 7%
- --card: 222 47% 11%

### Cores por Categoria (usar em toda a aplicação)
- Perecíveis: hsl(142 71% 45%) verde
- Mercearia: hsl(38 92% 50%) âmbar
- Eletro: hsl(217 91% 60%) azul
- Hipel: hsl(280 68% 60%) roxo

### Cores de Ranking
- 1º: hsl(45 93% 47%) ouro | 2º: hsl(210 11% 71%) prata | 3º: hsl(29 49% 47%) bronze | 4º: hsl(220 9% 46%) cinza

### Regras Visuais Globais
- EBITDA positivo = verde (accent), negativo = vermelho (destructive), SEMPRE
- Valores monetários = `font-mono`; moeda sempre via `formatBrl()` em `@/lib/format-brl` (prefixo **`R$ `** com espaço)
- Títulos de página = font-display (Sora), text-2xl font-bold
- Status de sessão: usar `SessionStatusBadge` (`frontend/src/components/session-status-badge.tsx`) — SETUP=muted, ROUND em andamento=accent/warning conforme fase, FINISHED=primary
- Separadores em cards/seções: componente `Separator` (`frontend/src/components/ui/separator.tsx`); evitar `border-b` só no header do card (tabelas podem manter `border-b` entre linhas)
- Empty states: ícone Lucide discreto + título + texto curto + CTA quando fizer sentido (dashboard sem sessões, sessão sem lojas, join sem lojas vinculadas)
- Botões/links desabilitados: `cursor-not-allowed` + `opacity-50` (base do `Button`); inputs do PO somente leitura (`disabled`): `disabled:bg-muted/50 disabled:cursor-default` além do estilo do `Input`
- Labels de formulário (auth e similares): `text-sm text-muted-foreground`
- Cards: rounded-xl shadow-sm border, hover:shadow-md
- Border radius padrão: rounded-xl (12px)
- Transição global: transition-colors duration-200

### Layout Shell
- TopBar: h-16, bg-primary, text-primary-foreground
- Sidebar: w-[260px], bg-card, border-r (só FACILITATOR)
- Content: flex-1, bg-background, p-8
- Jogador NÃO tem sidebar — layout fullscreen

## Documentos de Referência
- docs/agent/spec.md — regras de negócio validadas (fonte da verdade)
- docs/agent/plan.md — decisões técnicas e schema
- docs/agent/QUIZ.md — spec do quiz
- docs/ASSISTANT.md — arquitetura, envs, fallback e troubleshooting do assistente

## Assistente StoreLab

- O assistente é uma camada de apoio ao aprendizado: explica regras, sessões, rodadas, PO, indicadores e resultados já gravados.
- O backend usa OpenAI como provider principal e Groq como reserva via cliente compatível com OpenAI.
- O assistente NUNCA recalcula EBITDA, CSAT, demanda, impostos ou qualquer indicador; ele só interpreta dados persistidos.
- O módulo `assistant` não deve importar nem chamar `EngineModule` ou serviços de cálculo.
- Chaves de OpenAI/Groq ficam somente no `backend/.env`; nunca expor em frontend, docs com valores reais ou commits.
- A UI do chat fica em `frontend/src/features/assistant` e é renderizada pelo `AppShell` nas rotas autenticadas.

## Code Quality Rules
- Nunca usar `any`
- Nunca hardcodar constantes de negócio fora de constants/ ou seed/
- Controllers finos — lógica nos services
- DTO validation (class-validator) em todo endpoint
- Nunca quebrar o build: `npm run build` deve passar sem erros
