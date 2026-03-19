# Entrega Parcial — MVP
**Residência em Software II | Squad 14**

**EMPRESA:** Varejo Simulado (Simulação de Gestão de Loja)  
**SQUAD:** 14  
**DATA DE ENTREGA:** 19 de março de 2026  
**STATUS:** Entrega Parcial (Planejamento + Arquitetura + Backlog Detalhado)

---

## 1. Descrição do MVP

### 1.1 Problema
Gerentes de loja enfrentam decisões complexas de estoque, pricing, equipe e CAPEX sem visibilidade do impacto financeiro em tempo real, dificultando o desenvolvimento de competências de gestão operacional.

### 1.2 Solução
Plataforma gamificada de simulação de gestão de loja onde equipes tomam decisões operacionais reais (estoque, pricing, CAPEX, equipe) e visualizam em tempo real o impacto no EBITDA, competindo entre si por rodadas.

### 1.3 Personas

| Persona | Perfil | Objetivo | Dor Principal |
|---|---|---|---|
| **Gerente de Loja** | Lidera o time, tem a palavra final nas decisões | Maximizar o % EBITDA ao final das rodadas | Não consegue visualizar o impacto conjunto de todas as decisões da equipe |
| **Gerente de Área** (Abastecimento, Comercial, Operacional, Serviços) | Especialista funcional dentro da loja | Otimizar sua área sem prejudicar o resultado global | Tomar decisões isoladas sem ver o efeito sistêmico |
| **Facilitador / Admin** | Configura e conduz a dinâmica (professor, gestor) | Criar sessões, definir parâmetros e acompanhar resultados de todas as lojas | Falta de ferramenta centralizada para gerenciar a simulação |

### 1.4 Jornadas do Usuário

#### Jornada 1 — Facilitador (configura a sessão)
1. Cria uma nova sessão de jogo
2. Define parâmetros: caixa inicial (R$ 700k), estoque disponível por categoria, volume esperado de vendas
3. Cria as 4 lojas e gera convites/códigos de acesso para os times
4. Inicia a 1ª Configuração e libera o Plano Operacional (PO) para preenchimento

#### Jornada 2 — Time da Loja (1ª Configuração)
1. Acessa a loja com seu papel (Gerente, Abastecimento, Comercial, Operacional, Serviços)
2. Preenche o PO colaborativamente: estoque por categoria, margem de pricing, operadores, CAPEXs
3. Visualiza em tempo real o caixa consumido e o EBITDA projetado
4. Gerente da loja confirma a configuração

#### Jornada 3 — Rodadas de Venda
1. Facilitador executa a rodada
2. Sistema distribui a demanda automaticamente com base em Preço da Cesta + Disponibilidade + CSAT
3. Sistema aplica eventos de SLA (falhas) caso CAPEXs relevantes não tenham sido implementados
4. Resultados parciais são exibidos em ranking para todas as lojas em tempo real

#### Jornada 4 — 2ª Configuração e Encerramento
1. Times ajustam estoque, margem e equipe com base nos resultados da 1ª rodada
2. Movimentação de até 2 jogadores entre lojas é permitida
3. Execução das rodadas 2 e 3
4. Resultado final com ranking por % EBITDA e breakdown completo do PO

---

## 2. Planejamento do Desenvolvimento

### 2.1 Backlog do Produto Priorizado

