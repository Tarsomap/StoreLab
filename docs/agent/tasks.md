# tasks.md
# Retail Game Platform — Tarefas de Desenvolvimento

> Use este documento como guia de desenvolvimento.
> Implemente as features na ordem de prioridade: 🔴 Essencial primeiro, depois 🟠 Importante, depois 🟡 Desejável.
> Cada User Story mapeia diretamente para um ou mais endpoints de API ou eventos WebSocket definidos em `plan.md`.
> Consulte `spec.md` para as regras de negócio e `plan.md` para as decisões técnicas.

---

## Requisitos Funcionais

| ID | Requisito | Prioridade |
|---|---|---|
| RF-01 | Cadastro e autenticação de usuários com email/senha | 🔴 Essencial |
| RF-02 | Diferenciação de papéis: FACILITATOR e PLAYER | 🔴 Essencial |
| RF-03 | Facilitador cria sessões de jogo com parâmetros configuráveis | 🔴 Essencial |
| RF-04 | Facilitador cria até 4 lojas por sessão e gera códigos de acesso | 🔴 Essencial |
| RF-05 | Facilitador inicia, avança e encerra rodadas | 🔴 Essencial |
| RF-06 | Jogador entra na sessão via código e seleciona papel | 🔴 Essencial |
| RF-07 | Cada loja tem exatamente 5 papéis: STORE_MANAGER, SUPPLY_MANAGER, COMMERCIAL_MANAGER, OPERATIONAL_MANAGER, SERVICE_MANAGER | 🔴 Essencial |
| RF-08 | Cada papel acessa apenas as decisões da sua área no PO | 🟠 Importante |
| RF-09 | Preenchimento colaborativo do PO em tempo real via WebSocket | 🔴 Essencial |
| RF-10 | Cálculo do saldo de caixa em tempo real durante o preenchimento do PO | 🔴 Essencial |
| RF-11 | EBITDA projetado em tempo real durante o preenchimento do PO | 🔴 Essencial |
| RF-12 | Alerta e juros (12%/mês) quando caixa gasto superar R$700k | 🔴 Essencial |
| RF-13 | Gerente da loja confirma o PO para desbloquear a rodada | 🔴 Essencial |
| RF-14 | Motor calcula CSAT a partir de operadores + pontução do quiz | 🔴 Essencial |
| RF-15 | Motor distribui demanda com base no ranking de Preço, Disponibilidade e CSAT (1–4) | 🔴 Essencial |
| RF-16 | Motor calcula Quebras e Aging sobre estoque total não vendido apenas ao final da última rodada | 🔴 Essencial |
| RF-17 | Motor calcula EBITDA final por loja por rodada | 🔴 Essencial |
| RF-18 | Motor aplica eventos de SLA para CAPEXs não implementados | 🔴 Essencial |
| RF-19 | Exibir ranking das lojas por % EBITDA após cada rodada | 🔴 Essencial |
| RF-20 | Exibir detalhamento completo do PO ao final da sessão | 🔴 Essencial |
| RF-21 | Facilitador transfere 1–2 jogadores entre lojas após rodada 1 (OBRIGATÓRIO — reconfiguração bloqueada até transferências serem feitas) | 🔴 Essencial |
| RF-22 | Reconfiguração com restrições de caixa (sem reuso de receita de vendas, sem realocação de estoque entre categorias) | 🔴 Essencial |
| RF-23 | Facilitador cria perguntas de quiz por sessão; jogadores respondem antes de confirmar o PO | 🔴 Essencial |
| RF-24 | Simulador de cenários de precificação antes de confirmar o PO | 🟡 Desejável |
| RF-25 | Probabilidades de eventos aleatórios configuráveis | 🟡 Desejável |
| RF-26 | Alertas para aging elevado ou nível crítico de caixa | 🟡 Desejável |
| RF-27 | Exportar resultados para PDF ou Excel | 🟡 Desejável |
| RF-28 | Histórico de sessões para o facilitador | 🟡 Desejável |

---

## Requisitos Não-Funcionais

| ID | Requisito | Prioridade |
|---|---|---|
| RNF-01 | Latência máxima de WebSocket: 500ms | 🔴 Essencial |
| RNF-02 | Suporte a 20 usuários simultâneos por sessão (4 lojas × 5 jogadores) | 🔴 Essencial |
| RNF-03 | Senhas armazenadas com bcrypt (custo mínimo 10) | 🔴 Essencial |
| RNF-04 | JWT com expiração de 1h, refresh token de 7 dias | 🔴 Essencial |
| RNF-05 | UI responsiva para tablets e desktops | 🟠 Importante |
| RNF-06 | Tempo de resposta da API REST < 300ms sob carga normal | 🟠 Importante |
| RNF-07 | Backups automáticos do banco via provedor de deploy | 🟠 Importante |
| RNF-08 | Cobertura de testes unitários ≥ 80% para todo o módulo engine/ | 🟠 Importante |
| RNF-09 | Log de erros estruturado (Pino ou Winston) | 🟡 Desejável |
| RNF-10 | CI/CD automatizado via GitHub Actions | 🟡 Desejável |

