# 🏪 Retail Game Platform

> Plataforma web gamificada de simulação de gestão operacional de loja.
> **Residência em Software II — Squad 14 | Universidade Tiradentes**

---

## 📌 Sobre o Projeto

Sistema multiplayer em tempo real onde equipes competem gerenciando lojas virtuais. Cada time toma decisões operacionais — estoque, pricing, equipe e investimentos (CAPEX) — e o sistema calcula automaticamente o impacto financeiro (EBITDA) ao final de cada rodada.

### Como funciona em 3 passos:
1. **Facilitador** cria uma sessão com até 4 lojas e convida os times
2. **Times** preenchem o Plano Operacional colaborativamente em tempo real
3. **Motor de cálculo** processa CSAT, demanda, quebras, aging e EBITDA — gerando um ranking automático

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

### Artefatos de Planejamento (`docs/pdf/`)

| Documento | Descrição |
|---|---|
| [`entrega-parcial.md`](docs/pdf/entrega-parcial.md) | MVP, personas, jornadas, backlog priorizado, critérios de aceitação, especificação técnica completa |
| [`arquitetura-tecnica.md`](docs/pdf/arquitetura-tecnica.md) | Stack, módulos NestJS, schema Prisma, contratos de API REST, eventos WebSocket, deployment |
| [`backlog.md`](docs/pdf/backlog.md) | Requisitos funcionais/não funcionais, épicos, user stories, critérios de aceitação detalhados, riscos |
| [`plano-desenvolvimento-motor.md`](docs/pdf/plano-desenvolvimento-motor.md) | Tasks técnicas por US, interfaces TypeScript, ordem de implementação, checklist de entrega |

---

## 📊 Status do Projeto

| Fase | Status |
|---|---|
| ✅ Planejamento e Requisitos | Concluído |
| ✅ Arquitetura Técnica | Concluído |
| ✅ Backlog Detalhado | Concluído |
| ✅ Motor de Cálculo Especificado | Concluído |
| 🔄 Estrutura do Projeto NestJS | Em andamento |
| ⏳ Implementação do Motor de Cálculo | Próximo |
| ⏳ Interfaces e Tempo Real | Pendente |
| ⏳ Deploy e Testes de Integração | Pendente |

---

## 🚀 Como Começar (Setup local)

> ⚠️ Instruções completas serão adicionadas na Semana 9 (início do desenvolvimento).
> Por enquanto, o repositório contém apenas a documentação de planejamento.

```bash
# Pré-requisitos (quando disponível)
node >= 20 LTS
postgresql >= 15
```

---

## 📐 Estrutura de Pastas (planejada)

```
retail-game-platform/
├── docs/
│   └── pdf/              # Documentação formal (entrega acadêmica)
├── src/
│   ├── auth/             # Registro, login, JWT, guards
│   ├── users/            # Gestão de usuários
│   ├── sessions/         # CRUD de sessões, controle de rodadas
│   ├── stores/           # Lojas, membros, papéis
│   ├── plans/            # Plano Operacional (PO)
│   ├── engine/           # Motor de cálculo: CSAT, demanda, EBITDA
│   ├── results/          # Round Results, ranking, histórico
│   ├── events/           # SLA Events
│   ├── gateway/          # Socket.io gateway (tempo real)
│   ├── seed/             # Dados iniciais: categorias, CAPEX options
│   └── common/           # Guards, interceptors, pipes, DTOs
├── CONTRIBUTING.md       # Guia de contribuição para o squad
└── README.md
```

---

## 👥 Squad 14

Residência em Software II — Universidade Tiradentes