| ID | Épico | User Story | Prioridade |
|---|---|---|---|
| US-01 | Autenticação | Como facilitador, quero criar minha conta para acessar o sistema | 🔴 MVP |
| US-02 | Autenticação | Como usuário, quero fazer login com e-mail e senha | 🔴 MVP |
| US-03 | Autenticação | Como facilitador, quero convidar jogadores via link/código | 🔴 MVP |
| US-04 | Autenticação | Como jogador, quero entrar em uma sessão e escolher meu papel | 🔴 MVP |
| US-05 | Gestão de Sessão | Como facilitador, quero criar uma sessão definindo parâmetros iniciais | 🔴 MVP |
| US-06 | Gestão de Sessão | Como facilitador, quero criar as 4 lojas dentro de uma sessão | 🔴 MVP |
| US-07 | Gestão de Sessão | Como facilitador, quero iniciar e avançar as rodadas de venda | 🔴 MVP |
| US-08 | Gestão de Sessão | Como facilitador, quero visualizar o status de todas as lojas em tempo real | 🔴 MVP |
| US-09 | Gestão de Sessão | Como facilitador, quero encerrar a sessão e exibir o resultado final com ranking | 🔴 MVP |
| US-10 | Plano Operacional | Como gerente de abastecimento, quero definir o estoque comprado por categoria | 🔴 MVP |
| US-11 | Plano Operacional | Como gerente comercial, quero definir a margem de pricing por categoria | 🔴 MVP |
| US-12 | Plano Operacional | Como gerente operacional, quero definir a quantidade de operadores de caixa e serviço | 🔴 MVP |
| US-13 | Plano Operacional | Como gerente de serviços, quero selecionar quais CAPEXs serão implementados | 🔴 MVP |
| US-14 | Plano Operacional | Como gerente da loja, quero ver o caixa disponível atualizado em tempo real | 🔴 MVP |
| US-15 | Plano Operacional | Como gerente da loja, quero ver o EBITDA projetado em tempo real | 🔴 MVP |
| US-16 | Plano Operacional | Como gerente da loja, quero confirmar a configuração para liberar a rodada | 🔴 MVP |
| US-17 | Motor de Cálculo | Como sistema, preciso calcular o CSAT com base em operadores e acertos no questionário | 🔴 MVP |
| US-18 | Motor de Cálculo | Como sistema, preciso distribuir a demanda entre lojas com base em Preço, Disponibilidade e CSAT | 🔴 MVP |
| US-19 | Motor de Cálculo | Como sistema, preciso calcular Quebras e Aging sobre o estoque não vendido | 🔴 MVP |
| US-20 | Motor de Cálculo | Como sistema, preciso calcular impostos, folha, manutenção e licenças para chegar no EBITDA | 🔴 MVP |
| US-21 | Motor de Cálculo | Como sistema, preciso aplicar eventos de SLA por CAPEX não implementado | 🔴 MVP |
| US-22 | Motor de Cálculo | Como sistema, preciso processar movimentação de até 2 jogadores entre lojas | 🔴 MVP |
| US-23 | Resultados | Como jogador, quero ver os resultados parciais da minha loja após cada rodada | 🔴 MVP |
| US-24 | Resultados | Como jogador, quero ver o ranking comparativo entre todas as lojas por % EBITDA | 🔴 MVP |
| US-25 | Resultados | Como facilitador, quero ver o breakdown completo do PO de cada loja ao final | 🔴 MVP |
| US-26 | Diferenciais | Como gerente, quero simular cenários de pricing antes de confirmar o PO | 🟡 Diferencial |
| US-27 | Diferenciais | Como facilitador, quero configurar eventos aleatórios com probabilidade customizável | 🟡 Diferencial |
| US-28 | Diferenciais | Como jogador, quero receber alertas de aging elevado ou caixa crítico | 🟡 Diferencial |
| US-29 | Diferenciais | Como facilitador, quero exportar o resultado final em PDF/Excel | 🟡 Diferencial |
| US-30 | Diferenciais | Como facilitador, quero acessar o histórico de sessões anteriores | 🟡 Diferencial |

### 2.2 Critérios de Aceitação Detalhados (MVP)

#### **US-01: Facilitador criar conta**
- [ ] Formulário com campos: nome, e-mail, senha (min 8 caracteres)
- [ ] Validação de e-mail único (erro se duplicado)
- [ ] Senha armazenada com hash bcrypt (nunca plain text)
- [ ] Redirecionamento para dashboard após sucesso
- [ ] Mensagem de erro clara em caso de falha

#### **US-02: Usuário fazer login**
- [ ] Login com e-mail + senha
- [ ] JWT gerado válido por 24h, Refresh Token válido por 7 dias
- [ ] Redirect para `/dashboard` se facilitador, `/lobby` se jogador
- [ ] Mensagem de erro se credenciais inválidas
- [ ] Botão "Lembrar-me" opcional (14 dias)

