# 🏪 Guia do Projeto — Retail Game Platform

> **Para quem é esse documento?**
> Para todo mundo do squad, especialmente quem está chegando agora e ainda não sabe o que vamos construir.
>
> **O que você vai entender ao terminar de ler:**
> O que é o jogo, como ele funciona, quem vai usar o sistema e qual é o seu papel no desenvolvimento.

---

## 1. O que é esse projeto?

Vamos construir a **versão digital de um jogo de simulação de varejo**.

No jogo, grupos de pessoas assumem o papel de gerentes de uma loja de supermercado. Cada grupo toma decisões reais de gestão — quanto estoque comprar, que preço cobrar, quantos funcionários contratar — e no final das rodadas, o sistema calcula qual loja foi mais lucrativa.

Pensa assim: é como um **SimCity, mas de supermercado**, e com várias equipes competindo ao mesmo tempo.

---

## 2. Como o jogo funciona?

O jogo é dividido em **etapas bem definidas**. Veja o fluxo completo:

### Etapa 1 — Configuração inicial
Antes do jogo começar, o **Facilitador** cria a sessão e define os parâmetros iniciais:
- **Caixa inicial** de cada loja (padrão: R$ 700.000, mas configurável)
- **Estoque disponível** por categoria (o teto máximo que cada loja pode comprar)
- **Demanda esperada** por categoria (quantos clientes serão distribuídos na sessão)

Com esses parâmetros definidos, cada equipe então decide **como usar** o caixa disponível:
- Quanto estoque comprar de cada categoria (em unidades)
- Que margem de preço aplicar em cada categoria
- Quantos funcionários contratar
- Se vão fazer investimentos na loja (chamados de **CAPEX** — explicado abaixo)

### Etapa 2 — Rodada de vendas
Depois que todas as lojas configuram suas decisões, o sistema roda os cálculos automaticamente e distribui os clientes entre as lojas. A loja que tiver melhor preço, mais estoque disponível e melhor atendimento atraé mais clientes.

### Etapa 3 — Resultado parcial
O sistema exibe quanto cada loja lucrou na rodada. As equipes vêem onde erraram e têm a chance de:
- Trocar de 1 a 2 jogadores com outras lojas (obrigatório)
- Refazer as configurações para as próximas rodadas

### Etapa 4 — Rodadas finais
Mais 2 rodadas de venda com as novas configurações.

### Etapa 5 — Resultado final
O sistema exibe o **ranking final** com o % de lucro de cada loja. A loja com maior % de EBITDA (lucro) vence.

---

## 3. Glossário — os termos que vão aparecer o tempo todo

> 💡 **Regra de ouro:** sempre que você encontrar um desses termos no código ou em outro documento, consulte aqui.

| Termo | O que significa em português simples |
|---|---|
| **Facilitador** | A pessoa que organiza e controla o jogo. Cria as salas, define os parâmetros da sessão, inicia as rodadas, vê tudo. Pense como um "mestre do jogo". |
| **Jogador** | Participante do jogo. Cada jogador tem um papel específico dentro da loja. |
| **Sessão** | Uma partida completa do jogo, com início, meio e fim. Pode ter até 4 lojas disputando. |
| **Loja** | A equipe do jogo. Cada loja tem 5 jogadores, cada um com um papel diferente. |
| **PO (Plano Operacional)** | O formulário de decisões de cada rodada. É onde cada jogador registra suas escolhas (estoque, preço, equipe). Os valores digitados são reais e definidos pelos jogadores. |
| **Rodada** | Um ciclo de vendas. O facilitador inicia, as lojas configuram o PO, o sistema calcula, os resultados aparecem. |
| **EBITDA** | O "placar" do jogo — é o lucro da loja depois de pagar todas as despesas. Quem tiver maior % de EBITDA no final vence. |
| **CSAT** | A nota de atendimento da loja. Calculada com base em quantos funcionários a loja tem e na nota do quiz de conhecimento. |
| **CAPEX** | Investimento em melhorias para a loja (ex: câmera de segurança, freezer novo, melhoria no site). Custa dinheiro agora, mas evita problemas depois. |
| **SLA** | Penalidade por não ter feito um CAPEX. Se a loja não investiu em segurança e acontece um roubo, ela perde dinheiro — isso é o SLA. |
| **Aging** | Prejuízo com produtos que ficaram parados no estoque por tempo demais. Ex: frutas que apodreceram porque a loja comprou mais do que vendeu. |
| **Quebras** | Produtos perdidos ou danificados (ex: uma caixa de ovos que caiu). Comum em perecíveis. |
| **Demanda** | A quantidade de clientes que vão comprar em cada loja. O total da sessão é definido pelo Facilitador; o sistema distribui esse total entre as lojas com base nas decisões de cada equipe. |
| **Seed** | Dados fixos que o sistema usa como base de cálculo: custo unitário dos produtos, taxas de imposto, taxas de quebra e aging. São os mesmos para todas as lojas e não mudam durante o jogo. |
| **Parâmetros da Sessão** | Valores configurados pelo Facilitador ao criar a sessão: caixa inicial, estoque disponível por categoria e demanda esperada por categoria. Esses valores são reais e definem o cenário do jogo. |
| **JWT** | Token de segurança que identifica o usuário logado. É o que garante que só quem está na sessão consegue acessar a loja. |
| **WebSocket** | Tecnologia que permite que a tela atualize em tempo real sem precisar recarregar a página. Usamos para que todos os jogadores da loja vejam as mudanças instantaneamente. |
| **NestJS** | O framework (estrutura) que vamos usar para construir o backend (o servidor). |
| **Next.js** | O framework que vamos usar para construir o frontend (as telas). |
| **Prisma** | A ferramenta que faz o código conversar com o banco de dados. |
| **PostgreSQL** | O banco de dados onde todas as informações do jogo são salvas. |

