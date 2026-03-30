import { Injectable } from '@nestjs/common';
import { CategoryEngineInput, DemandResult, StoreIndicators } from './interfaces';

/**
 * Simula como a demanda se divide entre as lojas com base em preço, “prateleira” e satisfação.
 * Cada loja recebe ranks competitivos; quem soma ranks menores fica melhor posicionada e leva fatia maior.
 */
@Injectable()
export class DemandService {
  /**
   * Mede o quanto a loja “encheu” a prateleira em relação ao estoque disponível na sessão.
   *
   * Fórmula: total comprado ÷ total disponível na sessão.
   * No contexto do jogo, se a loja compra pouco perto do que o mercado oferece, parece mais vazia;
   * se compra proporcionalmente mais, melhora a percepção de disponibilidade. Retornamos 0 se não há
   * estoque disponível na sessão, porque não faz sentido dividir por zero — nesse caso tratamos como
   * indisponibilidade total.
   *
   * @param categories - Decisões de compra e limites de estoque por categoria.
   * @returns Número entre 0 e tipicamente 1 (pode passar de 1 se comprar acima do disponível na sessão).
   */
  computeAvailability(categories: CategoryEngineInput[]): number {
    const totalPurchased = categories.reduce((sum, c) => sum + c.stockPurchased, 0);
    const totalAvailable = categories.reduce((sum, c) => sum + c.sessionStockAvailable, 0);
    if (totalAvailable === 0) return 0;
    // Razão compra/disponível: quanto mais perto de “usar tudo que a sessão permite”, maior a disponibilidade percebida.
    return totalPurchased / totalAvailable;
  }

  /**
   * Calcula o preço médio da cesta da loja (ponderado pelo volume comprado).
   *
   * Para cada categoria, o preço de venda simulado é custo × (1 + margem); multiplicamos pela quantidade
   * comprada e somamos, depois dividimos pelo total de unidades. Assim categorias com mais peso na compra
   * puxam mais o preço médio — reflete o que o cliente “vê” na cesta típica da loja.
   * Se não houve compra, devolvemos 0 para não dividir por zero.
   *
   * @param categories - Margens e custos por categoria com volumes comprados.
   * @returns Preço médio unitário da cesta em reais.
   */
  computeBasketPrice(categories: CategoryEngineInput[]): number {
    const totalPurchased = categories.reduce((sum, c) => sum + c.stockPurchased, 0);
    if (totalPurchased === 0) return 0;
    const weightedSum = categories.reduce(
      (sum, c) => sum + c.stockPurchased * c.unitCost * (1 + c.priceMargin),
      0,
    );
    // Média ponderada: soma(valor × peso) / soma(pesos), onde o peso é a quantidade comprada.
    return weightedSum / totalPurchased;
  }

  /**
   * Ranqueia todas as lojas em preço, disponibilidade e CSAT e reparte a demanda entre elas.
   *
   * Primeiro obtemos três rankings (empate = mesmo rank). Somamos os três ranks em rankScore.
   * Depois cada loja recebe demandShare = rankScore / soma de todos os rankScores.
   * Intuição: em cada eixo, quem vai melhor recebe rank numérico maior (ex.: melhor preço = rank mais alto).
   * Por isso rankScore alto significa bom desempenho nos três critérios ao mesmo tempo; a fatia é proporcional
   * a esse score, então quem soma mais leva mais demanda — competição multi-atributo sem pesos extras fixos.
   *
   * @param indicators - CSAT, disponibilidade e preço da cesta por loja.
   * @returns Lista com ranks, score e fatia de demanda por loja.
   */
  computeDemand(indicators: StoreIndicators[]): DemandResult[] {
    if (indicators.length === 0) return [];

    // Preço: quanto menor a cesta, melhor para o cliente → “menor é melhor” no ranking.
    const priceRanks = this.rankIndicator(indicators, 'basketPrice', true);
    // Disponibilidade e CSAT: quanto maior, melhor.
    const availabilityRanks = this.rankIndicator(indicators, 'availability', false);
    const csatRanks = this.rankIndicator(indicators, 'csat', false);

    const results: DemandResult[] = indicators.map((store) => {
      const priceRank = priceRanks.get(store.storeId) ?? 1;
      const availabilityRank = availabilityRanks.get(store.storeId) ?? 1;
      const csatRank = csatRanks.get(store.storeId) ?? 1;
      const rankScore = priceRank + availabilityRank + csatRank;
      return {
        storeId: store.storeId,
        priceRank,
        availabilityRank,
        csatRank,
        rankScore,
        demandShare: 0,
      };
    });

    const totalScore = results.reduce((sum, r) => sum + r.rankScore, 0);
    results.forEach((r) => {
      // Quanto maior a soma dos três ranks, maior a fatia; o denominador normaliza para as fatias somarem 1.
      r.demandShare = totalScore > 0 ? r.rankScore / totalScore : 0;
    });

    return results;
  }

  /**
   * Ordena as lojas por um indicador e atribui ranks competitivos (empates recebem o mesmo rank).
   *
   * Usamos o maior rank numérico para o melhor desempenho na ordenação final (ex.: em “maior é melhor”,
   * a loja com maior valor fica no topo e recebe rank alto). Empates dividem o mesmo número de rank;
   * depois avançamos o “bloco” de ranks para as próximas posições, para não pular números indevidamente.
   *
   * @param indicators - Lista de lojas e seus indicadores.
   * @param key - Qual campo ordenar (preço, disponibilidade ou CSAT).
   * @param lowerIsBetter - Se verdadeiro, valores menores são melhores (caso do preço da cesta).
   * @returns Mapa loja → rank numérico usado nas somas e na demanda.
   */
  private rankIndicator(
    indicators: StoreIndicators[],
    key: keyof Pick<StoreIndicators, 'basketPrice' | 'availability' | 'csat'>,
    lowerIsBetter: boolean,
  ): Map<string, number> {
    const n = indicators.length;
    const maxRank = n;

    const sorted = [...indicators].sort((a, b) => {
      const diff = a[key] - b[key];
      // Invertemos a ordem quando “maior é melhor”, para o melhor candidato ficar primeiro na lista.
      return lowerIsBetter ? diff : -diff;
    });

    const rankMap = new Map<string, number>();
    let currentRank = maxRank;

    let i = 0;
    while (i < sorted.length) {
      let j = i;
      // Agrupa todas as lojas com o mesmo valor do indicador (empate).
      while (j < sorted.length && sorted[j][key] === sorted[i][key]) {
        j++;
      }
      const tiedCount = j - i;
      const tiedRank = currentRank - tiedCount + 1;
      for (let k = i; k < j; k++) {
        rankMap.set(sorted[k].storeId, tiedRank);
      }
      // Desce o teto de rank pelo tamanho do grupo empatado, para o próximo grupo ficar abaixo.
      currentRank -= tiedCount;
      i = j;
    }

    return rankMap;
  }
}
