# 🖥️ Sprint 1 — Revisão: Frontend

> **Issues GitHub:**
> - [#45 — [REVIEW] Telas de Autenticação e Sessão](https://github.com/Tarsomap/retail-game-platform/issues/45)
> - [#46 — [REVIEW] Telas do Plano Operacional e Quiz](https://github.com/Tarsomap/retail-game-platform/issues/46)
> - [#47 — [REVIEW] Tela de Resultados e Ranking](https://github.com/Tarsomap/retail-game-platform/issues/47)
>
> **Área:** Frontend (Next.js)
>
> Leia [`docs/agent/ARCHITECTURE.md`](../../agent/ARCHITECTURE.md) — seção Frontend Pages — antes de começar.

---

## O que o agente gerou

O agente de IA gerou o código completo do frontend, incluindo:
- Telas de `/register`, `/login` e `/dashboard`
- Telas do Plano Operacional `/store/[storeId]/plan` e Quiz `/store/[storeId]/quiz`
- Tela de resultados e ranking `/session/[id]/results`
- Cliente HTTP centralizado com interceptor de token
- Integração WebSocket em tempo real

**Seu trabalho não é implementar — é revisar, testar e melhorar.**

---

## Como começar

```bash
git checkout main && git pull
git checkout -b review/frontend-[modulo]
cd frontend
npm install
cp .env.example .env.local  # preencher NEXT_PUBLIC_API_URL
npm run dev
```

---

## Bloco 1 — Auth e Sessão (issue #45)

### 🧪 O que testar

**Cadastro `/register`:**
- [ ] Formulário renderiza corretamente
- [ ] Validação client-side antes de enviar (campos vazios, e-mail inválido, senhas diferentes)
- [ ] E-mail duplicado mostra erro **abaixo do campo** de e-mail
- [ ] Após cadastro: Facilitador → `/dashboard`, Jogador → `/lobby`

**Login `/login`:**
- [ ] Login com credenciais corretas redireciona conforme papel (role)
- [ ] Credenciais erradas mostram mensagem genérica: *"E-mail ou senha incorretos"*
- [ ] Botão mostra loading durante a requisição
- [ ] Página `/login` redireciona para `/dashboard` se já estiver autenticado

**Segurança dos tokens:**
- [ ] Abrir DevTools → Application → LocalStorage: `accessToken` **não deve aparecer** ali
- [ ] Confirmar que nenhuma senha aparece em `console.log` ou estado do React

**Responsividade:**
- [ ] Testar em tablet (768px) e desktop (1280px)
- [ ] Identificar e corrigir pelo menos **1 problema visual**

---

## Bloco 2 — Plano Operacional e Quiz (issue #46)

### 🧪 O que testar

> 💡 Dica: abra **dois navegadores diferentes** (ou aba normal + aba anônima) para simular dois jogadores ao mesmo tempo.

**Plano Operacional `/store/[storeId]/plan`:**
- [ ] SUPPLY_MANAGER vê e preenche **apenas** a seção de estoque
- [ ] COMMERCIAL_MANAGER vê e preenche **apenas** a seção de pricing
- [ ] OPERATIONAL_MANAGER vê e preenche **apenas** a seção de operadores
- [ ] SERVICE_MANAGER vê e preenche **apenas** a seção de CAPEX
- [ ] Caixa disponível e EBITDA projetado atualizam em tempo real ao alterar decisões
- [ ] Alterações de um jogador aparecem para os outros **sem recarregar a página**
- [ ] STORE_MANAGER tenta confirmar sem quiz respondido — deve **bloquear com mensagem clara**

**Quiz `/store/[storeId]/quiz`:**
- [ ] Perguntas exibidas **sem o gabarito**
- [ ] Jogador seleciona respostas e envia
- [ ] Após envio: mensagem de confirmação e retorno à tela do PO
- [ ] Tentativa de responder novamente — deve **bloquear**

**Responsividade:**
- [ ] Testar em tablet (768px) e desktop (1280px)
- [ ] Identificar e corrigir pelo menos **1 problema visual**

---

## Bloco 3 — Resultados e Ranking (issue #47)

### 🧪 O que testar

- [ ] Ranking das lojas exibido por % EBITDA após cada rodada (maior no topo)
- [ ] Detalhamento completo do PO de cada loja visível ao final da sessão
- [ ] Tela atualiza automaticamente ao receber evento `round:results` via WebSocket
- [ ] Tela exibe resultado final ao receber evento `session:finished`
- [ ] EBITDA negativo exibido corretamente (não quebra o layout)
- [ ] Responsividade em tablet (768px) e desktop (1280px)

---

## Contribuição obrigatória (todos os blocos)

- [ ] Aplicar pelo menos **1 melhoria real** por bloco revisado
- [ ] Nenhum `console.log` deixado no código
- [ ] Nenhum uso de `any` como tipo no TypeScript

---

## Entrega

Abrir um PR por bloco revisado:

| Bloco | Branch | Título do PR |
|---|---|---|
| Auth e Sessão | `review/frontend-auth` | `review(frontend-auth): [o que foi corrigido]` |
| PO e Quiz | `review/frontend-plan` | `review(frontend-plan): [o que foi corrigido]` |
| Resultados | `review/frontend-results` | `review(frontend-results): [o que foi corrigido]` |

- Linkar cada PR à issue correspondente (`Fecha #45`, `Fecha #46`, `Fecha #47`)
- Pelo menos 1 aprovação antes do merge
