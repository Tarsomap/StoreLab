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
