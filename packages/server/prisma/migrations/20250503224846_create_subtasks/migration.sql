-- CreateTable
CREATE TABLE "SubTask" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "FK_taskId" TEXT NOT NULL,

    CONSTRAINT "SubTask_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SubTask" ADD CONSTRAINT "SubTask_FK_taskId_fkey" FOREIGN KEY ("FK_taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
