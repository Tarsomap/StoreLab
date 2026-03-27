import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { SlaInput, SlaResult, SlaEventResult } from './interfaces';
import { SLA_TABLE } from './constants';

@Injectable()
export class SlaService {
  computeEvents(input: SlaInput): SlaResult {
    const { sessionId, storeId, round, serviceOperators, capexDecisions, grossRevenue } = input;

    const slaAddition = SLA_TABLE[serviceOperators] ?? SLA_TABLE[5];
    const events: SlaEventResult[] = [];

    for (const capex of capexDecisions) {
      if (capex.implemented) {
        events.push({
          capexOptionId: capex.capexOptionId,
          capexType: capex.type,
          occurred: false,
          daysDown: 0,
          revenueLost: 0,
        });
        continue;
      }

      const seed = `${sessionId}-${storeId}-${round}-${capex.type}`;
      const hash = crypto.createHash('sha256').update(seed).digest('hex');
      const r = parseInt(hash.slice(0, 8), 16) / 0xffffffff;

      const occurred = r < capex.slaRiskPercent;
      let daysDown = 0;
      let revenueLost = 0;

      if (occurred) {
        daysDown = capex.downtimeFixedDays + slaAddition;
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
