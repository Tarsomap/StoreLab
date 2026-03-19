# Entrega Parcial — MVP
**Residência em Software II | Squad 14**

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

### 2.2 Critérios de Aceitação
> A ser detalhado a partir da Semana 5, com o início do desenvolvimento iterativo.

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

### 3.3 Lógica de Funcionamento da Solução

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
