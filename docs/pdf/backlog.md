# Backlog do Produto — Retail Game Platform
**Residência em Software II | Squad 14**

---

## 1. Requisitos Funcionais

| ID | Requisito | Prioridade |
|---|---|---|
| RF-01 | O sistema deve permitir cadastro e autenticação de usuários com e-mail e senha | 🔴 Essencial |
| RF-02 | O sistema deve diferenciar perfis de Facilitador e Jogador | 🔴 Essencial |
| RF-03 | O facilitador deve poder criar sessões de jogo com parâmetros configuráveis | 🔴 Essencial |
| RF-04 | O facilitador deve poder criar até 4 lojas por sessão e gerar códigos de acesso | 🔴 Essencial |
| RF-05 | O facilitador deve poder iniciar, avançar e encerrar rodadas | 🔴 Essencial |
| RF-06 | O jogador deve poder entrar em uma sessão via código e escolher seu papel | 🔴 Essencial |
| RF-07 | Cada loja deve ter exatamente 5 papéis: Gerente, Abastecimento, Comercial, Operacional, Serviços | 🔴 Essencial |
| RF-08 | Cada papel deve ter acesso apenas às decisões da sua área no PO | 🟠 Importante |
| RF-09 | O sistema deve permitir preenchimento colaborativo do PO em tempo real | 🔴 Essencial |
| RF-10 | O sistema deve calcular e exibir o caixa consumido em tempo real durante o preenchimento do PO | 🔴 Essencial |
| RF-11 | O sistema deve calcular e exibir o EBITDA projetado em tempo real durante o preenchimento do PO | 🔴 Essencial |
| RF-12 | O sistema deve alertar quando o caixa exceder R$700k (aplicando juros de 12%) | 🔴 Essencial |
| RF-13 | O gerente da loja deve poder confirmar o PO para liberar a rodada | 🔴 Essencial |
| RF-14 | O motor deve calcular o CSAT com base em operadores e resultado do questionário | 🔴 Essencial |
| RF-15 | O motor deve distribuir a demanda entre lojas com base em Preço, Disponibilidade e CSAT | 🔴 Essencial |
| RF-16 | O motor deve calcular Quebras e Aging sobre o estoque não vendido por categoria | 🔴 Essencial |
| RF-17 | O motor deve calcular o EBITDA final de cada loja após cada rodada | 🔴 Essencial |
| RF-18 | O motor deve aplicar eventos de SLA para CAPEXs não implementados | 🔴 Essencial |
| RF-19 | O sistema deve exibir ranking de lojas por % EBITDA após cada rodada | 🔴 Essencial |
| RF-20 | O sistema deve exibir o breakdown completo do PO ao final da sessão | 🔴 Essencial |
| RF-21 | O facilitador deve poder mover até 2 jogadores entre lojas após a 1ª rodada | 🔴 Essencial |
| RF-22 | O sistema deve permitir 2ª Configuração com restrições de caixa | 🔴 Essencial |
| RF-23 | O jogador deve poder simular cenários de pricing antes de confirmar o PO | 🟡 Desejável |
| RF-24 | O facilitador deve poder configurar probabilidade dos eventos aleatórios | 🟡 Desejável |
| RF-25 | O sistema deve emitir alertas de aging elevado ou caixa crítico | 🟡 Desejável |
| RF-26 | O facilitador deve poder exportar resultados em PDF ou Excel | 🟡 Desejável |
| RF-27 | O facilitador deve poder acessar histórico de sessões anteriores | 🟡 Desejável |

---

## 2. Requisitos Não Funcionais

| ID | Requisito | Prioridade |
|---|---|---|
| RNF-01 | A comunicação em tempo real deve ter latência máxima de 500ms para atualizações do PO | 🔴 Essencial |
| RNF-02 | O sistema deve suportar ao menos 4 lojas com 5 jogadores cada (20 usuários) por sessão simultânea | 🔴 Essencial |
| RNF-03 | Senhas devem ser armazenadas com hash bcrypt (custo mínimo 10) | 🔴 Essencial |
| RNF-04 | Tokens JWT devem ter expiração de 1h com refresh token de 7 dias | 🔴 Essencial |
| RNF-05 | O sistema deve ser responsivo e utilizável em tablets e desktops | 🟠 Importante |
| RNF-06 | O tempo de resposta das APIs REST deve ser inferior a 300ms em condições normais | 🟠 Importante |
| RNF-07 | O banco de dados deve ter backup automático (provedor de deploy) | 🟠 Importante |
| RNF-08 | O código deve ter cobertura mínima de testes unitários no motor de cálculo (engine) | 🟠 Importante |
| RNF-09 | O sistema deve ter logs de erro estruturados (ex: Winston ou Pino) | 🟡 Desejável |
| RNF-10 | O deploy deve ser automatizado via CI/CD (GitHub Actions) | 🟡 Desejável |