---

## Épicos & User Stories

### Épico 1 — Autenticação & Usuários
| ID | User Story | Prioridade |
|---|---|---|
| US-01 | Como facilitador, quero criar uma conta para acessar o sistema | 🔴 MVP |
| US-02 | Como usuário, quero fazer login com email e senha | 🔴 MVP |
| US-03 | Como facilitador, quero convidar jogadores via link/código | 🔴 MVP |
| US-04 | Como jogador, quero entrar em uma sessão e escolher meu papel na loja | 🔴 MVP |

### Épico 2 — Gestão de Sessão
| ID | User Story | Prioridade |
|---|---|---|
| US-05 | Como facilitador, quero criar uma sessão com parâmetros iniciais (caixa, estoque, demanda) | 🔴 MVP |
| US-06 | Como facilitador, quero criar as 4 lojas dentro de uma sessão | 🔴 MVP |
| US-07 | Como facilitador, quero iniciar e avançar rodadas | 🔴 MVP |
| US-08 | Como facilitador, quero ver o status de todas as lojas em tempo real | 🔴 MVP |
| US-09 | Como facilitador, quero encerrar a sessão e exibir o ranking final | 🔴 MVP |

### Épico 3 — Plano Operacional (PO)
| ID | User Story | Prioridade |
|---|---|---|
| US-10 | Como gerente de abastecimento, quero definir o estoque comprado por categoria (em unidades) | 🔴 MVP |
| US-11 | Como gerente comercial, quero definir a margem de precificação por categoria | 🔴 MVP |
| US-12 | Como gerente operacional, quero definir a quantidade de operadores de caixa e de serviço | 🔴 MVP |
| US-13 | Como gerente de serviços, quero selecionar quais CAPEXs implementar | 🔴 MVP |
| US-14 | Como gerente da loja, quero ver o saldo de caixa disponível atualizado em tempo real | 🔴 MVP |
| US-15 | Como gerente da loja, quero ver o EBITDA projetado em tempo real | 🔴 MVP |
| US-16 | Como gerente da loja, quero confirmar a configuração para desbloquear a rodada | 🔴 MVP |

### Épico 4 — Quiz
| ID | User Story | Prioridade |
|---|---|---|
| US-17 | Como facilitador, quero criar perguntas de quiz para a sessão para avaliar os jogadores sobre conhecimento de negócio | 🔴 MVP |
| US-18 | Como jogador, quero responder as perguntas do quiz antes de confirmar o PO para que minha pontuação impacte o CSAT da loja | 🔴 MVP |

### Épico 5 — Motor de Cálculo & Rodadas
| ID | User Story | Prioridade |
|---|---|---|
| US-19 | O sistema deve calcular o CSAT a partir de operadores e pontuação do quiz | 🔴 MVP |
| US-20 | O sistema deve distribuir a demanda entre as lojas com base em Preço, Disponibilidade e CSAT | 🔴 MVP |
| US-21 | O sistema deve calcular Quebras e Aging sobre o estoque total não vendido ao final da última rodada | 🔴 MVP |
| US-22 | O sistema deve calcular impostos, folha, manutenção e licenças para o EBITDA | 🔴 MVP |
| US-23 | O sistema deve aplicar eventos de SLA para CAPEXs não implementados | 🔴 MVP |
| US-24 | O sistema deve processar a transferência obrigatória de jogadores entre lojas (1–2 por loja após rodada 1) | 🔴 MVP |

### Épico 6 — Resultados & Ranking
| ID | User Story | Prioridade |
|---|---|---|
| US-25 | Como jogador, quero ver os resultados parciais da minha loja após cada rodada | 🔴 MVP |
| US-26 | Como jogador, quero ver o ranking comparativo de todas as lojas por % EBITDA | 🔴 MVP |
| US-27 | Como facilitador, quero ver o detalhamento completo do PO por loja ao final | 🔴 MVP |

### Épico 7 — Diferenciais (Pós-MVP)
| ID | User Story | Prioridade |
|---|---|---|
| US-28 | Como gerente da loja, quero simular cenários de precificação antes de confirmar o PO | 🟡 Diferencial |
| US-29 | Como facilitador, quero configurar as probabilidades de eventos aleatórios | 🟡 Diferencial |
| US-30 | Como jogador, quero receber alertas de aging elevado ou caixa crítico | 🟡 Diferencial |
| US-31 | Como facilitador, quero exportar os resultados finais para PDF/Excel | 🟡 Diferencial |
| US-32 | Como facilitador, quero acessar o histórico de sessões anteriores | 🟡 Diferencial |
