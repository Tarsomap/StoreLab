# Diferenciais Competitivos — StoreLab

> Objetivo: listar o que vai diferenciar o StoreLab.

---

## Como ler este documento

| Camada | Significado |
|--------|-------------|
| 🟢 **Fase C — Prioridade** | No roadmap, implementar a partir de quinta-feira (02/04) |
| 🔵 **Bônus alcançável** | Fora do roadmap original, mas cabem no stack e no prazo |
| ⚪ **Visão de futuro** | Não implementáveis em junho, mas válidos para mencionar na apresentação como roadmap do produto |

---

## 🟢 Fase C — Prioridade

### 1. Export de Resultados em PDF
Ao final de cada sessão, o facilitador gera um PDF com o ranking completo,
o EBITDA de cada loja por rodada, e o caixa final. O documento pode ser
impresso ou enviado por e-mail para os participantes logo após a dinâmica —
transformando o jogo em um artefato concreto de aprendizado que o participante
leva para casa.

---

### 2. Dashboard com Gráficos de Evolução
Os resultados deixam de ser só uma tabela de números. Gráficos de linha mostram
a evolução do EBITDA de cada loja ao longo das 3 rodadas; gráficos de barra
comparam o desempenho entre lojas lado a lado. A narrativa visual comunica onde
cada equipe errou e acertou de forma imediata, sem precisar interpretar planilha.

---

### 3. QR Code nos Códigos de Acesso
Quando o facilitador cria uma sessão, o código de 6 caracteres exibe também um
QR Code ao lado. Os jogadores apontam a câmera do celular e entram na sessão
direto — sem digitar nada, sem errar o código. Elimina o atrito do onboarding
na sala e economiza minutos preciosos do tempo da dinâmica.

---

## 🔵 Bônus Alcançável

### 4. Timer de Rodada
O facilitador configura um tempo limite por rodada (ex: 15 minutos). Um countdown
aparece para todos os jogadores em tempo real via WebSocket. Quando o tempo zera,
novos POs são bloqueados automaticamente. Reproduz a pressão da dinâmica presencial
e elimina a necessidade do facilitador controlar o tempo manualmente.

> **Esforço estimado:** baixo — countdown no frontend + evento WebSocket de
> `round:lock` que o backend já suporta conceitualmente.

---

### 5. Simulador "What-If" no PO
Antes de confirmar o Plano Operacional, o gerente pode ajustar qualquer variável
(estoque, margem, CAPEX) e ver o EBITDA projetado recalcular em tempo real, sem
salvar nada. É um modo de "rascunho" que usa o motor de cálculo já existente —
só chama o endpoint de simulação sem persistir. Incentiva a análise de cenários
e torna o aprendizado mais ativo.

> **Esforço estimado:** médio — expor endpoint `/engine/simulate` (POST sem
> persistência) + painel de simulação no frontend.

---

### 6. Comentários do Facilitador por Loja
Após exibir os resultados, o facilitador pode adicionar um parágrafo de feedback
para cada loja ("Loja Alpha apostou alto em Eletro e compensou; Loja Beta
subestimou quebras em Perecíveis"). Esses comentários aparecem no PDF exportado,
transformando o app em uma ferramenta de feedback estruturado — não só um placar.

> **Esforço estimado:** baixo — campo de texto por loja no resultado +
> integração com o PDF export.

---

### 7. Replay de Rodada
O facilitador pode revisar o histórico de decisões de cada loja após o resultado:
quando o gerente confirmou o PO, quais valores escolheu, como o EBITDA evoluiu.
Cria um momento rico de debriefing — "vamos ver o que a Loja Sigma fez diferente
na Rodada 2".

> **Esforço estimado:** médio — os dados já existem no banco, é uma tela de
> visualização nova.

---

### 8. Histórico de Sessões
O facilitador acessa todas as sessões passadas com os resultados preservados.
Permite comparar o desempenho de turmas diferentes ao longo do tempo — útil se
a empresa parceira quiser usar o StoreLab em múltiplos treinamentos e acompanhar
a evolução dos gestores.

> **Esforço estimado:** baixo — os dados já estão no banco, é filtro + listagem
> no dashboard.

---

## ⚪ Visão de Futuro

### 9. Quiz com IA Generativa
As perguntas do quiz deixam de ser fixas e passam a ser geradas dinamicamente
com base nos resultados da rodada anterior. Se uma loja errou no CSAT, as perguntas
focam em atendimento. Se outra teve quebras altas, as perguntas abordam gestão
de perdas. O aprendizado se torna adaptativo e personalizado por equipe.

---

### 10. Análise Pós-Sessão com IA
Após a sessão, o facilitador recebe um relatório gerado por IA identificando
padrões de decisão: "todas as lojas subestimaram Quebras na Rodada 1", "as lojas
com maior CSAT investiram mais em Operações". O facilitador conduz o debriefing
com dados, não com intuição.

---

### 11. Modo Offline / PWA
A sessão funciona mesmo sem internet estável — as ações ficam em fila local e
sincronizam quando a conexão volta. Relevante para workshops em locais com Wi-Fi
instável, como centros de distribuição ou lojas físicas.

---

## Matriz de Prioridade

| # | Diferencial | Esforço | Impacto na demo | Camada |
|---|-------------|---------|-----------------|--------|
| 1 | PDF export | Médio | 🔴 Altíssimo | 🟢 Fase C |
| 4 | Timer de rodada | Baixo | 🔴 Altíssimo | 🔵 Bônus |
| 2 | Gráficos recharts | Médio | 🟠 Alto | 🟢 Fase C |
| 3 | QR Code | Baixo | 🟠 Alto | 🟢 Fase C |
| 6 | Comentários do facilitador | Baixo | 🟡 Médio | 🔵 Bônus |
| 5 | Simulador what-if | Médio | 🟡 Médio | 🔵 Bônus |
| 8 | Histórico de sessões | Baixo | 🟡 Médio | 🔵 Bônus |
| 7 | Replay de rodada | Médio | 🟡 Médio | 🔵 Bônus |
| 9 | Quiz com IA | Alto | 🟢 Alto (futuro) | ⚪ Futuro |
| 10 | Análise com IA | Alto | 🟢 Alto (futuro) | ⚪ Futuro |
| 11 | Modo offline/PWA | Alto | 🔵 Baixo (curto prazo) | ⚪ Futuro |
