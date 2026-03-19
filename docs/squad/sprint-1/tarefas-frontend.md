# 🎨 Sprint 1 — Tarefas: Frontend (Plano Operacional + Resultados)

> **Épico:** Plano Operacional + Resultados e Ranking
> **User Stories:** US-10 a US-16, US-23, US-24, US-25
> **Estimativa total:** 3–4 semanas
>
> Leia [`docs/agent/CONTEXT.md`](../../agent/CONTEXT.md) antes de começar.

---

## Visão geral

O Plano Operacional (PO) é a tela principal do jogo. É onde os 5 gerentes de cada loja preenchem suas decisões **em tempo real e simultaneamente**. Cada gerente vê apenas a sua área de decisão. O Gerente da Loja vê o sumário geral e confirma.

---

## TASK-18 — Layout base do PO (frontend)

**Responsável:** Frontend
**Prioridade:** 🔴 Bloqueante
**Depende de:** TASK-09

### O que fazer

Criar a página `/store/:storeId/plan` com o layout base do PO.

**Estrutura da página:**
- Header: nome da loja + papel do usuário logado + status do PO (RASCUNHO / CONFIRMADO)
- Painel lateral: caixa disponível (grande, em destaque) + EBITDA projetado
- Área central: conteúdo varia conforme o papel do usuário (ver tasks abaixo)
- Footer: botão "Confirmar PO" (apenas Gerente da Loja, desabilitado até todos os campos preenchidos)

**Conexão WebSocket:**
```typescript
// Entrar na sala da loja ao carregar a página
socket.emit('join:store', { storeId })

// Ouvir atualizações do PO
socket.on('plan:updated', (data) => {
  updateCashDisplay(data.cashAvailable)
  updateEbitdaDisplay(data.projectedEbitda)
})
```

### Critérios de aceite
- [ ] Página carrega corretamente para cada papel
- [ ] WebSocket conectado ao carregar
- [ ] Caixa e EBITDA atualizam em tempo real sem recarregar
- [ ] Papel do usuário determina qual seção é exibida

---

## TASK-19 — Seção de estoque (Gerente Abastecimento)

**Responsável:** Frontend
**Prioridade:** 🔴 Bloqueante
**Depende de:** TASK-18

### O que fazer

Renderizar a seção de estoque para o papel `SUPPLY_MANAGER`.

**Tabela com 4 linhas (uma por categoria):**

| Categoria | Custo Unit. | Estoque Disponível | Comprar (unidades) | Total (R$) |
|---|---|---|---|---|
| Perecíveis | R$ 8,00 | [param facilitador] | [input] | calculado |
| Mercearia | R$ 5,00 | [param facilitador] | [input] | calculado |
| Eletro | R$ 120,00 | [param facilitador] | [input] | calculado |
| Hipel | R$ 45,00 | [param facilitador] | [input] | calculado |

**Comportamentos:**
- Input aceita apenas inteiros positivos
- `Total (R$) = quantidade × custo unitário` — calculado automaticamente no frontend
- Input maior que estoque disponível: borda vermelha + mensagem de erro
- A cada mudança: emitir via WebSocket para atualizar caixa de todos na loja

```typescript
onChange: (categoryId, quantity) => {
  // valida localmente
  if (quantity > availableStock) return showError()
  // emite para o backend
  socket.emit('plan:decision', { planId, field: 'stockPurchased', categoryId, value: quantity })
}
```

### Critérios de aceite
- [ ] Input em unidades (não em R$)
- [ ] Validação de estoque disponível funcionando
- [ ] Total em R$ calculado e exibido em tempo real
- [ ] Emit WebSocket a cada alteração válida
- [ ] Campo com valor acima do disponível bloqueado visualmente

---

## TASK-20 — Seção de precificação (Gerente Comercial)

**Responsável:** Frontend
**Prioridade:** 🔴 Bloqueante
**Depende de:** TASK-18

### O que fazer

Renderizar a seção de pricing para o papel `COMMERCIAL_MANAGER`.

**Tabela com 4 linhas:**

| Categoria | Custo Unit. | Margem (%) | Preço Final |
|---|---|---|---|
| Perecíveis | R$ 8,00 | [slider 0–80%] | calculado |
| ... | | | |

**Comportamentos:**
- Slider de 0% a 80% + input numérico sincronizado
- `Preço Final = custo_unit × (1 + margem%)` — calculado no frontend
- Indicador visual: margem > 50% exibe aviso ⚠ "Risco de baixa demanda"
- Emit WebSocket a cada alteração

### Critérios de aceite
- [ ] Slider e input numérico sincronizados
- [ ] Preço final calculado e exibido
- [ ] Aviso visual para margem > 50%
- [ ] Emit WebSocket a cada alteração

