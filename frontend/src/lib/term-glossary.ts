export const GLOSSARY = {
  CAPEX:
    'Investimento em ativos da loja (Capital Expenditure): equipamentos e melhorias permanentes, como freezer, câmeras e redes. Sai direto do caixa quando você implementa. Em troca, reduz custo de manutenção e protege a loja de incidentes que fazem perder venda. Quem não investe fica exposto.',

  EBITDA:
    'Resultado operacional da loja antes de juros e impostos sobre o lucro. Parte da receita líquida e desconta tudo que a operação consome: custo da mercadoria, perdas de estoque (quebras e aging), folha, manutenção, licenças, juros e perdas por SLA. É o principal indicador do jogo e a base do ranking final.',

  EBITDA_PCT:
    'O EBITDA em proporção do total de vendas. Mostra a eficiência da loja: de cada real que entra, quanto sobra como resultado. Duas lojas podem vender igual e ter eficiências bem diferentes.',

  CSAT:
    'Satisfação do cliente (Customer Satisfaction). Mede o quão bem a loja atende, combinando o número de operadores de caixa com o desempenho da equipe no quiz de gestão. Um CSAT alto puxa mais clientes pra sua loja e tira demanda das concorrentes.',

  SLA:
    'Nível de serviço (Service Level Agreement): o tempo que a loja leva pra se recuperar quando acontece um incidente. Mais operadores de serviço significam recuperação mais rápida e menos dias parada. Poucos operadores, mais tempo parado e mais venda perdida quando algo dá errado.',

  SLA_LOSS:
    'Receita perdida por não cumprir o nível mínimo de serviço. Ocorre quando itens de CAPEX críticos (câmeras, freezer, rede) não foram implementados. Essa perda é calculada automaticamente pelo motor e descontada do seu DRE.',

  DRE:
    'Demonstrativo de Resultados (DRE): resumo financeiro completo da loja para a rodada. Mostra o caminho do faturamento bruto até o EBITDA final — cada linha representa uma decisão (preço, estoque, operadores, CAPEX) que impacta o resultado.',

  AGING:
    'Perda por mercadoria encalhada, que envelhece no estoque sem ser vendida. Cada categoria perde valor num ritmo diferente (perecível estraga rápido, eletro fica obsoleto). Quanto mais sobra parado, maior o desconto no resultado.',

  QUEBRAS:
    'Perda de mercadoria por dano ou furto. Cada categoria tem seu próprio risco de quebra, calculado sobre o estoque que sobrou sem vender. Comprar muito além da demanda aumenta essa perda.',

  JUROS:
    'Custo de se financiar. Se a loja gasta mais em estoque e CAPEX do que tem em caixa, ela "pega emprestado" e paga juros sobre o que faltou. Quanto mais você estoura o caixa, maior a conta no fim da rodada.',

  LICENCAS:
    'Custo recorrente dos sistemas que a loja usa pra operar (sistema operacional, PDV, site, segurança). Cresce conforme a estrutura: mais operadores e mais equipamentos de TI implementados aumentam esse valor.',

  MARKET_SHARE:
    'A fatia da demanda total do período que vai pra sua loja. Disputada com as concorrentes por três fatores: preço da cesta, disponibilidade de produto e satisfação do cliente. Quem vai melhor nos três atrai mais clientes.',

  DISPONIBILIDADE:
    'O quanto a sua loja consegue abastecer da demanda possível: o estoque que você comprou em relação ao total disponível no mercado. Disponibilidade baixa é cliente chegando e não achando produto, o que derruba suas vendas e a sua fatia de demanda.',
} as const;

export type GlossaryTerm = keyof typeof GLOSSARY;
