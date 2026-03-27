-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('FACILITATOR', 'PLAYER');

-- CreateEnum
CREATE TYPE "StoreRole" AS ENUM ('STORE_MANAGER', 'SUPPLY_MANAGER', 'COMMERCIAL_MANAGER', 'OPERATIONAL_MANAGER', 'SERVICE_MANAGER');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('SETUP', 'ROUND_1_CONFIG', 'ROUND_1', 'RECONFIGURATION', 'ROUND_2', 'ROUND_3', 'FINISHED');

-- CreateEnum
CREATE TYPE "CategoryName" AS ENUM ('PERECIVEIS', 'MERCEARIA', 'ELETRO', 'HIPEL');

-- CreateEnum
CREATE TYPE "CapexType" AS ENUM ('SECURITY', 'FREEZER', 'NETWORK', 'SITE', 'SELF_CHECKOUT', 'AUTOMATION');

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" "CategoryName" NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "taxRate" DOUBLE PRECISION NOT NULL,
    "breakageRate" DOUBLE PRECISION NOT NULL,
    "agingRate" DOUBLE PRECISION NOT NULL,
    "stockAvailable" INTEGER NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapexOption" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CapexType" NOT NULL,
    "acquisitionCost" DOUBLE PRECISION NOT NULL,
    "downtimeFixedDays" INTEGER NOT NULL,
    "monthlyLicenseDelta" DOUBLE PRECISION NOT NULL,
    "maintenanceSaving" DOUBLE PRECISION NOT NULL,
    "slaRiskPercent" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "CapexOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "refreshTokenHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'SETUP',
    "facilitatorId" TEXT NOT NULL,
    "totalDemand" DOUBLE PRECISION NOT NULL,
    "initialCash" DOUBLE PRECISION NOT NULL DEFAULT 700000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionCategoryConfig" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "stockAvailable" INTEGER NOT NULL,

    CONSTRAINT "SessionCategoryConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accessCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreMember" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "StoreRole" NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationalPlan" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "configVersion" INTEGER NOT NULL,
    "cashierOperators" INTEGER NOT NULL,
    "serviceOperators" INTEGER NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationalPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoCategoryDecision" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "stockPurchased" INTEGER NOT NULL,
    "priceMargin" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PoCategoryDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoCapexDecision" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "capexOptionId" TEXT NOT NULL,
    "implemented" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PoCapexDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizQuestion" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizOption" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "QuizOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserQuizAnswer" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserQuizAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizAnswer" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "correctAnswers" INTEGER NOT NULL,
    "scorePercentage" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoundResult" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "csat" DOUBLE PRECISION NOT NULL,
    "availability" DOUBLE PRECISION NOT NULL,
    "basketPrice" DOUBLE PRECISION NOT NULL,
    "rankScore" INTEGER NOT NULL,
    "demandShare" DOUBLE PRECISION NOT NULL,
    "grossRevenue" DOUBLE PRECISION NOT NULL,
    "taxAmount" DOUBLE PRECISION NOT NULL,
    "netRevenue" DOUBLE PRECISION NOT NULL,
    "costOfGoods" DOUBLE PRECISION NOT NULL,
    "breakageAmount" DOUBLE PRECISION NOT NULL,
    "agingAmount" DOUBLE PRECISION NOT NULL,
    "payrollCost" DOUBLE PRECISION NOT NULL,
    "maintenanceCost" DOUBLE PRECISION NOT NULL,
    "licenseCost" DOUBLE PRECISION NOT NULL,
    "interestCost" DOUBLE PRECISION NOT NULL,
    "slaRevenueLost" DOUBLE PRECISION NOT NULL,
    "ebitda" DOUBLE PRECISION NOT NULL,
    "ebitdaPercentage" DOUBLE PRECISION NOT NULL,
    "cashUsed" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoundResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlaEvent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "capexOptionId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "occurred" BOOLEAN NOT NULL,
    "daysDown" INTEGER NOT NULL,
    "revenueLost" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlaEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerTransfer" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromStoreId" TEXT NOT NULL,
    "toStoreId" TEXT NOT NULL,
    "role" "StoreRole" NOT NULL,
    "transferredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CapexOption_type_key" ON "CapexOption"("type");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SessionCategoryConfig_sessionId_categoryId_key" ON "SessionCategoryConfig"("sessionId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Store_accessCode_key" ON "Store"("accessCode");