#### **US-03: Facilitador convidar jogadores**
- [ ] Gera código único de 6 caracteres (ex: ABC123) por sessão
- [ ] Link shareable: `https://game.com/join?code=ABC123`
- [ ] Exibe QR code com o link
- [ ] Contador de jogadores já inscritos
- [ ] Opção de revogar código e gerar novo

#### **US-04: Jogador entrar em sessão**
- [ ] Acessa via link/código ou manualmente
- [ ] Exibe nome da sessão e facilitador
- [ ] Dropdown para escolher papel (STORE_MANAGER, SUPPLY_MANAGER, etc.)
- [ ] Validação: não pode ter 2 pessoas com mesmo papel na mesma loja
- [ ] Após confirmar, redireciona para lobby da loja

#### **US-05: Facilitador criar sessão**
- [ ] Formulário: nome da sessão, caixa inicial (padrão R$ 700k), estoque por categoria, demanda esperada
- [ ] Seed de categorias carregado (PERECIVEIS, MERCEARIA, ELETRO, HIPEL)
- [ ] Validação: caixa ≥ R$ 500k, demanda ≥ 100 unidades
- [ ] Status inicial: SETUP
- [ ] Redirect para página de gerenciamento da sessão

#### **US-06: Facilitador criar 4 lojas**
- [ ] Interface para nomear as 4 lojas (ex: "Loja Centro", "Loja Norte")
- [ ] Atribuição automática de IDs
- [ ] Exibição de status de cada loja (jogadores, PO confirmado)
- [ ] Botão para gerar novo código por loja se necessário

#### **US-07: Facilitador iniciar e avançar rodadas**
- [ ] Botão "Iniciar Rodada 1" apenas quando todas as lojas confirmaram PO
- [ ] Progresso visível: ROUND_1 → RECONFIG → ROUND_2 → ROUND_3 → FINISHED
- [ ] Avançar apenas após 10 segundos (para UI update)
- [ ] Botão "Pausar" disponível durante execução

#### **US-08: Facilitador visualizar status em tempo real**
- [ ] Dashboard mostra 4 cards de loja
- [ ] Por loja: nome, gerente, % PO confirmado, EBITDA projetado, ranking atual
- [ ] Atualiza a cada 2 segundos via WebSocket
- [ ] Indicadores visuais: cores (verde ✓, amarelo ⚠, vermelho ✗)

#### **US-09: Facilitador encerrar sessão**
- [ ] Exibe ranking final por % EBITDA (maior para menor)
- [ ] Breakdown por loja: receita, custos, EBITDA, % EBITDA
- [ ] Botão "Exportar" (PDF ou Excel)
- [ ] Botão "Iniciar Nova Sessão"
- [ ] Status muda para FINISHED

#### **US-10: Gerente abastecimento definir estoque**
- [ ] Tabela: [Categoria | Estoque Disponível | Comprado | Saldo]
- [ ] Inputs numéricos para compra por categoria
- [ ] Cálculo automático: "Caixa Consumido = Σ(Comprado × Unit_Cost)"
- [ ] Validação: Comprado ≤ Saldo disponível
- [ ] Atualização em tempo real no caixa do Gerente

#### **US-11: Gerente comercial definir margem**
- [ ] Tabela: [Categoria | Unit Cost | Margem Atual (%) | Novo Preço]
- [ ] Slider ou input para margem (0-80%)
- [ ] Cálculo automático: Preço = Unit_Cost × (1 + Margem%)
- [ ] Indicador: "Risco de baixa demanda se margem > 50%"
- [ ] Atualização em tempo real

#### **US-12: Gerente operacional definir operadores**
- [ ] Inputs: Operadores de Caixa (0-10), Operadores de Serviço (0-5)
- [ ] Cálculo de custo: salário × quantidade
- [ ] Tabela de custo por operador (seed)
- [ ] Indicador: CSAT = (operadores / 10) × quiz_score (projeção)

#### **US-13: Gerente serviços selecionar CAPEXs**
- [ ] Checkboxes por CAPEX (SECURITY, FREEZER, NETWORK, SITE, SELF_CHECKOUT, AUTOMATION)
- [ ] Por cada: nome, custo, impacto SLA, licença mensal
- [ ] Total de CAPEX selected exibido
- [ ] Impacto no caixa calculado em tempo real

