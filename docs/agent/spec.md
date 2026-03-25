# spec.md
# Retail Game Platform — Especificação Funcional
**Versão:** 1.1 (Final)  
**Data:** 25/03/2026  
**Fonte de verdade:** Regras-Dinamica-Gestao-de-Loja-Unit.docx · Tabuleiro-Unit.pptx · Exemplo-PO-Unit.xlsx  
**Status:** ✅ APROVADO — pronto para plan.md

---

## 1. Visão Geral

Plataforma web que digitaliza uma dinâmica presencial de simulação de gestão de loja
de varejo. Times de 5 pessoas competem como lojas rivais, tomando decisões operacionais
reais (estoque, precificação, equipe, CAPEX). O resultado financeiro (% EBITDA) é
calculado automaticamente ao final de cada rodada. O time com maior % EBITDA
acumulado ao final das 3 rodadas vence.

---

## 2. Personas

| Persona | Papel no Jogo | Responsabilidade Principal |
|---|---|---|
| **Facilitador** | Conduz a dinâmica | Criar sessão, configurar parâmetros, iniciar rodadas, exibir resultados |
| **Gerente da Loja** | Lidera o time | Confirmar o PO; tem palavra final; não pode ser transferido entre lojas |
| **Gerente de Serviços** | Área de TI/Manutenção | Decidir CAPEXs e quantidade de Operadores de Serviço |
| **Gerente de Abastecimento** | Área de Estoque | Definir quantidade de estoque comprado por categoria |
| **Gerente Comercial** | Área de Pricing | Definir margem comercial por categoria |
| **Gerente Operacional** | Área de Vendas/Equipe | Definir quantidade de Operadores de Caixa |

> Regra: cada loja tem exatamente 5 papéis preenchidos por 5 pessoas distintas.

---

## 3. Fluxo Macro da Sessão

```
[SETUP]
  └─ Facilitador cria sessão, define parâmetros, cria 4 lojas, gera códigos de acesso
  └─ Jogadores entram e escolhem seus papéis

[1ª CONFIGURAÇÃO]  ← status: ROUND_1_CONFIG
  └─ Cada time preenche o PO colaborativamente por área
  └─ Gerente da Loja confirma o PO final
  └─ Facilitador aguarda confirmação de todas as 4 lojas antes de prosseguir

[RODADA 1]  ← status: ROUND_1
  └─ Motor executa: SLA → CSAT → Distribuição de Demanda → EBITDA
  └─ Resultados parciais exibidos em ranking

[RECONFIGURAÇÃO]  ← status: RECONFIGURATION
  └─ Movimentação de até 2 jogadores por loja (Gerente da Loja não pode ser movido)
  └─ 2ª Configuração do PO com restrições de caixa

[RODADA 2]  ← status: ROUND_2
[RODADA 3]  ← status: ROUND_3
  └─ Mesmo fluxo do motor da Rodada 1

[RESULTADO FINAL]  ← status: FINISHED
  └─ Ranking final por % EBITDA acumulado das 3 rodadas
```

---

## 4. Configuração da Loja (Plano Operacional — PO)

### 4.1 Caixa Disponível
- Cada loja começa com **R$ 700.000** de caixa
- O caixa é usado para comprar estoque e pagar CAPEXs
- Se o total gasto superar R$ 700.000, incide **juros de 12% ao mês** sobre o valor excedente
- **Não é possível** usar receita de vendas para repor o caixa em nenhuma hipótese

### 4.2 Estoque por Categoria

| Categoria | Custo Unitário | Estoque Disponível (por sessão) |
|---|---|---|
| Perecíveis | R$ 20,00 | 4.000 unidades |
| Mercearia | R$ 30,00 | 6.000 unidades |
| Eletro | R$ 500,00 | 700 unidades |
| Hipel | R$ 45,00 | 5.000 unidades |
| **Total** | | **15.700 unidades** |