---

## TASK-21 — Seção de equipe (Gerente Operacional)

**Responsável:** Frontend
**Prioridade:** 🔴 Bloqueante
**Depende de:** TASK-18

### O que fazer

Renderizar a seção de equipe para `OPERATIONAL_MANAGER`.

**Campos:**
- Operadores de Caixa (0–10) — custo: R$ 2.000 cada
- Operadores de Serviço (0–5) — custo: R$ 2.500 cada
- Exibir: custo total da folha + projeção de CSAT (fórmula simplificada, sem quiz)

**Projeção de CSAT no frontend:**
```typescript
// Mostra projeção parcial (quiz ainda não respondido)
const csatProjection = (cashierOps / 10) * 100  // em %
```

### Critérios de aceite
- [ ] Inputs numéricos com limites (0–10 caixa, 0–5 serviço)
- [ ] Custo da folha calculado e exibido
- [ ] Projeção de CSAT exibida
- [ ] Emit WebSocket a cada alteração

---

## TASK-22 — Seção de CAPEX (Gerente Serviços)

**Responsável:** Frontend
**Prioridade:** 🔴 Bloqueante
**Depende de:** TASK-18

### O que fazer

Renderizar a seção de CAPEX para `SERVICE_MANAGER`.

**Lista de 6 cards de CAPEX, cada um com:**
- Nome e descrição
- Custo de implementação
- Licença mensal adicional
- Risco se não implementado (ex: "15% de chance de ataque cibernético")
- Checkbox para selecionar

**Comportamentos:**
- Selecionar um CAPEX desconta o custo do caixa disponível
- Total de CAPEX selecionados exibido no rodapé da seção
- Emit WebSocket a cada toggle

### Critérios de aceite
- [ ] 6 cards de CAPEX renderizados com informações do seed
- [ ] Seleção/desseleção atualiza o caixa em tempo real
- [ ] Emit WebSocket a cada toggle

---

## TASK-23 — Sumário e confirmação do PO (Gerente da Loja)

**Responsável:** Frontend
**Prioridade:** 🔴 Bloqueante
**Depende de:** TASK-19, TASK-20, TASK-21, TASK-22

### O que fazer

Renderizar o sumário para `STORE_MANAGER`.

**Exibir:**
- Caixa disponível (com semaforo: verde > R$50k, amarelo R$20–50k, vermelho < R$20k)
- EBITDA projetado (com aviso se negativo)
- Checklist de confirmação: estoque ✔ | pricing ✔ | equipe ✔ | CAPEX ✔
- Botão "Confirmar PO" — ativo só quando checklist 100% completo

**Ao confirmar:**
```typescript
await api.post(`/plans/${planId}/confirm`)
// bloqueia todos os inputs da loja
// notifica o facilitador via WebSocket
```

### Critérios de aceite
- [ ] Semáforo de caixa funcionando
- [ ] EBITDA projetado com aviso se negativo
- [ ] Botão de confirmar só ativo com checklist completo
- [ ] Após confirmar, todos os inputs são bloqueados
- [ ] Notificação chega ao facilitador

---

## TASK-24 — Tela de resultados e ranking (frontend)

**Responsável:** Frontend
**Prioridade:** 🔴 Bloqueante
**Depende de:** TASK-17

### O que fazer

Criar a tela de resultados exibida após cada rodada.

**Tabela de ranking:**
| # | Loja | EBITDA (R$) | % EBITDA | Demand Share | Δ vs rodada anterior |
|---|---|---|---|---|---|
| 🥇 | Loja A | R$ 45.000 | 18% | 32% | +3% |
| ...

**Cards por loja (breakdown):**
- Receita Bruta
- Impostos
- Custo de Venda
- Quebras + Aging
- Custos Fixos (folha + manutenção + licenças)
- EBITDA final

**Comportamentos:**
- Atualiza via WebSocket ao receber `round:results`
- Exibe indicação de melhora/piora vs. rodada anterior (↑/↓)

### Critérios de aceite
- [ ] Ranking ordenado por % EBITDA
- [ ] Breakdown completo visível por loja
- [ ] Atualiza via WebSocket sem recarregar
- [ ] Comparação com rodada anterior exibida

---

## Ordem de execução sugerida

```
TASK-18 (layout base)
    ├── TASK-19 (estoque)
    ├── TASK-20 (pricing)
    ├── TASK-21 (equipe)
    ├── TASK-22 (CAPEX)
    └── TASK-23 (sumário + confirmação)

TASK-24 (resultados) ── depende do motor estar pronto
```
