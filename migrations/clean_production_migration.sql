-- ===============================================
-- SAGIPERO DATABASE - CLEAN PRODUCTION MIGRATION
-- ===============================================
-- This migration creates the complete database schema in one go
-- Eliminates conflicts from overlapping development migrations

-- Create all enum types
DO $$
BEGIN
    -- UserRole enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'userrole') THEN
        CREATE TYPE "UserRole" AS ENUM ('RESIDENT', 'ADMIN', 'RESPONDER');
    END IF;

    -- ResponderStatus enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'responderstatus') THEN
        CREATE TYPE "ResponderStatus" AS ENUM ('AVAILABLE', 'ON_DUTY', 'VEHICLE_UNAVAILABLE', 'OFFLINE');
    END IF;

    -- SituationStatus enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'situationstatus') THEN
        CREATE TYPE "SituationStatus" AS ENUM ('SAFE', 'NEED_ASSISTANCE', 'EMERGENCY');
    END IF;

    -- EmergencyStatus enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'emergencystatus') THEN
        CREATE TYPE "EmergencyStatus" AS ENUM ('PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS', 'ACCEPTED', 'RESOLVED', 'ARRIVED');
    END IF;

    -- SpecialCircumstance enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'specialcircumstance') THEN
        CREATE TYPE "SpecialCircumstance" AS ENUM ('PREGNANT', 'PWD', 'ELDERLY', 'CHILD', 'WITH_INFANT', 'NONE');
    END IF;
END $$;

-- Create User table
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'RESIDENT',
    "address" TEXT,
    "barangay" TEXT,
    "bloodType" TEXT,
    "medicalInfo" JSONB,
    "deviceToken" TEXT,
    "emergencyContact" JSONB,
    "notificationPrefs" JSONB NOT NULL DEFAULT '{"emergency": true, "weather": true, "system": true}',
    "situationStatus" "SituationStatus" DEFAULT 'SAFE',
    "responderStatus" "ResponderStatus" NOT NULL DEFAULT 'AVAILABLE',
    "specialCircumstances" "SpecialCircumstance"[] DEFAULT ARRAY['NONE']::"SpecialCircumstance"[],
    "medicalConditions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allergies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "emergencyContactRelation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create Location table
CREATE TABLE IF NOT EXISTS "Location" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "userId" TEXT NOT NULL UNIQUE,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create Emergency table
CREATE TABLE IF NOT EXISTS "Emergency" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "EmergencyStatus" NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 1,
    "location" JSONB NOT NULL,
    "address" TEXT,
    "userId" TEXT NOT NULL,
    "responderId" TEXT,
    "responderLocation" JSONB,
    "responseNotes" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "evacuationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create EvacuationCenter table
CREATE TABLE IF NOT EXISTS "EvacuationCenter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "currentCount" INTEGER NOT NULL DEFAULT 0,
    "location" JSONB NOT NULL,
    "contactNumber" TEXT,
    "facilities" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create EmergencyHotline table
CREATE TABLE IF NOT EXISTS "EmergencyHotline" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- Create WeatherAlert table
CREATE TABLE IF NOT EXISTS "WeatherAlert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "area" JSONB,
    "hourlyIndexes" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "daily" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create Notification table
CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create UserDocument table
CREATE TABLE IF NOT EXISTS "UserDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create CommonMedicalCondition table
CREATE TABLE IF NOT EXISTS "CommonMedicalCondition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL UNIQUE,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create CommonAllergy table
CREATE TABLE IF NOT EXISTS "CommonAllergy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL UNIQUE,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create Article table
CREATE TABLE IF NOT EXISTS "Article" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create EmergencyHistory table (for tracking emergency events)
CREATE TABLE IF NOT EXISTS "EmergencyHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "emergencyId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "Location_userId_key" ON "Location"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "UserDocument_userId_type_key" ON "UserDocument"("userId", "type");
CREATE INDEX IF NOT EXISTS "Emergency_userId_idx" ON "Emergency"("userId");
CREATE INDEX IF NOT EXISTS "Emergency_responderId_idx" ON "Emergency"("responderId");
CREATE INDEX IF NOT EXISTS "Emergency_status_idx" ON "Emergency"("status");
CREATE INDEX IF NOT EXISTS "EmergencyHistory_emergencyId_idx" ON "EmergencyHistory"("emergencyId");
CREATE INDEX IF NOT EXISTS "Notification_userId_idx" ON "Notification"("userId");

-- Add foreign key constraints
DO $$
BEGIN
    -- Location -> User
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Location_userId_fkey') THEN
        ALTER TABLE "Location" ADD CONSTRAINT "Location_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    -- Emergency -> User (reporter)
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Emergency_userId_fkey') THEN
        ALTER TABLE "Emergency" ADD CONSTRAINT "Emergency_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    -- Emergency -> User (responder)
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Emergency_responderId_fkey') THEN
        ALTER TABLE "Emergency" ADD CONSTRAINT "Emergency_responderId_fkey" FOREIGN KEY ("responderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    -- Emergency -> EvacuationCenter
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Emergency_evacuationId_fkey') THEN
        ALTER TABLE "Emergency" ADD CONSTRAINT "Emergency_evacuationId_fkey" FOREIGN KEY ("evacuationId") REFERENCES "EvacuationCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    -- Notification -> User
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Notification_userId_fkey') THEN
        ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    -- UserDocument -> User
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'UserDocument_userId_fkey') THEN
        ALTER TABLE "UserDocument" ADD CONSTRAINT "UserDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Insert seed data
INSERT INTO "CommonMedicalCondition" (id, name, category, description) VALUES
    ('hypertension', 'Hypertension', 'Cardiovascular', 'High blood pressure'),
    ('diabetes-t1', 'Diabetes Type 1', 'Endocrine', 'Insulin-dependent diabetes'),
    ('diabetes-t2', 'Diabetes Type 2', 'Endocrine', 'Non-insulin-dependent diabetes'),
    ('asthma', 'Asthma', 'Respiratory', 'Chronic lung condition'),
    ('epilepsy', 'Epilepsy', 'Neurological', 'Seizure disorder'),
    ('heart-disease', 'Heart Disease', 'Cardiovascular', 'Various heart conditions')
ON CONFLICT (id) DO NOTHING;

INSERT INTO "CommonAllergy" (id, name, category, description) VALUES
    ('penicillin', 'Penicillin', 'Medication', 'Common antibiotic allergy'),
    ('peanuts', 'Peanuts', 'Food', 'Common food allergy'),
    ('shellfish', 'Shellfish', 'Food', 'Common seafood allergy'),
    ('latex', 'Latex', 'Material', 'Rubber/latex products'),
    ('dust-mites', 'Dust Mites', 'Environmental', 'Common household allergen'),
    ('bee-stings', 'Bee Stings', 'Insect', 'Common insect venom allergy')
ON CONFLICT (id) DO NOTHING;

-- Insert emergency hotlines
INSERT INTO "EmergencyHotline" (id, name, number, description) VALUES
    ('911', 'Emergency Services', '911', 'General emergency services'),
    ('pnp', 'Philippine National Police', '117', 'Police emergency line'),
    ('bfp', 'Bureau of Fire Protection', '116', 'Fire emergency services'),
    ('red-cross', 'Philippine Red Cross', '143', 'Medical emergency and disaster response')
ON CONFLICT (id) DO NOTHING;

COMMIT;