#### **US-14: Gerente loja ver caixa disponível**
- [ ] Display grande: "Caixa Disponível: R$ XXX.XXX"
- [ ] Breakdown em card: Inicial - Estoque - CAPEX - Outros = Saldo
- [ ] Indicador visual: verde se > R$ 50k, amarelo se R$ 20-50k, vermelho se < R$ 20k
- [ ] Atualiza a cada decisão

#### **US-15: Gerente loja ver EBITDA projetado**
- [ ] Display: "EBITDA Projetado: R$ XXX.XXX (X.XX%)"
- [ ] Breakdown: Receita Esperada - Custos Fixos - Custos Variáveis
- [ ] Aviso: se EBITDA < 0, mensagem "Decisões insustentáveis"
- [ ] Atualiza a cada decisão

#### **US-16: Gerente loja confirmar configuração**
- [ ] Checklist antes de confirmar: estoque ✓, pricing ✓, operadores ✓, CAPEXs ✓
- [ ] Botão desabilitado até todos os campos preenchidos
- [ ] Após confirmar, status muda para "CONFIRMADO" e bloqueado
- [ ] Notificação para facilitador

#### **US-17: Sistema calcular CSAT**
- [ ] Fórmula: CSAT = (operadores_contratados / 10) × (quiz_score_percentage / 100)
- [ ] Quiz: 10 perguntas sobre gestão, resposta correta = +1 ponto
- [ ] Resultado armazenado em QUIZ_ANSWER
- [ ] Exemplo: 8 operadores + 80% quiz = CSAT = 0.64 ou 64%

#### **US-18: Sistema distribuir demanda**
- [ ] Calcula scoring para cada loja por rodada:
  - Disponibilidade = stock_disponível / demanda_esperada
  - Preço = (preço_competitivo / preço_loja)
  - CSAT = (CSAT_score / 100)
- [ ] Ranking: 4 pontos (1º lugar), 3 pontos (2º), 2 pontos (3º), 1 ponto (4º)
- [ ] Demand Share = pontos_loja / soma_pontos_todas
- [ ] Demanda = Demand_Share × Total_Demanda_Sessão

#### **US-19: Sistema calcular Quebras e Aging**
- [ ] Quebras = estoque_não_vendido × breakage_rate (seed por categoria)
- [ ] Aging = estoque_não_vendido × aging_rate (seed por categoria)
- [ ] Reduz lucro líquido por categoria
- [ ] Registrado em PO_CATEGORY_DECISION

#### **US-20: Sistema calcular EBITDA**
- [ ] Fórmula completa:
  ```
  Receita Bruta = Demand × Preço_Unitário
  Impostos = Receita × (7.65% ICMS + 1.65% PIS/COFINS)
  Receita Líquida = Receita Bruta - Impostos
  Custo Venda = Demand × Unit_Cost
  Margem Bruta = Receita Líquida - Custo Venda
  Quebras/Aging = (stock_residual × breakage/aging_rate)
  Margem Líquida = Margem Bruta - Quebras/Aging
  Folha = (caixa_operators + service_operators) × salary
  Manutenção = R$ 5k (fixo)
  Licenças = Σ(CAPEX × monthly_license)
  Juros = max(0, caixa_excedente × 1% a.m.)
  SLA = demanda_perdida × preço_médio (se CAPEX não implementado)
  EBITDA = Margem Líquida - Folha - Manutenção - Licenças - Juros - SLA
  % EBITDA = EBITDA / Receita Bruta
  ```
- [ ] Armazenado em ROUND_RESULT

#### **US-21: Sistema aplicar eventos SLA**
- [ ] Se SECURITY não contratado: 15% sorteio de falha → 2% receita perdida
- [ ] Se FREEZER não contratado: 10% sorteio → aging +30%
- [ ] Se NETWORK não contratado: 5% sorteio → 1 hora downtime
- [ ] Eventos registrados em SLA_EVENT

