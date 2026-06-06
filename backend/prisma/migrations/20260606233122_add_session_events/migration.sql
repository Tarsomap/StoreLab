-- CreateTable
CREATE TABLE "EventTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "EventTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionEventConfig" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "eventTemplateId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,

    CONSTRAINT "SessionEventConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventTemplate_name_key" ON "EventTemplate"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SessionEventConfig_sessionId_round_key" ON "SessionEventConfig"("sessionId", "round");

-- AddForeignKey
ALTER TABLE "SessionEventConfig" ADD CONSTRAINT "SessionEventConfig_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionEventConfig" ADD CONSTRAINT "SessionEventConfig_eventTemplateId_fkey" FOREIGN KEY ("eventTemplateId") REFERENCES "EventTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