---

## 3. Épicos e User Stories

### Épico 1 — Autenticação e Gestão de Usuários
| ID | User Story | Prioridade |
|---|---|---|
| US-01 | Como facilitador, quero criar minha conta para acessar o sistema | 🔴 MVP |
| US-02 | Como usuário, quero fazer login com e-mail e senha para acessar minha loja | 🔴 MVP |
| US-03 | Como facilitador, quero convidar jogadores para uma sessão via link/código | 🔴 MVP |
| US-04 | Como jogador, quero entrar em uma sessão e escolher meu papel na loja | 🔴 MVP |

### Épico 2 — Gestão de Sessão
| ID | User Story | Prioridade |
|---|---|---|
| US-05 | Como facilitador, quero criar uma sessão definindo parâmetros (caixa, estoque, demanda) | 🔴 MVP |
| US-06 | Como facilitador, quero criar as 4 lojas dentro de uma sessão | 🔴 MVP |
| US-07 | Como facilitador, quero iniciar e avançar as rodadas de venda | 🔴 MVP |
| US-08 | Como facilitador, quero visualizar o status de todas as lojas em tempo real | 🔴 MVP |
| US-09 | Como facilitador, quero encerrar a sessão e exibir o resultado final com ranking | 🔴 MVP |

### Épico 3 — Plano Operacional
| ID | User Story | Prioridade |
|---|---|---|
| US-10 | Como gerente de abastecimento, quero definir a quantidade de estoque comprado por categoria | 🔴 MVP |
| US-11 | Como gerente comercial, quero definir a margem de pricing por categoria | 🔴 MVP |
| US-12 | Como gerente operacional, quero definir a quantidade de operadores de caixa e serviço | 🔴 MVP |
| US-13 | Como gerente de serviços, quero selecionar quais CAPEXs serão implementados | 🔴 MVP |
| US-14 | Como gerente da loja, quero ver o caixa disponível atualizado em tempo real | 🔴 MVP |
| US-15 | Como gerente da loja, quero ver o EBITDA projetado em tempo real | 🔴 MVP |
| US-16 | Como gerente da loja, quero confirmar a configuração para liberar a rodada | 🔴 MVP |

### Épico 4 — Motor de Cálculo e Rodadas
| ID | User Story | Prioridade |
|---|---|---|
| US-17 | Como sistema, preciso calcular o CSAT com base em operadores e quiz | 🔴 MVP |
| US-18 | Como sistema, preciso distribuir a demanda entre lojas por Preço, Disponibilidade e CSAT | 🔴 MVP |
| US-19 | Como sistema, preciso calcular Quebras e Aging sobre o estoque não vendido | 🔴 MVP |
| US-20 | Como sistema, preciso calcular impostos, folha, manutenção e licenças para o EBITDA | 🔴 MVP |
| US-21 | Como sistema, preciso aplicar eventos de SLA por CAPEX não implementado | 🔴 MVP |
| US-22 | Como sistema, preciso processar movimentação de até 2 jogadores entre lojas | 🔴 MVP |

### Épico 5 — Resultados e Ranking
| ID | User Story | Prioridade |
|---|---|---|
| US-23 | Como jogador, quero ver os resultados parciais da minha loja após cada rodada | 🔴 MVP |
| US-24 | Como jogador, quero ver o ranking comparativo entre todas as lojas por % EBITDA | 🔴 MVP |
| US-25 | Como facilitador, quero ver o breakdown completo do PO de cada loja ao final | 🔴 MVP |

### Épico 6 — Diferenciais
| ID | User Story | Prioridade |
|---|---|---|
| US-26 | Como gerente, quero simular cenários de pricing antes de confirmar o PO | 🟡 Diferencial |
| US-27 | Como facilitador, quero configurar eventos aleatórios com probabilidade customizável | 🟡 Diferencial |
| US-28 | Como jogador, quero receber alertas de aging elevado ou caixa crítico | 🟡 Diferencial |
| US-29 | Como facilitador, quero exportar o resultado final em PDF/Excel | 🟡 Diferencial |
| US-30 | Como facilitador, quero acessar o histórico de sessões anteriores | 🟡 Diferencial |

---

## 4. Critérios de Aceitação Detalhados (Motor de Cálculo - Épico 4)

### US-17: Calcular CSAT

