# 🏪 StoreLab

> Plataforma web gamificada que digitaliza a dinâmica presencial de gestão de loja de varejo.
> **Residência em Software II — Squad 14 | Universidade Tiradentes**

---

## 📌 Sobre o Projeto

Sistema multiplayer em tempo real onde 4 lojas competem em 3 rodadas tomando decisões operacionais (estoque, pricing, equipe e CAPEX). O motor de cálculo processa CSAT, demanda, quebras, aging, SLA e EBITDA, gerando ranking automático.

### Como funciona em 3 passos
1. **Facilitador** cria uma sessão, configura parâmetros e cadastra perguntas do quiz
2. **Times de 5 jogadores** respondem o quiz e preenchem o Plano Operacional (PO) colaborativamente em tempo real
3. **Motor de cálculo** processa os números ao executar a rodada e atualiza o ranking

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

---

## 📊 Status

| Camada | Estado |
|---|---|
| Backend MVP (10 módulos, 72 testes, 100% cobertura no engine) | ✅ Estabilizado |
| Frontend completo (6 features colocalizadas, zero `api.*` em `app/`) | ✅ Refatorado (Sprint 2) |
| MFA / 2FA TOTP + audit log | ✅ Em produção |
| CRUD completo de Sessions (DELETE + PATCH) | ✅ Entregue |
| CRUD de Stores (DELETE + EDIT) | 🔄 Planejado |
| Features Fase C (eventos aleatórios, timer, PDF, gráficos ao vivo) | ⏳ Aguardando validação com parceiro |

Última atualização: maio/2026.

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
npm run db:seed
npm run start:dev     # API em http://localhost:3001/api
```

### Frontend
```bash
cd frontend
cp .env.example .env.local  # preencher NEXT_PUBLIC_API_URL=http://localhost:3001
npm install
npm run dev           # UI em http://localhost:3000
```

### Credenciais do seed demo
- Facilitador: `facilitador@retail.game` / `senha123`
- Jogadores: `jogador01@retail.game` até `jogador24@retail.game` / `senha123`

### Sessões criadas pelo `db:seed`
1. **Demo Completa** (FINISHED) — 3 rodadas com ranking pronto
2. **Em Andamento** (RECONFIGURATION) — rodada 1 concluída
3. **Aguardando POs** (ROUND_1_CONFIG) — 4 lojas, POs em preenchimento
4. **Sessão Nova** (SETUP) — vazia, sem lojas

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
