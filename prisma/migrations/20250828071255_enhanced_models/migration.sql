/*
  Warnings:

  - You are about to drop the column `createdAt` on the `EmergencyHotline` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `EmergencyHotline` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Emergency" ADD COLUMN     "address" TEXT,
ADD COLUMN     "evacuationId" TEXT,
ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "responseNotes" TEXT;

-- AlterTable
ALTER TABLE "public"."EmergencyHotline" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "public"."EvacuationCenter" ADD COLUMN     "contactNumber" TEXT,
ADD COLUMN     "currentCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "facilities" JSONB;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "bloodType" TEXT,
ADD COLUMN     "deviceToken" TEXT,
ADD COLUMN     "emergencyContact" JSONB,
ADD COLUMN     "medicalInfo" JSONB,
ADD COLUMN     "notificationPrefs" JSONB NOT NULL DEFAULT '{"emergency": true, "weather": true, "system": true}';

-- CreateTable
CREATE TABLE "public"."WeatherAlert" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "location" JSONB NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeatherAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Emergency" ADD CONSTRAINT "Emergency_evacuationId_fkey" FOREIGN KEY ("evacuationId") REFERENCES "public"."EvacuationCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
