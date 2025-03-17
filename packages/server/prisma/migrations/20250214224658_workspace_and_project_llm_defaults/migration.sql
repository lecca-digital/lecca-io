/*
  Warnings:

  - A unique constraint covering the columns `[FK_defaultAgentLlmConnectionId]` on the table `WorkspacePreferences` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[FK_defaultTaskNamingLlmConnectionId]` on the table `WorkspacePreferences` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Agent" ADD COLUMN     "FK_taskNamingLlmConnectionId" TEXT,
ADD COLUMN     "taskNamingLlmModel" TEXT,
ADD COLUMN     "taskNamingLlmProvider" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "FK_defaultAgentLlmConnectionId" TEXT,
ADD COLUMN     "FK_defaultTaskNamingLlmConnectionId" TEXT,
ADD COLUMN     "defaultAgentLlmModel" TEXT,
ADD COLUMN     "defaultAgentLlmProvider" TEXT,
ADD COLUMN     "defaultTaskNamingInstructions" VARCHAR(1000),
ADD COLUMN     "defaultTaskNamingLlmModel" TEXT,
ADD COLUMN     "defaultTaskNamingLlmProvider" TEXT;

-- AlterTable
ALTER TABLE "WorkspacePreferences" ADD COLUMN     "FK_defaultAgentLlmConnectionId" TEXT,
ADD COLUMN     "FK_defaultTaskNamingLlmConnectionId" TEXT,
ADD COLUMN     "defaultAgentLlmModel" TEXT,
ADD COLUMN     "defaultAgentLlmProvider" TEXT,
ADD COLUMN     "defaultTaskNamingInstructions" VARCHAR(1000),
ADD COLUMN     "defaultTaskNamingLlmModel" TEXT,
ADD COLUMN     "defaultTaskNamingLlmProvider" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "WorkspacePreferences_FK_defaultAgentLlmConnectionId_key" ON "WorkspacePreferences"("FK_defaultAgentLlmConnectionId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspacePreferences_FK_defaultTaskNamingLlmConnectionId_key" ON "WorkspacePreferences"("FK_defaultTaskNamingLlmConnectionId");

-- AddForeignKey
ALTER TABLE "WorkspacePreferences" ADD CONSTRAINT "WorkspacePreferences_FK_defaultAgentLlmConnectionId_fkey" FOREIGN KEY ("FK_defaultAgentLlmConnectionId") REFERENCES "Connection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspacePreferences" ADD CONSTRAINT "WorkspacePreferences_FK_defaultTaskNamingLlmConnectionId_fkey" FOREIGN KEY ("FK_defaultTaskNamingLlmConnectionId") REFERENCES "Connection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_FK_defaultAgentLlmConnectionId_fkey" FOREIGN KEY ("FK_defaultAgentLlmConnectionId") REFERENCES "Connection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_FK_defaultTaskNamingLlmConnectionId_fkey" FOREIGN KEY ("FK_defaultTaskNamingLlmConnectionId") REFERENCES "Connection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_FK_taskNamingLlmConnectionId_fkey" FOREIGN KEY ("FK_taskNamingLlmConnectionId") REFERENCES "Connection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
