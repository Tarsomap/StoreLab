export const GLOSSARY = {
  CAPEX:
    'Investimento em Capital (Capital Expenditure): equipamentos e melhorias permanentes na loja (freezer, câmeras, redes etc.). Cada item selecionado deduz o custo do caixa disponível, mas pode aumentar a demanda, reduzir custos de manutenção e evitar perdas por SLA. O total de CAPEX implementados é descontado do caixa na rodada atual.',

  EBITDA:
    'Resultado operacional da loja (Earnings Before Interest, Taxes, Depreciation & Amortization). Calculado como: Receita Líquida − Custo de Mercadoria − Quebras − Aging − Folha − Manutenção − Juros − Licenças. É o principal indicador do jogo: a loja com maior %EBITDA acumulado ao final vence.',

  EBITDA_PCT:
    'Percentual do EBITDA sobre o Total de Vendas. Indica a eficiência da loja: quanto de cada real vendido vira resultado. É a métrica de desempate no ranking — duas lojas com o mesmo EBITDA em reais podem ter margens bem diferentes.',

  CSAT:
    'Índice de satisfação dos clientes (Customer Satisfaction Score). Calculado combinando a nota do quiz da equipe e o número de operadores ativos: CSAT = (operadores / 10) × %quiz. Um CSAT alto aumenta a demanda da sua loja e atrai market share das concorrentes.',

  SLA:
    'Nível mínimo de serviço (Service Level Agreement). Alguns CAPEX de segurança e infraestrutura protegem a loja contra eventos negativos. Se não implementados, a loja pode sofrer uma "Perda SLA" — receita deduzida automaticamente no resultado da rodada.',

  SLA_LOSS:
    'Receita perdida por não cumprir o nível mínimo de serviço. Ocorre quando itens de CAPEX críticos (câmeras, freezer, rede) não foram implementados. Essa perda é calculada automaticamente pelo motor e descontada do seu DRE.',

  DRE:
    'Demonstrativo de Resultados (DRE): resumo financeiro completo da loja para a rodada. Mostra o caminho do faturamento bruto até o EBITDA final — cada linha representa uma decisão (preço, estoque, operadores, CAPEX) que impacta o resultado.',

  AGING:
    'Perda por vencimento de produtos. Itens perecíveis não vendidos acumulam "aging". Na Rodada 3, esse estoque vencido é descontado do resultado. Gerencie o volume de compras para minimizar essas perdas.',

  QUEBRAS:
    'Perdas por dano ou furto de mercadoria. Na Rodada 3, as quebras sobre estoque acumulado não vendido são contabilizadas automaticamente. Afeta especialmente categorias de maior valor.',

  JUROS:
    'Juros sobre excedente de caixa acima de R$ 700 mil: 12% ao ano. Se o seu caixa acumulado ultrapassar esse limite, a diferença gera custo financeiro. Equilibre investimentos e reserva de caixa para evitar essa dedução.',

  LICENCAS:
    'Custo fixo de licenças de software e sistemas da loja. O valor base é R$ 500 por rodada, podendo ser alterado pelos CAPEX de infraestrutura de TI que a equipe decidir implementar.',

  MARKET_SHARE:
    'Participação percentual da sua loja na demanda total do período. É influenciada pelo CSAT (satisfação) e pelo preço praticado. Lojas com CSAT alto e preços competitivos atraem mais clientes das concorrentes.',

  DISPONIBILIDADE:
    'Percentual de itens disponíveis na gôndola em relação ao estoque planejado. Uma disponibilidade baixa significa que os clientes chegam e não encontram produtos — reduzindo vendas e CSAT.',
} as const;

export type GlossaryTerm = keyof typeof GLOSSARY;