#### **US-22: Sistema processar transferência de jogadores**
- [ ] Máximo 2 jogadores transferência entre lojas na reconfiguração
- [ ] Valida: não pode tirar gerente de loja
- [ ] Registrado em PLAYER_TRANSFER
- [ ] UI: dropdown de origem/destino

#### **US-23: Jogador ver resultados parciais**
- [ ] Exibe após cada rodada: EBITDA, % EBITDA, Demand_Share, CSAT_Score
- [ ] Comparação com round anterior: ↑ / ↓ / → indicador
- [ ] Breakdown: Receita | Custos | Lucro em cards separados
- [ ] Atualiza via WebSocket em tempo real

#### **US-24: Jogador ver ranking**
- [ ] Tabela: [Ranking | Loja | EBITDA | % EBITDA | Demand_Share]
- [ ] Ordenado por EBITDA descendente
- [ ] Cor: 1º lugar 🥇, 2º lugar 🥈, 3º lugar 🥉, 4º lugar
- [ ] Atualiza a cada rodada

#### **US-25: Facilitador ver breakdown completo**
- [ ] Por loja: todas as POs, todos os CAPEX, resultado por rodada
- [ ] Consolidação: média de 3 rodadas
- [ ] Exportável em PDF (relatório formal)

---

## 3. Especificação Técnica

### 3.1 Stack de Desenvolvimento

| Camada | Tecnologia | Justificativa |
|---|---|---|
| **Back-end Framework** | NestJS (Node.js) | Estrutura modular e opinada, facilita organização por domínio e uso com agentes de IA |
| **Banco de Dados** | PostgreSQL | O Plano Operacional é 100% relacional — sessões, rodadas, decisões e resultados exigem ACID |
| **ORM** | Prisma | Schema declarativo, migrations automáticas, excelente integração com TypeScript |
| **Tempo Real** | Socket.io | Rodadas simultâneas entre times exigem WebSocket para experiência fluida |
| **Front-end** | Next.js + Tailwind CSS + shadcn/ui | Ecossistema React, SSR, componentes prontos para dashboards |
| **Autenticação** | JWT + Refresh Token | Padrão seguro e stateless, adequado para múltiplos usuários simultâneos |
| **Deploy** | Railway ou Render | Free tier generoso, deploy via GitHub Actions, ideal para MVP |

### 3.2 Estrutura do Banco de Dados

```
USER
- id, name, email (unique), password_hash, role (FACILITATOR|PLAYER), created_at

SESSION
- id, name, facilitator_id (FK→USER), status, initial_cash, created_at
- status: SETUP | ROUND_1 | RECONFIGURATION | ROUND_2 | ROUND_3 | FINISHED

SESSION_CATEGORY_CONFIG
- id, session_id (FK→SESSION), category_id (FK→CATEGORY)
- available_stock, expected_demand

CATEGORY (seed)
- id, name (PERECIVEIS|MERCEARIA|ELETRO|HIPEL)
- unit_cost, tax_rate, breakage_rate, aging_rate

STORE
- id, session_id (FK→SESSION), name, created_at

STORE_MEMBER
- id, store_id (FK→STORE), user_id (FK→USER)
- role: STORE_MANAGER | SUPPLY_MANAGER | COMMERCIAL_MANAGER | OPERATIONAL_MANAGER | SERVICE_MANAGER

OPERATIONAL_PLAN
- id, store_id (FK→STORE), round (1|2|3), configuration (1|2)
- status (DRAFT|CONFIRMED), cash_used, projected_ebitda
- cashier_operators, service_operators, payroll_cost
- confirmed_at

PO_CATEGORY_DECISION
- id, plan_id (FK→OPERATIONAL_PLAN), category_id (FK→CATEGORY)
- stock_purchased, price_margin
- stock_sold, revenue, tax_amount, breakage_amount, aging_amount (calculados)

CAPEX_OPTION (seed)
- id, name, type (SECURITY|FREEZER|NETWORK|SITE|SELF_CHECKOUT|AUTOMATION)
- cost, monthly_license_delta, sla_impact_days

PO_CAPEX_DECISION
- id, plan_id (FK→OPERATIONAL_PLAN), capex_id (FK→CAPEX_OPTION)
- implemented (boolean)

QUIZ_ANSWER
- id, store_id (FK→STORE), round
- total_questions, correct_answers, score_percentage

ROUND_RESULT
- id, session_id (FK→SESSION), store_id (FK→STORE), round
- demand_score, demand_share, csat_score, availability_score, basket_price_score
- gross_revenue, net_revenue, total_costs, ebitda, ebitda_percentage

SLA_EVENT
- id, session_id (FK→SESSION), store_id (FK→STORE), round
- capex_type, days_impacted, revenue_lost

PLAYER_TRANSFER
- id, session_id (FK→SESSION), user_id (FK→USER)
- from_store_id (FK→STORE), to_store_id (FK→STORE), transferred_at
```