-- CreateIndex
CREATE UNIQUE INDEX "StoreMember_storeId_role_key" ON "StoreMember"("storeId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "StoreMember_storeId_userId_key" ON "StoreMember"("storeId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "OperationalPlan_storeId_configVersion_key" ON "OperationalPlan"("storeId", "configVersion");

-- CreateIndex
CREATE UNIQUE INDEX "PoCategoryDecision_planId_categoryId_key" ON "PoCategoryDecision"("planId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "PoCapexDecision_planId_capexOptionId_key" ON "PoCapexDecision"("planId", "capexOptionId");

-- CreateIndex
CREATE UNIQUE INDEX "QuizQuestion_sessionId_round_order_key" ON "QuizQuestion"("sessionId", "round", "order");

-- CreateIndex
CREATE UNIQUE INDEX "UserQuizAnswer_userId_questionId_round_key" ON "UserQuizAnswer"("userId", "questionId", "round");

-- CreateIndex
CREATE UNIQUE INDEX "QuizAnswer_storeId_round_key" ON "QuizAnswer"("storeId", "round");

-- CreateIndex
CREATE UNIQUE INDEX "RoundResult_storeId_round_key" ON "RoundResult"("storeId", "round");

-- CreateIndex
CREATE UNIQUE INDEX "SlaEvent_storeId_capexOptionId_round_key" ON "SlaEvent"("storeId", "capexOptionId", "round");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_facilitatorId_fkey" FOREIGN KEY ("facilitatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionCategoryConfig" ADD CONSTRAINT "SessionCategoryConfig_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionCategoryConfig" ADD CONSTRAINT "SessionCategoryConfig_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreMember" ADD CONSTRAINT "StoreMember_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreMember" ADD CONSTRAINT "StoreMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalPlan" ADD CONSTRAINT "OperationalPlan_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoCategoryDecision" ADD CONSTRAINT "PoCategoryDecision_planId_fkey" FOREIGN KEY ("planId") REFERENCES "OperationalPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoCategoryDecision" ADD CONSTRAINT "PoCategoryDecision_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoCapexDecision" ADD CONSTRAINT "PoCapexDecision_planId_fkey" FOREIGN KEY ("planId") REFERENCES "OperationalPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoCapexDecision" ADD CONSTRAINT "PoCapexDecision_capexOptionId_fkey" FOREIGN KEY ("capexOptionId") REFERENCES "CapexOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizOption" ADD CONSTRAINT "QuizOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "QuizQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserQuizAnswer" ADD CONSTRAINT "UserQuizAnswer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserQuizAnswer" ADD CONSTRAINT "UserQuizAnswer_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserQuizAnswer" ADD CONSTRAINT "UserQuizAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserQuizAnswer" ADD CONSTRAINT "UserQuizAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "QuizQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserQuizAnswer" ADD CONSTRAINT "UserQuizAnswer_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "QuizOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAnswer" ADD CONSTRAINT "QuizAnswer_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundResult" ADD CONSTRAINT "RoundResult_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundResult" ADD CONSTRAINT "RoundResult_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlaEvent" ADD CONSTRAINT "SlaEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlaEvent" ADD CONSTRAINT "SlaEvent_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlaEvent" ADD CONSTRAINT "SlaEvent_capexOptionId_fkey" FOREIGN KEY ("capexOptionId") REFERENCES "CapexOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerTransfer" ADD CONSTRAINT "PlayerTransfer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerTransfer" ADD CONSTRAINT "PlayerTransfer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerTransfer" ADD CONSTRAINT "PlayerTransfer_fromStoreId_fkey" FOREIGN KEY ("fromStoreId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerTransfer" ADD CONSTRAINT "PlayerTransfer_toStoreId_fkey" FOREIGN KEY ("toStoreId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
