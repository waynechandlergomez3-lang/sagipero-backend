-- CreateEnum
CREATE TYPE "SituationStatus" AS ENUM ('SAFE', 'NEED_ASSISTANCE', 'EVACUATING', 'AT_EVACUATION_CENTER', 'UNKNOWN');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "situationStatus" "SituationStatus" NOT NULL DEFAULT 'UNKNOWN',
    ADD COLUMN "situationDetails" TEXT,
    ADD COLUMN "situationUpdatedAt" TIMESTAMP(3);