---

## 4. Quem usa o sistema?

### 🎮 O Facilitador
É quem organiza a partida. Normalmente um professor, treinador ou líder de equipe.

O que ele faz no sistema:
- Cria a sessão e **define os parâmetros reais**: caixa inicial, estoque disponível e demanda esperada por categoria
- Cria as 4 lojas e gera o código de acesso de cada uma
- Inicia e avança as rodadas
- Vê o status de todas as lojas em tempo real
- Move jogadores entre lojas entre rodadas (obrigatório: 1 a 2 por loja)
- Encerra a sessão e exibe o resultado final

### 🏪 Os Jogadores
Cada loja tem **exatamente 5 jogadores**, cada um com uma responsabilidade diferente:

| Papel | O que decide no PO |
|---|---|
| **Gerente da Loja** | Tem a visão geral, confirma o PO para liberar a rodada |
| **Gerente de Abastecimento** | Decide quantas unidades de estoque comprar de cada categoria |
| **Gerente Comercial** | Define a margem de preço (%) de cada categoria |
| **Gerente Operacional** | Decide quantos funcionários de caixa e serviço contratar |
| **Gerente de Serviços** | Escolhe quais CAPEXs (investimentos) serão feitos |

> ⚠️ **Importante para o desenvolvimento:** cada papel só tem acesso às suas próprias decisões no PO. O Gerente Comercial não vê o que o Operacional está preenchendo. Isso é intencional — simula o mundo real.

---

## 5. As 4 categorias de produtos

Cada loja vende produtos de 4 categorias. Para cada categoria existem dois tipos de valor:

- **Seed (constantes do sistema):** custo unitário, taxa de imposto, taxa de quebra, taxa de aging. Esses valores são fixos e iguais para todas as lojas.
- **Decisões dos jogadores:** quantidade de estoque a comprar (em unidades) e margem de preço (%). Esses valores são preenchidos no PO a cada rodada.

| Categoria | Custo Unit. | Imposto | Quebra | Aging | Ponto de atenção |
|---|---|---|---|---|---|
| **Perecíveis** | R$ 8,00 | 9,25% | 3,0% | 2,0% | Alta taxa de quebra e aging — comprar demais prejudica muito |
| **Mercearia** | R$ 5,00 | 7,65% | 1,0% | 0,0% | Baixo risco, mas margem pequena |
| **Eletro** | R$ 120,00 | 12,50% | 0,2% | 5,0% | Produto caro, baixa quebra, mas aging alto (tecnologia envelhece) |
| **Hipel** | R$ 45,00 | 7,65% | 0,5% | 1,0% | Risco médio, estável |

> 📌 **Nota de implementação:** os valores de seed são carregados via `src/seed/seed.ts` e não devem ser hardcoded em nenhuma outra parte do sistema.

---

## 6. Como o sistema decide quem vende mais?