**Critérios:**
- [ ] Fórmula: `CSAT = (operadores_caixa / 10) × (quiz_score / 100)`
- [ ] Validação: operadores_caixa entre 0-10
- [ ] Quiz pode ter entre 5-10 perguntas (configurável)
- [ ] Score resultánte entre 0-100%
- [ ] Armazenado em QUIZ_ANSWER com timestamp
- [ ] Exemplo correto: 8 operadores + 80% quiz = 64% CSAT
- [ ] Teste unitário: validar 10 combinações diferentes
- [ ] Não pode ser null (padrão 0 se quiz não respondido)

### US-18: Distribuir Demanda

**Critérios:**
- [ ] **Indicadores calculados por loja:**
  - Disponibilidade = stock_disponível / demanda_esperada
  - Preço da Cesta = (preço_competitivo_médio / preço_loja)
  - CSAT = (CSAT_score / 100)

- [ ] **Ranking por indicador (1-4 pontos):**
  - 1º lugar (melhor): 4 pontos
  - 2º lugar: 3 pontos
  - 3º lugar: 2 pontos
  - 4º lugar: 1 ponto

- [ ] **Cálculo de Demand Share:**
  - Total de pontos por loja = P1 + P2 + P3 (3 indicadores)
  - Demand_Share (%) = (pontos_loja / sum_total_pontos) × 100
  - Demanda Absoluta = Demand_Share × Total_Demanda_Sessão

- [ ] **Casos de teste:**
  - [ ] Loja com preço alto, CSAT baixo, disponibilidade alta → demand compartilhada
  - [ ] Loja com preço baixo, CSAT alto, disponibilidade baixa → demand maior
  - [ ] Todas lojas idênticas → demand distribuída igualmente (25% cada)
  - [ ] Uma loja com 0 em tudo → recebe 1 ponto em cada indicador

- [ ] Armazenado em ROUND_RESULT com todos os scores
- [ ] Teste integrado: rodar 4 lojas diferentes e validar soma = 100%

### US-19: Calcular Quebras e Aging

**Critérios:**
- [ ] **Fórmula por categoria:**
  - Estoque_Residual = Stock_Purchased - Stock_Sold
  - Quebras = Estoque_Residual × Breakage_Rate (seed da categoria)
  - Aging = Estoque_Residual × Aging_Rate (seed da categoria)

- [ ] **Valores de seed (tabela):**
  - PERECIVEIS: 3% quebra, 2% aging
  - MERCEARIA: 1% quebra, 0% aging
  - ELETRO: 0.2% quebra, 5% aging
  - HIPEL: 0.5% quebra, 1% aging

- [ ] Cálculo em unidades (quantidade) e depois convertido para R$
  - Custo_Quebra = Quebras (un) × Unit_Cost
  - Custo_Aging = Aging (un) × Unit_Cost

- [ ] Nunca pode ser negativo (validação)
- [ ] Reduz margem líquida (desconto do EBITDA)
- [ ] Armazenado em PO_CATEGORY_DECISION com breakdown
- [ ] Teste: 100 un comprados, 70 vendidos, taxa 3% quebra → 0.9 un perdidas

### US-20: Calcular EBITDA Completo

**Critérios:**
- [ ] **Componentes (em ordem):**
  1. **Receita Bruta** = Demanda_Absoluta × Preço_Unitário (por categoria)
  2. **Impostos** = Receita_Bruta × Tax_Rate (7.65% base, pode variar por categoria)
  3. **Receita Líquida** = Receita_Bruta - Impostos
  4. **Custo de Venda** = Demanda_Absoluta × Unit_Cost (por categoria)
  5. **Margem Bruta** = Receita_Líquida - Custo_de_Venda
  6. **Quebras + Aging** = (calcs de US-19)
  7. **Margem Líquida** = Margem_Bruta - Quebras - Aging
  8. **Folha de Pagamento** = (cashier_ops × 2000) + (service_ops × 2500)
  9. **Manutenção** = R$ 5.000 (fixo)
  10. **Licenças** = Σ(capex_option.monthly_license se implemented)
  11. **Juros Excedente** = MAX(0, (cash_disponivel - 700000) × 1%)
  12. **SLA Perdas** = Σ(sla_event.revenue_lost)
  13. **EBITDA** = Margem_Líquida - Folha - Manutenção - Licenças - Juros - SLA
  14. **% EBITDA** = EBITDA / Receita_Bruta × 100

- [ ] **Validações:**
  - Receita Bruta nunca negativa
  - Custos não podem ser maiores que Margem Bruta
  - EBITDA pode ser negativo (decisões ruins)
  - % EBITDA entre -100% e +100%

