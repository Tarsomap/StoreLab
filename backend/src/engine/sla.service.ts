import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { SlaInput, SlaResult, SlaEventResult } from './interfaces';
import { SLA_TABLE } from './constants';

/**
 * Simula riscos de SLA para CAPEX que a loja decidiu não implementar.
 * O sorteio é determinístico (hash da sessão + loja + rodada + tipo) para o mesmo cenário repetir o mesmo resultado.
 */
@Injectable()
export class SlaService {
  /**
   * Para cada CAPEX não implementado, sorteia se ocorre incidente e calcula dias parados e receita perdida.
   *
   * CAPEX implementado não gera risco neste modelo — a decisão de investir “elimina” o evento.
   * Para os não implementados, comparamos um número pseudoaleatório entre 0 e 1 com slaRiskPercent:
   * se o número for menor que o risco, o incidente acontece. Usamos hash SHA-256 em vez de Math.random
   * para que replays, testes e reexecuções da mesma rodada produzam o mesmo desfecho (justo em jogo sério).
   * Dias parados = dias fixos do CAPEX + ajuste da tabela conforme operadores de serviço (mais gente, menos dias extras).
   * Receita perdida = (receita bruta ÷ 30) × dias parados — tratamos a receita do mês como uniforme por dia,
   * então cada dia parado custa uma fração 1/30 do faturamento bruto antes do SLA.
   *
   * @param input - Identificação da rodada, pessoal de serviço, CAPEX e receita bruta base.
   * @returns Eventos por opção de CAPEX e soma da receita perdida.
   */
  computeEvents(input: SlaInput): SlaResult {
    const { sessionId, storeId, round, serviceOperators, capexDecisions, grossRevenue } = input;

    // Operadores acima de 5 usam o mesmo acréscimo mínimo da tabela (última faixa).
    const slaAddition = SLA_TABLE[serviceOperators] ?? SLA_TABLE[5];
    const events: SlaEventResult[] = [];

    for (const capex of capexDecisions) {
      if (capex.implemented) {
        // Investimento feito: sem sorteio, sem perda neste modelo.
        events.push({
          capexOptionId: capex.capexOptionId,
          capexType: capex.type,
          occurred: false,
          daysDown: 0,
          revenueLost: 0,
        });
        continue;
      }

      // Texto fixo garante o mesmo hash para a mesma combinação (reprodutibilidade do “sorteio”).
      const seed = `${sessionId}-${storeId}-${round}-${capex.type}`;
      const hash = crypto.createHash('sha256').update(seed).digest('hex');
      // Primeiros 8 hex = 32 bits; dividimos pelo máximo unsigned 32 bits para obter valor em [0, 1).
      const r = parseInt(hash.slice(0, 8), 16) / 0xffffffff;

      const occurred = r < capex.slaRiskPercent;
      let daysDown = 0;
      let revenueLost = 0;

      if (occurred) {
        // Parada total combina downtime do equipamento/projeto com atraso extra conforme equipe de serviço.
        daysDown = capex.downtimeFixedDays + slaAddition;
        // Perda diária estimada proporcional à receita bruta do período (mês de 30 dias).
        revenueLost = (grossRevenue / 30) * daysDown;
      }

      events.push({
        capexOptionId: capex.capexOptionId,
        capexType: capex.type,
        occurred,
        daysDown,
        revenueLost,
      });
    }

    const totalRevenueLost = events.reduce((sum, e) => sum + e.revenueLost, 0);
    return { events, totalRevenueLost };
  }
}
