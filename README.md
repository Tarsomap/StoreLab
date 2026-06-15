# 🏪 StoreLab

> Plataforma web gamificada que digitaliza a dinâmica presencial de gestão de loja de varejo.
> **Residência em Software II — Squad 14 | Universidade Tiradentes**

**🔗 Demo ao vivo:** [store-lab-plum.vercel.app](https://store-lab-plum.vercel.app)

![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?logo=nestjs&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-4-010101?logo=socket.io&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white)
![Engine](https://img.shields.io/badge/engine-113%20testes%20%7C%20100%25%20cobertura-3FB950)
![Deploy](https://img.shields.io/badge/deploy-Railway%20%2B%20Vercel-0B0D0E)

---

## 📌 Sobre o Projeto

Sistema multiplayer em tempo real onde 4 lojas competem em 3 rodadas tomando decisões operacionais (estoque, pricing, equipe e CAPEX). O motor de cálculo processa CSAT, demanda, quebras, aging, SLA e EBITDA, gerando ranking automático. O Assistente StoreLab explica regras e indicadores sob demanda sem recalcular resultados.

### Como funciona em 3 passos
1. **Facilitador** cria uma sessão, configura parâmetros e cadastra perguntas do quiz
2. **Times de 5 jogadores** respondem o quiz e preenchem o Plano Operacional (PO) colaborativamente em tempo real
3. **Motor de cálculo** processa os números ao executar a rodada e atualiza o ranking; o assistente contextual ajuda a interpretar o jogo e os indicadores

---

## 🛠️ Stack

| Camada | Tecnologia |
|---|---|
| Backend | NestJS 10 + TypeScript |
| ORM | Prisma 5 |
| Banco | PostgreSQL 15 (Docker) |
| Tempo real | Socket.io 4 |
| Frontend | Next.js 14 (App Router) |
| UI | Tailwind CSS + shadcn/ui |
| Autenticação | JWT + Refresh Token + MFA TOTP |
| IA | OpenAI SDK v6 (OpenAI primário, Groq como fallback) |
| Onboarding | driver.js (coachmarks/tour guiado) |
| Gráficos | Recharts |
| Deploy | Railway (backend + Postgres) + Vercel (frontend) |

---

## 📊 Status

| Camada | Estado |
|---|---|
| Backend (12 módulos NestJS, 113 testes no engine, 100% cobertura) | ✅ Estabilizado |
| Frontend completo (10 features colocalizadas, zero `api.*` em `app/`) | ✅ Refatorado (Sprint 2) |
| MFA / 2FA TOTP + audit log | ✅ Em produção |
| Assistente explicador com OpenAI/Groq e chat flutuante | ✅ Implementado |
| CRUD completo de Sessions (DELETE + PATCH) | ✅ Entregue |
| CRUD de Stores (DELETE + EDIT) + swap recíproco de jogadores | ✅ Entregue |
| Eventos aleatórios por rodada (com relação CAPEX ↔ evento) | ✅ Implementado |
| Timer de rodada em tempo real (WebSocket) | ✅ Implementado |
| Custos do Plano Operacional na sessão | ✅ Implementado |
| Gráficos ao vivo (demanda + histórico de performance) | ✅ Implementado |
| Tutorial/onboarding guiado (facilitador + jogador) | ✅ Implementado |
| Deploy de produção (Railway + Vercel) | ✅ Preparado |
| Export de resultados em PDF | ⏳ Planejado |

Última atualização: junho/2026.

---

## 👥 Squad 14 — Frentes atuais

Reorganização decidida por enquete em 05/05/2026 (três frentes em vez de quatro):

| Frente | Integrantes |
|---|---|
| **Backend** | Miguel Moura Calumby Ferreira, Guilherme Silva Gomes, Gabriel Nascimento Correia, João Gustavo Carvalho Mendonça |
| **Frontend** | Pedro Augusto Jesus dos Santos, José Gabriel Silva Leite Maia, Felipe Carneiro de Araújo Lima |
| **Autenticação** | Victor César Maia Reis, Artur Menezes Figueiredo, Letícia Freire Fonseca |
| **Liderança técnica** | Tarso Monteiro Alves Passos (atuação transversal) |

---

## 📁 Documentação

### Entrada principal
| Documento | Para que serve |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | Contexto carregado automaticamente pelo Claude Code. Design system, fontes, paleta, regras visuais. **Lido em toda conversa nova.** |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Convenções de branch, commit e PR (Conventional Commits, Squash & Merge) |

### Regras técnicas por contexto (`.claude/rules/`)
Carregadas seletivamente conforme o arquivo aberto:

| Arquivo | Escopo |
|---|---|
| [`.claude/rules/backend.md`](.claude/rules/backend.md) | NestJS: módulos, DTOs, controllers, regras de negócio |
| [`.claude/rules/frontend.md`](.claude/rules/frontend.md) | Next.js: features colocalizadas, hooks, design system |
| [`.claude/rules/engine.md`](.claude/rules/engine.md) | Motor de cálculo — **imutável**, qualquer alteração exige TDD |
| [`.claude/rules/crud-patterns.md`](.claude/rules/crud-patterns.md) | Padrões consolidados para novos CRUDs (DTO, cascade manual, hooks, dialogs) |

### Especificação de negócio (`docs/agent/`)
| Documento | Conteúdo |
|---|---|
| [`docs/agent/spec.md`](docs/agent/spec.md) | **Fonte da verdade** — constantes, fórmulas, fluxo do jogo (v1.1, validada com parceiro) |
| [`docs/agent/plan.md`](docs/agent/plan.md) | Decisões técnicas, schema, contratos REST, eventos WebSocket |
| [`docs/agent/QUIZ.md`](docs/agent/QUIZ.md) | Spec completa do módulo Quiz |
| [`docs/ASSISTANT.md`](docs/ASSISTANT.md) | Arquitetura, envs, API e troubleshooting do Assistente StoreLab |

### Histórico (`docs/archive/`)
Documentos de processos consumados — referência apenas:
- `docs/archive/agent/` — prompts iniciais, roteiro e tasks do MVP
- `docs/archive/refactor-sprint-2/` — guia, template e validação do refactor estrutural do frontend
- `docs/archive/sprint-1/` — guias e tarefas da Sprint 1 (revisão do MVP)

---

## 🚀 Setup local

### Pré-requisitos
- Node.js 20+ (recomendado via `nvm`)
- Docker Desktop (para o PostgreSQL)
- npm 10+

### Backend
```bash
cd backend
cp .env.example .env  # preencher JWT_SECRET, JWT_REFRESH_SECRET, DATABASE_URL
docker compose up -d  # sobe o postgres
npm install
npx prisma migrate dev
npm run seed
npm run seed:demo     # opcional: dados de demonstração
npm run start:dev     # API em http://localhost:3001/api
```

Variáveis do assistente no `backend/.env`:
```env
ASSISTANT_PROVIDER_ORDER="openai,groq"
ASSISTANT_MAX_TOKENS="700"
ASSISTANT_TEMPERATURE="0.2"
ASSISTANT_REASONING_EFFORT="minimal"

OPENAI_API_KEY=""
ASSISTANT_MODEL="gpt-4o-mini"
ASSISTANT_FALLBACK_MODELS="gpt-4.1-mini,gpt-4o,gpt-4.1-nano,gpt-5-mini,gpt-5.4-mini,gpt-5.4-nano"

GROQ_API_KEY=""
GROQ_MODEL="llama-3.1-8b-instant"
GROQ_FALLBACK_MODELS="meta-llama/llama-4-scout-17b-16e-instruct,llama-3.3-70b-versatile,qwen/qwen3-32b,openai/gpt-oss-20b,openai/gpt-oss-120b,groq/compound-mini"
GROQ_BASE_URL="https://api.groq.com/openai/v1"
```

### Frontend
```bash
cd frontend
cp .env.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:3001/api   (com /api)
# NEXT_PUBLIC_WS_URL=http://localhost:3001        (sem /api)
npm install
npm run dev           # UI em http://localhost:3000
```

O chatbot fica disponível em rotas autenticadas como painel flutuante contextual.

### Credenciais do seed demo
- Facilitador: `facilitador@retail.game` / `senha123`
- Jogadores: `jogador01@retail.game` até `jogador24@retail.game` / `senha123`

### Sessões criadas pelo `seed:demo`
1. **Demo Completa** (FINISHED) — 3 rodadas com ranking pronto
2. **Em Andamento** (RECONFIGURATION) — rodada 1 concluída
3. **Aguardando POs** (ROUND_1_CONFIG) — 4 lojas, POs em preenchimento
4. **Sessão Nova** (SETUP) — vazia, sem lojas

### API do assistente
```http
POST /api/assistant/ask
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "sessionId": "opcional",
  "storeId": "opcional",
  "question": "Como funciona o CSAT?"
}
```

Resposta:
```json
{
  "answer": "Texto do assistente",
  "provider": "openai",
  "model": "gpt-4o-mini",
  "fallbackUsed": false
}
```

---

## 🧪 Testes

O motor de cálculo (`backend/src/engine`) é o coração do jogo e tem **113 testes (Jest) com 100% de cobertura** — CSAT, demanda, quebras/aging, SLA, financeiro/EBITDA e eventos aleatórios. Qualquer alteração no engine exige TDD (ver [`.claude/rules/engine.md`](.claude/rules/engine.md)).

```bash
cd backend
npm test              # roda toda a suíte (Jest)
npm run test:watch    # modo watch
npm run test:cov      # cobertura
npm run test:e2e      # testes end-to-end
```

> O frontend ainda não possui testes automatizados; a validação é manual + `npm run lint`.

---

## ☁️ Deploy

Produção em duas plataformas (decisão da Fase D):

| Plataforma | O que roda | Root Directory |
|---|---|---|
| **Railway** | Backend NestJS + PostgreSQL | `backend` |
| **Vercel** | Frontend Next.js (free tier) | `frontend` |

- `backend/railway.json`: build via Nixpacks, `prisma migrate deploy` no pre-deploy e `npm run start:prod` na inicialização.
- `backend/package.json` tem `postinstall: prisma generate` (sem ele o build na plataforma quebra).
- O backend faz bind em `0.0.0.0:$PORT` e lê CORS HTTP + WS de `FRONTEND_URL`.
- **Env Railway:** `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_EXPIRES_IN`, `REFRESH_TOKEN_EXPIRES_IN`, `FRONTEND_URL` (= URL da Vercel), `OPENAI_API_KEY`, `GROQ_API_KEY`.
- **Env Vercel:** `NEXT_PUBLIC_API_URL` = `<url-railway>/api` (com `/api`), `NEXT_PUBLIC_WS_URL` = `<url-railway>` (sem `/api`).
- **Ordem:** backend primeiro → frontend → setar `FRONTEND_URL` no backend (fecha o CORS).
- Pós-deploy: rodar `npm run seed` no shell da Railway (constantes de negócio: categorias + CAPEX); `seed:demo` é opcional.

---

## 🤝 Como contribuir

1. Leia o [`CONTRIBUTING.md`](CONTRIBUTING.md)
2. Para padrões de CRUD, [`.claude/rules/crud-patterns.md`](.claude/rules/crud-patterns.md)
3. **1 PR = 1 responsabilidade**. Branches `feat/`, `fix/`, `refactor/`, `chore/`, `docs/`
4. Commits em **Conventional Commits**, PT-BR ou EN-US (consistência no PR)
5. PR mergeado via **Squash and Merge** após pelo menos 1 aprovação

---

## 🔧 Modelo de trabalho

O squad usa **Spec Driven Development (SDD)** apoiado por agentes de IA:
- **Claude Code (Sonnet 4.6)** via extensão do VS Code para geração de código
- **GitHub Copilot** para alterações pontuais
- **Revisão humana obrigatória** linha a linha antes do merge
- Validação manual + testes automatizados em todo PR