O sistema distribui os clientes entre as lojas baseado em **3 critérios**. A loja que se sair melhor nos 3 atraé mais clientes:

1. **Preço** — loja com preço mais competitivo atraé mais clientes
2. **Disponibilidade** — loja que tem mais estoque disponível atraé mais clientes
3. **CSAT** — loja com melhor atendimento atraé mais clientes

O sistema pontua cada loja de 1 a 4 em cada critério e divide os clientes proporcionalmente à pontuação total. Se todas as lojas tiverem decisões idênticas, cada uma fica com 25% dos clientes.

---

## 7. O que acontece se a loja não fizer um CAPEX?

Cada CAPEX não realizado tem uma **chance de gerar um evento negativo** durante a rodada:

| CAPEX não feito | Risco |
|---|---|
| Segurança | Chance de ataque/roubo → perde % da receita |
| Freezer/Balança | Chance de equipamento quebrar → perecíveis não podem ser vendidos |
| Redes | Chance de queda de sistema → loja para por um tempo |
| Site | Sem risco de SLA (apenas branding) |
| Self-checkout | Sem risco de SLA (melhoria de velocidade) |
| Automação | Sem risco de SLA (produtividade) |

---

## 8. Como vamos construir esse projeto?

Usamos uma abordagem **assistida por IA + revisão humana obrigatória**.

### O fluxo de desenvolvimento

```
1. Agente de IA gera o código de um módulo
2. Membro do squad responsável revisa linha a linha
3. Testa localmente e identifica pelo menos 1 melhoria
4. Abre um PR com as correções e melhorias
5. Outro membro revisa o PR
6. Tech Lead faz o merge
```

### Por que esse modelo?
O agente acelera a geração do esqueleto do projeto. Mas código gerado por IA **não é código revisado** — erros de regra de negócio, segurança e performance só aparecem quando um humano lê e testa. O squad é responsável pela qualidade final.

### Sua responsabilidade como revisor
Cada membro do squad é **dono de um módulo**. Ser dono significa:
- Entender profundamente o que aquele módulo faz
- Garantir que está funcionando corretamente
- Ser capaz de explicar o código na apresentação final
- Ter pelo menos 1 commit de melhoria no histórico do Git

### Os 9 módulos e suas issues no GitHub

| Módulo | Issue | Área |
|---|---|---|
| Auth e Users | [#39](https://github.com/Tarsomap/retail-game-platform/issues/39) | Backend |
| Sessões e Lojas | [#40](https://github.com/Tarsomap/retail-game-platform/issues/40) | Backend |
| Plano Operacional | [#41](https://github.com/Tarsomap/retail-game-platform/issues/41) | Backend |
| Quiz | [#42](https://github.com/Tarsomap/retail-game-platform/issues/42) | Backend |
| Motor de Cálculo | [#43](https://github.com/Tarsomap/retail-game-platform/issues/43) | Backend |
| Resultados e WebSocket | [#44](https://github.com/Tarsomap/retail-game-platform/issues/44) | Backend |
| Telas de Auth e Sessão | [#45](https://github.com/Tarsomap/retail-game-platform/issues/45) | Frontend |
| Telas do PO e Quiz | [#46](https://github.com/Tarsomap/retail-game-platform/issues/46) | Frontend |
| Tela de Resultados | [#47](https://github.com/Tarsomap/retail-game-platform/issues/47) | Frontend |

---

## 9. Onde encontro mais detalhes?

| Documento | O que tem lá |
|---|---|
| [`docs/squad/01-como-trabalhamos.md`](./01-como-trabalhamos.md) | Como criar branches, commitar e abrir PR |
| [`docs/agent/CONTEXT.md`](../agent/CONTEXT.md) | Contexto completo do projeto e regras de negócio |
| [`docs/agent/ARCHITECTURE.md`](../agent/ARCHITECTURE.md) | Arquitetura técnica, fórmulas e contratos de API |
| [`docs/agent/BACKLOG.md`](../agent/BACKLOG.md) | Todos os requisitos funcionais e não funcionais |
| [`docs/squad/sprint-1/tarefas-motor.md`](./sprint-1/tarefas-motor.md) | Detalhamento das tarefas do motor de cálculo |

> 📌 **Dica:** se você ficou com dúvida sobre um termo técnico enquanto lia o código, volte para a seção 3 deste documento — o glossário cobre todos os termos que você vai encontrar.
