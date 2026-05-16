-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "elapsedBeforePause" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "timerDuration" INTEGER,
ADD COLUMN     "timerEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "timerPausedAt" TIMESTAMP(3),
ADD COLUMN     "timerStartedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PlayerRoundStatus" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "finishedAt" TIMESTAMP(3),
    "remainingTime" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerRoundStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlayerRoundStatus_sessionId_userId_round_key" ON "PlayerRoundStatus"("sessionId", "userId", "round");

-- AddForeignKey
ALTER TABLE "PlayerRoundStatus" ADD CONSTRAINT "PlayerRoundStatus_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerRoundStatus" ADD CONSTRAINT "PlayerRoundStatus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