### 3.3 Tabela de Valores de Seed (Constantes de Negócio)

```
CATEGORY:
┌───────────┬───────────┬──────────┬──────────────┐
│ Name      │ Unit Cost │ Tax Rate │ Breakage %   │
├───────────┼───────────┼──────────┼──────────────┤
│ PERECIVEIS│ R$ 8      │ 7.65%    │ 3% (aging 2%)│
│ MERCEARIA │ R$ 5      │ 7.65%    │ 1% (aging 0%)│
│ ELETRO    │ R$ 120    │ 7.65%    │ 0.2% (aging 5%)|
│ HIPEL     │ R$ 45     │ 7.65%    │ 0.5% (aging 1%)|
└───────────┴───────────┴──────────┴──────────────┘

CAPEX_OPTION:
┌──────────────────┬──────────┬────────────┬──────────────┐
│ Type             │ Cost     │ Monthly Fee│ SLA % Risk   │
├──────────────────┼──────────┼────────────┼──────────────┤
│ SECURITY         │ R$ 30k   │ R$ 2k      │ 15% (2% rev) │
│ FREEZER          │ R$ 80k   │ R$ 1.5k    │ 10% (aging)  │
│ NETWORK          │ R$ 50k   │ R$ 3k      │ 5% (downtime)│
│ SITE             │ R$ 100k  │ R$ 5k      │ N/A          │
│ SELF_CHECKOUT    │ R$ 60k   │ R$ 2.5k    │ N/A          │
│ AUTOMATION       │ R$ 40k   │ R$ 1k      │ N/A          │
└──────────────────┴──────────┴────────────┴──────────────┘

OPERATIONAL_COSTS:
┌────────────────────┬─────────────┐
│ Item               │ Value       │
├────────────────────┼─────────────┤
│ Manutenção Mensal  │ R$ 5.000    │
│ Salário Caixa      │ R$ 2.000/mês│
│ Salário Serviço    │ R$ 2.500/mês│
│ Juros Excedente    │ 1.0% a.m.   │
│ Base de Caixa Init │ R$ 700.000  │
└────────────────────┴─────────────┘
```

### 3.4 Lógica de Funcionamento da Solução

#### Fluxo Macro

```
[FACILITADOR CRIA SESSÃO]
 → Configura parâmetros (caixa, estoque, demanda por categoria)
 → Cria 4 lojas e gera códigos de acesso
 → Jogadores entram e escolhem papéis

[1ª CONFIGURAÇÃO]
 → Times preenchem o PO colaborativamente em tempo real
 → Sistema calcula caixa consumido e EBITDA projetado a cada decisão
 → Gerente confirma configuração
 → Facilitador aguarda todas as lojas confirmarem

[RODADA DE VENDA]
 → Motor verifica eventos SLA (CAPEX não feito → sorteio de falha)
 → Motor calcula indicadores: Disponibilidade, Preço da Cesta, CSAT
 → Motor distribui demanda proporcionalmente (ranking 1-4 por indicador)
 → Motor calcula resultado financeiro:
    Receita Bruta → (-) Impostos → Receita Líquida
    → (-) Custo de Venda → Margem Bruta
    → (-) Quebras e Aging → Margem Líquida
    → (-) Folha, Manutenção, Licenças, Juros, SLA → EBITDA
 → Persiste ROUND_RESULT
 → Exibe ranking em tempo real para todos

[RECONFIGURAÇÃO]
 → Movimentação de até 2 jogadores por loja
 → 2ª Configuração com caixa/CAPEX sobrante
 → Rodadas 2 e 3 repetem o fluxo acima

[RESULTADO FINAL]
 → Consolida 3 rodadas por loja
 → Ranking final por % EBITDA
 → Breakdown completo do PO disponível
```

