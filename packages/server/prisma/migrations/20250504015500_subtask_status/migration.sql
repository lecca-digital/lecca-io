/*
  Warnings:

  - You are about to drop the column `isCompleted` on the `SubTask` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "SubTaskStatus" AS ENUM ('pending', 'complete', 'blocked');

-- AlterTable
ALTER TABLE "SubTask" DROP COLUMN "isCompleted",
ADD COLUMN     "description" VARCHAR(255),
ADD COLUMN     "status" "SubTaskStatus" NOT NULL DEFAULT 'pending';
