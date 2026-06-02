ALTER TABLE "SessionCategoryConfig"
ADD COLUMN "unitCost" DOUBLE PRECISION,
ADD COLUMN "taxRate" DOUBLE PRECISION,
ADD COLUMN "breakageRate" DOUBLE PRECISION,
ADD COLUMN "agingRate" DOUBLE PRECISION;

UPDATE "SessionCategoryConfig" scc
SET
  "unitCost" = c."unitCost",
  "taxRate" = c."taxRate",
  "breakageRate" = c."breakageRate",
  "agingRate" = c."agingRate"
FROM "Category" c
WHERE scc."categoryId" = c."id";

ALTER TABLE "SessionCategoryConfig"
ALTER COLUMN "unitCost" SET NOT NULL,
ALTER COLUMN "taxRate" SET NOT NULL,
ALTER COLUMN "breakageRate" SET NOT NULL,
ALTER COLUMN "agingRate" SET NOT NULL;

CREATE TABLE "SessionCapexConfig" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "capexOptionId" TEXT NOT NULL,
  "acquisitionCost" DOUBLE PRECISION NOT NULL,
  "downtimeFixedDays" INTEGER NOT NULL,
  "monthlyLicenseDelta" DOUBLE PRECISION NOT NULL,
  "maintenanceSaving" DOUBLE PRECISION NOT NULL,
  "slaRiskPercent" DOUBLE PRECISION NOT NULL,

  CONSTRAINT "SessionCapexConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SessionCapexConfig_sessionId_capexOptionId_key"
ON "SessionCapexConfig"("sessionId", "capexOptionId");

ALTER TABLE "SessionCapexConfig"
ADD CONSTRAINT "SessionCapexConfig_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "Session"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SessionCapexConfig"
ADD CONSTRAINT "SessionCapexConfig_capexOptionId_fkey"
FOREIGN KEY ("capexOptionId") REFERENCES "CapexOption"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
