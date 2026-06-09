export interface EventImpact {
  daysDown: number;
  revenueLost: number;
  penaltyAmount: number;
  csatPenalty: number;
  overflowCsatPenalty: number;
  demandPenaltyFactor: number;
  demandBonusFactor: number;
  inventoryLossAllPercent: number;
  inventoryLossPereciveisPercent: number;
  stockReductionPercent: number;
  costIncreasePercent: number;
}

export interface RandomEventOccurrence {
  type: string;
  label: string;
  description: string;
  impact: EventImpact;
}

export interface RandomEventsPayload {
  round: number;
  events: RandomEventOccurrence[];
}
