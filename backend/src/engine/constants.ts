export const IDEAL_CASHIER_OPERATORS = 10;
export const INITIAL_CASH = 700_000;
export const INTEREST_RATE_MONTHLY = 0.12;

// Licenças de software fixas — sempre ativas, independente de CAPEX (spec.md §8)
export const LIC_OS = 120;        // Sistema Operacional: R$120/mês
export const LIC_PDV = 80;        // PDV base (1 equipamento): R$80/mês
export const LIC_SITE = 500;      // Site: R$500/mês
export const LIC_SECURITY = 500;  // Sistemas de Segurança: R$500/mês
// Acréscimos via CAPEX ficam em capexOption.monthlyLicenseDelta (seed):
//   SECURITY → +R$100  |  SITE → +R$150  |  SELF_CHECKOUT → +R$320 (4 × R$80)
export const BASE_LICENSE_COST = LIC_OS + LIC_PDV + LIC_SITE + LIC_SECURITY; // = 1200

export const CASHIER_SALARY = 1_000;
export const SERVICE_SALARY = 1_200;
export const MAINTENANCE_COST = 400;
export const SLA_TABLE: Record<number, number> = { 0: 6, 1: 5, 2: 4, 3: 3, 4: 2, 5: 1 };
