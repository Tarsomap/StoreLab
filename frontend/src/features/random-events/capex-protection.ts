/**
 * Relação evento aleatório → CAPEX que mitiga seu risco.
 *
 * Espelha 1:1 o backend (fonte da verdade), seguindo a convenção do projeto de
 * regras duplicadas e sincronizadas entre front e back:
 *   - tipos e `protectingCapex`: `backend/src/engine/random-events.service.ts` (EVENT_DEFINITIONS)
 *   - labels amigáveis dos CAPEX: `backend/src/seed/seed.ts`
 *
 * Mecânica (computeRisk no backend): cada CAPEX protetor implementado reduz o
 * risco proporcionalmente; implementar TODOS os listados zera o risco do evento.
 * Por isso a UI usa o verbo "Mitigável" (não "Evitável"), refletindo a redução
 * proporcional.
 *
 * O engine é congelado (não muda sem testes), então este espelho é estável.
 */

/** Label amigável de cada CAPEX, idêntico ao seed do backend. */
const CAPEX_LABELS: Record<string, string> = {
  SECURITY: 'Segurança',
  FREEZER: 'Balança / Freezer',
  NETWORK: 'Redes',
  SITE: 'Melhorias no Site',
  SELF_CHECKOUT: 'Self Checkout',
  AUTOMATION: 'Melhoria Contínua',
};

/** Tipos de CAPEX (em type, não label) que reduzem o risco de cada evento. */
const EVENT_PROTECTING_CAPEX: Record<string, string[]> = {
  OPERATIONAL_FAILURE: ['AUTOMATION'],
  REGULATORY_CHANGE: ['SECURITY', 'FREEZER'],
  COMPETITOR_PROMOTION: ['SITE', 'SELF_CHECKOUT'],
  REPUTATION_DAMAGE: ['SITE', 'SECURITY'],
  LOT_CONTAMINATION: ['FREEZER'],
  INVENTORY_THEFT: ['SECURITY'],
  PAYMENT_SYSTEM_FAILURE: ['NETWORK'],
  CYBER_ATTACK: ['SECURITY', 'NETWORK'],
  DATA_BREACH: ['SECURITY'],
  LOGISTICS_PROBLEM: ['AUTOMATION'],
  POWER_OUTAGE: ['NETWORK', 'AUTOMATION'],
  // Sem CAPEX protetor (eventos de mercado/clima ou apenas mitigados por capacidade):
  DEMAND_SURGE: [],
  CLIMATE_EVENT: [],
  INPUT_COST_INCREASE: [],
};

/**
 * Retorna os labels dos CAPEX que mitigam o evento informado.
 * Lista vazia = evento não mitigável por CAPEX.
 */
export function getProtectingCapexLabels(eventType: string): string[] {
  const types = EVENT_PROTECTING_CAPEX[eventType] ?? [];
  return types.map((type) => CAPEX_LABELS[type] ?? type);
}