#### Fórmulas de Negócio

```
CSAT = (operadores_contratados / 10) × quiz_score_percentage

Pontuação por indicador = ranking 1-4 entre as lojas (4 = melhor)

Demand Share (%) = pontos_loja / soma_total_pontos_todas_lojas

EBITDA = Receita_Bruta
         - Impostos
         - Custo_de_Venda
         - Quebras
         - Aging
         - Folha_de_Pagamento
         - Manutencao_Equipamentos
         - Licencas_Software
         - Juros_sobre_excedente_de_caixa
         - Receita_perdida_por_SLA_Event

% EBITDA = EBITDA / Receita_Bruta
```

### 3.5 Eventos WebSocket (Tempo Real)

```
CLIENT → SERVER:
- "UPDATE_STOCK" {category_id, quantity}
- "UPDATE_PRICING" {category_id, margin}
- "UPDATE_OPERATORS" {cashier, service}
- "TOGGLE_CAPEX" {capex_id}
- "CONFIRM_PO" {store_id, round}
- "TRANSFER_PLAYER" {user_id, from_store, to_store}

SERVER → ALL:
- "PO_UPDATED" {store_id, cash_available, ebitda_projected}
- "ROUND_STARTED" {round}
- "RESULTS_PUBLISHED" {all_stores_results}
- "ROUND_COMPLETED" {ranking}
- "SESSION_FINISHED" {final_ranking}
```

### 3.6 Contratos de API REST

```
POST /auth/register
{email, name, password} → {token, refresh_token}

POST /auth/login
{email, password} → {token, refresh_token}

POST /sessions
{name, initial_cash} → {session_id, invite_code}

GET /sessions/:id/dashboard
→ {stores[], members[], round, status}

POST /stores
{session_id, name} → {store_id}

POST /operational-plans
{store_id, round, config} → {plan_id}

PUT /operational-plans/:id/category-decision
{category_id, stock_purchased, price_margin} → {cash_used, ebitda}

POST /operational-plans/:id/confirm
→ {status: CONFIRMED}

POST /rounds/:id/execute
→ {results[], round_data}

GET /rounds/:round_id/results
→ {all_stores_results[], ranking}
```

---

## 4. Cronograma Proposto (MVP)

| Semana | Foco | Deliverables |
|---|---|---|
| **1-2** | Setup Backend + DB | Schema Prisma, seed CAPEX/CATEGORY, autenticação JWT |
| **3-4** | Setup Frontend + Auth | Login/Signup, Dashboard layout, componentes Tailwind |
| **5-6** | Plano Operacional | UI colaborativa de PO, cálculos em tempo real |
| **7-8** | Motor de Cálculo | Engine de distribuição, EBITDA, SLA events |
| **9** | WebSocket + Sync | Socket.io events, atualização em tempo real |
| **10-11** | Testes + Refinamento | E2E tests, performance tunning, bug fixes |
| **12** | Deploy + Documentação | Railway/Render deploy, readme, guia de uso |

---

## 5. Métricas de Sucesso

- ✅ 4 lojas simultâneas com 5 jogadores cada, rodadas com latência < 500ms
- ✅ Todos os cálculos de EBITDA conferem com seed values
- ✅ Facilitador consegue gerenciar sessão do início ao fim em < 30 minutos
- ✅ Jogadores conseguem usar a plataforma sem treinamento (UI intuitiva)
- ✅ Deploy em produção com uptime > 99%

---

## 6. Riscos e Mitigation

| Risco | Probabilidade | Impacto | Mitigation |
|---|---|---|---|
| Cálculos complexos com erro | Média | Alto | Testes unitários rigorosos em motor |
| Latência WebSocket > 500ms | Baixa | Médio | Load tests cedo + otimização |
| Escopo creep nos diferenciais | Alta | Médio | MVP restrito a 25 US, diferenciais em V2 |
| Falha no seed data | Baixa | Alto | Script validação, testes de seed |

