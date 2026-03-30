import { Injectable } from '@nestjs/common';
import { IDEAL_CASHIER_OPERATORS } from './constants';

/**
 * Calcula o CSAT (satisfação do cliente) a partir do esforço no caixa e do quiz.
 * No jogo, mais operadores de caixa e melhor desempenho no quiz elevam a satisfação,
 * mas o valor final fica sempre entre 0 e 1 para combinar com as outras fórmulas.
 */
@Injectable()
export class CsatService {
  /**
   * Combina operadores de caixa e nota do quiz em um único índice de satisfação.
   *
   * Fórmula (conceito): (operadores / ideal) × nota do quiz.
   * Explicamos no jogo assim: a loja precisa de uma “linha de caixa” próxima do ideal;
   * essa proporção é multiplicada pelo conhecimento medido no quiz, porque atendimento rápido
   * só gera satisfação real se o time também acerta as decisões (preço, estoque, etc.).
   * Dividimos pelo número ideal de caixas para transformar “quantos caixas” em um fator entre 0 e 1
   * antes de multiplicar pela nota — assim não inflamos o CSAT só por colocar caixas demais sem conteúdo.
   * A nota do quiz já chega como decimal entre 0 e 1 (o serviço principal converte de percentual).
   *
   * @param cashierOperators - Quantidade de operadores de caixa contratados no plano.
   * @param quizScorePercentage - Desempenho no quiz entre 0 e 1 (ex.: 0,85 = 85%).
   * @returns CSAT limitado ao intervalo [0, 1] para uso na demanda e nos resultados.
   */
  calculate(cashierOperators: number, quizScorePercentage: number): number {
    // Relação entre caixas reais e o referencial do jogo, vezes o acerto no quiz.
    const raw = (cashierOperators / IDEAL_CASHIER_OPERATORS) * quizScorePercentage;
    // Cortamos nos extremos para nunca passar de 100% nem ficar negativo por arredondamento.
    return Math.min(1, Math.max(0, raw));
  }
}
