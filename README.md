# 🏪 Retail Game Platform

> Plataforma web gamificada de simulação de gestão operacional de loja.
> **Residência em Software II — Squad 14 | Universidade Tiradentes**

---

## 📌 Sobre o Projeto

Sistema multiplayer em tempo real onde equipes competem gerenciando lojas virtuais. Cada time toma decisões operacionais — estoque, pricing, equipe e investimentos (CAPEX) — e o sistema calcula automaticamente o impacto financeiro (EBITDA) ao final de cada rodada.

### Como funciona em 3 passos:
1. **Facilitador** cria uma sessão com até 4 lojas, define parâmetros e cadastra as perguntas do quiz
2. **Times** respondem o quiz e preenchem o Plano Operacional colaborativamente em tempo real
3. **Motor de cálculo** processa CSAT (operadores + quiz), demanda, quebras, aging e EBITDA — gerando um ranking automático

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Backend | NestJS 10.x + TypeScript 5.x |
| ORM | Prisma 5.x |
| Banco de Dados | PostgreSQL 15+ |
| Tempo Real | Socket.io 4.x |
| Frontend | Next.js 14.x |
| Estilização | Tailwind CSS + shadcn/ui |
| Autenticação | JWT + Refresh Token |
| Deploy | Railway / Render |

---

## 📁 Documentação

### Para o agente de IA (`docs/agent/`)
Documentos técnicos usados como contexto de desenvolvimento:

| Documento | Descrição |
|---|---|
| [`docs/agent/CONTEXT.md`](docs/agent/CONTEXT.md) | Domínio do problema, fluxo do jogo, regras de negócio e convenções. **Leia primeiro.** |
| [`docs/agent/ARCHITECTURE.md`](docs/agent/ARCHITECTURE.md) | Stack, estrutura de pastas, schema Prisma, contratos REST, eventos WebSocket |
| [`docs/agent/BACKLOG.md`](docs/agent/BACKLOG.md) | Requisitos funcionais/não funcionais, épicos e user stories priorizados |

### Para o squad (`docs/squad/`)
Guias de trabalho em equipe e tarefas da sprint:

| Documento | Descrição |
|---|---|
| [`docs/squad/00-guia-do-projeto.md`](docs/squad/00-guia-do-projeto.md) | O que é o jogo, como funciona, glossário. **Leia antes de tudo.** |
| [`docs/squad/01-como-trabalhamos.md`](docs/squad/01-como-trabalhamos.md) | Fluxo Git, branches, commits, Pull Requests |
| [`docs/squad/sprint-1/tarefas-auth.md`](docs/squad/sprint-1/tarefas-auth.md) | Tarefas de autenticação (TASK-01 a TASK-06) |
| [`docs/squad/sprint-1/tarefas-sessao.md`](docs/squad/sprint-1/tarefas-sessao.md) | Tarefas de sessão e lojas (TASK-07 a TASK-11) |
| [`docs/squad/sprint-1/tarefas-motor.md`](docs/squad/sprint-1/tarefas-motor.md) | Tarefas do motor de cálculo (TASK-12 a TASK-17) |
| [`docs/squad/sprint-1/tarefas-frontend.md`](docs/squad/sprint-1/tarefas-frontend.md) | Tarefas das telas (TASK-18 a TASK-24) |

---

## 📊 Status do Projeto

| Fase | Status |
|---|---|
| ✅ Planejamento e Requisitos | Concluído |
| ✅ Arquitetura Técnica | Concluído |
| ✅ Backlog Detalhado | Concluído |
| ✅ Documentação do Squad | Concluído |
| ✅ Issues e Kanban (GitHub) | Concluído |
| 🔄 Implementação — Sprint 1 | Em andamento |
| ⏳ Deploy e Testes de Integração | Pendente |

---

## 🚀 Como Começar (Setup local)

> ⚠️ Instruções completas de setup serão adicionadas ao iniciar o desenvolvimento.

```bash
# Pré-requisitos
node >= 20 LTS
postgresql >= 15

# Backend
cd backend
npm install
npx prisma migrate dev
npm run seed
npm run start:dev

# Frontend
cd frontend
npm install
npm run dev
```

---

## 📂 Estrutura de Pastas

```
retail-game-platform/
├── backend/
│   ├── src/
│   │   ├── auth/          # Registro, login, JWT, guards
│   │   ├── users/         # Gestão de usuários
│   │   ├── sessions/      # CRUD de sessões, controle de rodadas
│   │   ├── stores/        # Lojas, membros, papéis
│   │   ├── plans/         # Plano Operacional (PO)
│   │   ├── quiz/          # Perguntas e respostas do quiz
│   │   ├── engine/        # Motor de cálculo: CSAT, demanda, EBITDA
│   │   ├── results/       # Round Results, ranking, histórico
│   │   ├── gateway/       # Socket.io gateway (tempo real)
│   │   ├── seed/          # Dados iniciais: categorias, CAPEX options
│   │   └── common/        # Guards, interceptors, pipes, DTOs
│   ├── prisma/
│   │   └── schema.prisma
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/           # Next.js App Router (páginas)
│   │   ├── components/    # Componentes UI (shadcn/ui)
│   │   ├── hooks/         # Custom hooks (useSocket, usePlan, useQuiz...)
│   │   ├── lib/           # API client, socket client, utils
│   │   └── stores/        # Zustand global state
│   └── package.json
├── docs/
│   ├── agent/         # Contexto técnico para o agente de IA
│   └── squad/         # Guias e tarefas para o time
├── CONTRIBUTING.md
└── README.md
```

---

## 👥 Squad 14

Residência em Software II — Universidade Tiradentes
