# 🎮 Sprint 1 — Revisão: Sessões e Lojas

> **Issue GitHub:** [#40 — [REVIEW] Módulo de Sessões e Lojas](https://github.com/Tarsomap/retail-game-platform/issues/40)
> **Módulos:** `backend/src/sessions/` e `backend/src/stores/`
> **Área:** Backend
>
> Leia [`docs/agent/CONTEXT.md`](../../agent/CONTEXT.md) — seções Game Flow e Session Parameters — antes de começar.

---

## O que o agente gerou

O agente de IA gerou o código completo dos módulos `sessions/` e `stores/`, incluindo:
- CRUD de sessões com parâmetros iniciais (caixa, estoque, demanda)
- Criação de lojas com código de acesso
- Entrada de jogadores por papel
- Máquina de estados: `SETUP → ROUND_1 → RECONFIGURATION → ROUND_2 → ROUND_3 → FINISHED`
- Transferência obrigatória de jogadores entre lojas

**Seu trabalho não é implementar — é revisar, testar e melhorar.**

---

## Como começar

```bash
git checkout main && git pull
git checkout -b review/sessions
cd backend && npm run start:dev
```

---

## Checklist de revisão

### 📚 Leitura do código
- [ ] Ler `sessions.service.ts` e entender cada transição de estado
- [ ] Confirmar que não é possível avançar o estado sem todas as lojas confirmadas
- [ ] Confirmar que a transferência de jogadores é obrigatória (1–2 por loja) antes da reconfiguração
- [ ] Confirmar que o limite de 4 lojas por sessão e 5 jogadores por loja está implementado

### 🧪 Testes manuais
- [ ] `POST /sessions` — criar sessão com parâmetros iniciais
- [ ] `POST /sessions/:id/stores` — criar até 4 lojas
- [ ] `POST /stores/:id/join` — entrar em uma loja com um papel
- [ ] Tentar entrar com 6º jogador na mesma loja — deve retornar **erro**
- [ ] `PATCH /sessions/:id/advance` — avançar o estado
- [ ] Tentar avançar sem todas as lojas confirmadas — deve **bloquear**
- [ ] `PATCH /stores/:id/transfer` — transferir jogador entre lojas
- [ ] Tentar acessar sessão de outro facilitador — deve retornar **403**

### ✍️ Contribuição obrigatória
- [ ] Aplicar pelo menos **1 melhoria real** no código
- [ ] Documentar as **6 transições de estado** em um arquivo `docs/squad/sprint-1/revisao-sessao.md` (pode ser um diagrama de texto simples)

---

## Máquina de estados (referência rápida)

```
SETUP
  └── Facilitador cria lojas e define parâmetros
  └── [avançar] → ROUND_1

ROUND_1
  └── Todas as lojas preenchem e confirmam o PO
  └── [avançar] → RECONFIGURATION

RECONFIGURATION
  └── Transferência obrigatória de jogadores
  └── Lojas reconfiguram o PO (sem usar receita de vendas)
  └── [avançar] → ROUND_2

ROUND_2 → ROUND_3 → FINISHED
```

---

## Entrega

- [ ] PR aberto com título: `review(sessions): [o que foi corrigido/melhorado]`
- [ ] PR linkado à issue #40 (`Fecha #40` na descrição)
- [ ] Pelo menos 1 aprovação antes do merge
