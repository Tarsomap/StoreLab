-- CreateEnum
CREATE TYPE "RandomEventType" AS ENUM ('OPERATIONAL_FAILURE', 'REGULATORY_CHANGE', 'COMPETITOR_PROMOTION', 'REPUTATION_DAMAGE', 'LOT_CONTAMINATION', 'INVENTORY_THEFT', 'PAYMENT_SYSTEM_FAILURE', 'CYBER_ATTACK', 'DATA_BREACH', 'LOGISTICS_PROBLEM', 'POWER_OUTAGE', 'CLIMATE_EVENT', 'INPUT_COST_INCREASE', 'DEMAND_SURGE');

-- AlterTable
ALTER TABLE "RoundResult" ADD COLUMN     "randomEventCost" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "RandomEvent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "eventType" "RandomEventType" NOT NULL,
    "occurred" BOOLEAN NOT NULL,
    "impactData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RandomEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RandomEvent_storeId_round_eventType_key" ON "RandomEvent"("storeId", "round", "eventType");

-- AddForeignKey
ALTER TABLE "RandomEvent" ADD CONSTRAINT "RandomEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RandomEvent" ADD CONSTRAINT "RandomEvent_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