- [ ] **Casos de teste:**
  - [ ] Cenario ideal: receita alta, custos baixos → EBITDA positivo alto
  - [ ] Cenario ruim: estoque alto + preço baixo → EBITDA negativo
  - [ ] Cenario com SLA: CAPEX não feito + evento → receita perdida descontada
  - [ ] Cenario com juros: caixa > 700k → juros descontados

- [ ] Armazenado em ROUND_RESULT com breakdown completo
- [ ] Testes unitários: mínimo 15 casos diferentes
- [ ] Teste de aceitação: rodar seção inteira (4 lojas, 3 rodadas) e validar somas

### US-21: Aplicar Eventos de SLA

**Critérios:**
- [ ] **Mapeamento CAPEX → SLA:**
  - SECURITY não implementado: 15% chance → roubo → 2% receita perdida
  - FREEZER não implementado: 10% chance → estrago → +30% aging
  - NETWORK não implementado: 5% chance → downtime → 1h sem vendas
  - SITE: N/A (branding)
  - SELF_CHECKOUT: N/A (agilidade)
  - AUTOMATION: N/A (labor)

- [ ] **Processamento:**
  - Verifica cada CAPEX não implementado
  - Sorteia randomicamente com probabilidade
  - Se evento ocorre: registra SLA_EVENT no BD
  - Calcula impacto (receita perdida ou aging aumentada)
  - Desconta de EBITDA

- [ ] **Validações:**
  - Seed determinista (usar hash de round + loja para sorteio reproduzível)
  - Apenas um evento por CAPEX por rodada
  - Receita perdida não pode ser > 100% da receita

- [ ] **Casos de teste:**
  - [ ] Nenhum CAPEX implementado → todos verificados
  - [ ] Todos CAPEX implementados → nenhum evento
  - [ ] Um CAPEX não implementado + evento → SLA_EVENT registrado
  - [ ] Sorteio: 1000 rodadas da mesma sessão → 15% aprox. com roubo

- [ ] Armazenado em SLA_EVENT (capex_type, days_impacted, revenue_lost)
- [ ] Teste: rodar 4 lojas, cada uma faltando CAPEXs diferentes

### US-22: Processar Transferência de Jogadores

**Critérios:**
- [ ] **Restrições:**
  - Máximo 2 transferências por loja de origem (na reconfig)
  - Não pode transferir Gerente da Loja (STORE_MANAGER imovíalvel)
  - Não pode ter 2 pessoas com mesmo papel em uma loja (validar)
  - Apenas durante RECONFIGURATION (status da sessão)

- [ ] **Processamento:**
  - Valida origem e destino são lojas da mesma sessão
  - Valida contagem total de transfers <= 2 por loja
  - Move STORE_MEMBER de origem para destino
  - Registra PLAYER_TRANSFER no BD
  - Mantem plano operacional anterior (não reseta)

- [ ] **Casos de teste:**
  - [ ] Transfer válido: SUPPLY_MANAGER da loja A para B
  - [ ] Transfer inválido: tentar mover STORE_MANAGER
  - [ ] Transfer inválido: já tem 2 transfers nesta loja
  - [ ] Transfer inválido: destino já tem SUPPLY_MANAGER

- [ ] Armazenado em PLAYER_TRANSFER
- [ ] Teste: simular transfer e validar STORE_MEMBER atualizado

---

## 5. Estimativas Iniciais (T-shirt sizing)

| Épico | Tamanho | Semanas |
|---|---|---|
| Autenticação | M (Medium) | 1-2 |
| Gestão de Sessão | M | 2-3 |
| Plano Operacional | L (Large) | 3-4 |
| Motor de Cálculo | L | 4-5 |
| Resultados | M | 2 |
| Diferenciais | L | 3+ |

---

## 6. Riscos Identificados

| Risco | Probabilidade | Impacto | Mitigation |
|---|---|---|---|
| Cálculos EBITDA com erro | Média | ALTO | Testes unitários rigorosos do motor |
| Latência WebSocket > 500ms | Baixa | Médio | Load tests cedo + otimização |
| Escopo creep | Alta | Médio | MVP restrito a 25 US, V2 para diferenciais |
| Seed data incorreto | Baixa | ALTO | Script de validação, testes de seed |
| Concorrência em atualizações do PO | Média | Médio | Transacionalidade no BD, versionamento |

---

## 7. Referências de Implementação

- **Documentos de especificação:** Ver `docs/pdf/arquitetura-tecnica.md` e `docs/pdf/entrega-parcial.md`
- **Base de cálculo:** Seed values em `src/seed/seed.ts` (CATEGORY, CAPEX_OPTION)
- **Testes:** `src/engine/__tests__/` (motor de cálculo)
- **Contatos:** Óbvio que será um squad, specs compartilhadas no Notion/Confluence