- Previsão de venda = 100% do estoque disponível por sessão
- **Disponibilidade da loja** = Quantidade Comprada pela loja / Estoque Total Disponível
  - Ex.: Loja compra 670 Perecíveis de 1.000 disponíveis → Disponibilidade Perecíveis = 67%
  - A disponibilidade geral é a média ponderada das categorias
- Disponibilidade é um dos 3 critérios de distribuição de demanda

### 4.3 Precificação
- O Gerente Comercial define a **margem comercial (%)** por categoria
- `Preço de Venda = Custo Unitário × (1 + Margem%)`
- O **Preço da Cesta** (média ponderada pelo volume de cada categoria) é um dos 3 critérios de distribuição de demanda
- A margem pode ser redefinida na 2ª Configuração

### 4.4 Operadores

| Tipo | Salário/mês | Impacto |
|---|---|---|
| Operador de Caixa | R$ 1.000,00 | Compõe o numerador do CSAT |
| Operador de Serviço | R$ 1.200,00 | Determina o SLA de resolução de incidentes |

### 4.5 CAPEXs

| CAPEX | Valor de Aquisição | Dias parados se NÃO contratado (evento ocorrer) | Efeito se contratado |
|---|---|---|---|
| Segurança | R$ 50.000 | 2 + SLA dias | +R$ 100/mês em licença (20% de R$500) |
| Balança/Freezer | R$ 75.000 | 1 + SLA dias (só Perecíveis) | Elimina manutenção de R$ 400/mês |
| Redes | R$ 80.000 | 2 + SLA dias | Sem custo recorrente adicional |
| Site | R$ 65.000 | 1 + SLA dias | +R$ 150/mês em licença (30% de R$500) |
| Self Checkout | R$ 80.000 | 2 + SLA dias (pico de clientes) | +R$ 80/mês por unidade × 4 = R$ 320/mês |
| Melhoria Contínua | R$ 45.000 | 0 dias (sem evento de incidente) | Sem custo recorrente adicional |
| **Total possível** | **R$ 395.000** | | |

> **Lógica "2 + SLA":** dias parados = dias fixos do CAPEX + dias do SLA da loja.  
> Ex.: CAPEX Segurança não contratado + ataque ocorre + loja tem 3 Ops. Serviço (SLA=3) → **5 dias parada**.

---

## 5. SLA de Serviços

| Qtd. Operadores de Serviço | SLA (dias para resolver) |
|---|---|
| 0 | 6 dias |
| 1 | 5 dias |
| 2 | 4 dias |
| 3 | 3 dias |
| 4 | 2 dias |
| 5 | 1 dia |

O SLA impacta diretamente nas vendas: a loja perde receita proporcional aos dias parados.

---

## 6. CSAT

Representa o nível de serviço percebido pelo cliente. É um dos 3 critérios de distribuição de demanda.

**Fórmula:**
```
CSAT = (Operadores de Caixa Contratados / 10) × (% Acertos no Quiz)
```

- O denominador **10** é o quadro ideal de operadores de caixa
- O Quiz é aplicado a cada rodada com perguntas sobre gestão de negócio
- Resultado expresso em percentual de acertos

**Exemplos:**
- 5 operadores + 90% quiz → CSAT = 50% × 90% = **45%**
- 10 operadores + 80% quiz → CSAT = 100% × 80% = **80%**

---

## 7. Distribuição de Demanda

A demanda total da sessão é distribuída entre as 4 lojas com base em 3 indicadores.

### Regra de Pontuação por Indicador

| Posição entre as lojas | Pontos |
|---|---|
| 1º (melhor) | 4 |
| 2º | 3 |
| 3º | 2 |
| 4º (pior) | 1 |

> Preço da Cesta: **menor = melhor** (1º lugar = menor preço)  
> Disponibilidade e CSAT: **maior = melhor** (1º lugar = maior valor)

### Fórmula
```
Pontuação da Loja    = Pontos(Preço) + Pontos(Disponibilidade) + Pontos(CSAT)
Demand Share (%)     = Pontuação da Loja / Soma total de pontos das 4 lojas
Demanda da Loja (R$) = Demand Share × Demanda Total da Sessão
```

### Exemplo Validado (Documento Oficial)

| Loja | Preço Cesta | Disponibilidade | CSAT | Pontuação | % Demanda |
|---|---|---|---|---|---|
| Bretas | 894,95 | 84% | 100% | 9 | 30% |
| GBarbosa | 895,91 | 52% | 70% | 6 | 20% |
| Prezunic | 871,07 | 45% | 90% | 8 | 27% |
| Giga | 894,30 | 56% | 81% | 7 | 23% |
| **Total** | | | | **30** | **100%** |

---

## 8. Fórmula Completa de EBITDA

Sequência de cálculo do resultado por loja por rodada:

```
(+) Receita Bruta         = Σ (Qtd Vendida × Preço de Venda) por categoria
(-) Impostos              = Σ (Receita Bruta categoria × Taxa Imposto categoria)
(=) Receita Líquida

(-) Custo de Venda        = Σ (Qtd Vendida × Custo Unitário) por categoria
(=) Massa Margem Líquida (Margem Bruta)

(-) Quebras               = Σ (Estoque Residual × % Quebra) por categoria
(-) Aging                 = Σ (Estoque Residual × % Aging) por categoria
    onde: Estoque Residual = Estoque Comprado - Qtd Vendida

(=) Massa Final

(-) Folha de Pagamento    = (Op. Caixa × R$1.000) + (Op. Serviço × R$1.200)
(-) Manutenção            = R$ 400 (zerado se CAPEX Balança/Freezer contratado)
(-) Licenças de Software  = Σ licenças ativas conforme tabela abaixo
(-) Juros s/ Excedente    = MAX(0, (Total Gasto - 700.000) × 12%)
(-) Perdas por SLA        = Receita diária × dias parados por incidente

(=) EBITDA
(%) % EBITDA              = EBITDA / Receita Bruta
```

### Impostos por Categoria (Tabela Oficial)

> Decisão registrada: divergência entre tabela oficial e gabarito para Eletro.  
> **Prevalece a tabela oficial.**

| Categoria | % Imposto |
|---|---|
| Perecíveis | 12% |
| Mercearia | 7% |
| Eletro | 25% |
| Hipel | 17% |

### Quebras e Aging por Categoria

| Categoria | % Quebras | % Aging |
|---|---|---|
| Perecíveis | 2,0% | 5,8% |
| Mercearia | 1,5% | 0,8% |
| Eletro | 0,0% | 1,3% |
| Hipel | 1,0% | 1,1% |

> Quebras e Aging incidem sobre o **estoque total não vendido ao final da última rodada**.

### Licenciamento de Software

| Licença | Valor | Condição de Ativação |
|---|---|---|
| Sistema Operacional | R$ 120,00/usuário/mês | Sempre ativo |
| PDVs + Self Checkout | R$ 80,00/equipamento/mês | Sempre ativo + CAPEX Self Checkout |
| Site | R$ 500,00/mês | Sempre ativo |
| Sistemas de Segurança | R$ 500,00/mês | Sempre ativo |

---

## 9. Reconfiguração (2ª Configuração)

Ocorre após a Rodada 1, antes das Rodadas 2 e 3.

**O que PODE:**
- Usar saldo de caixa não utilizado da 1ª Configuração
- Usar valor de CAPEX que ainda não foi implementado
- Redefinir margem de pricing por categoria
- Contratar ou demitir operadores

**O que NÃO PODE:**
- Usar receita das vendas já realizadas
- Remanejar estoque entre categorias
- Transferir mais de 2 jogadores de uma mesma loja de origem

**Movimentação de Jogadores:**
- Máximo **2 jogadores** transferidos por loja por reconfiguração
- O **Gerente da Loja** nunca pode ser transferido
- Loja de destino não pode ter 2 pessoas com o mesmo papel

---

## 10. Fora do Escopo desta Spec

- Decisões de stack tecnológica → `plan.md`
- Estrutura de banco de dados → `plan.md`
- Contratos de API → `plan.md`
- Autenticação e gerenciamento de sessão → `plan.md`
