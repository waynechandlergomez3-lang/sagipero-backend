-- CreateEnum
CREATE TYPE "SpecialCircumstance" AS ENUM (
    'PREGNANT',
    'PWD',
    'ELDERLY',
    'CHILD',
    'WITH_INFANT',
    'NONE'
);

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "specialCircumstances" "SpecialCircumstance"[] DEFAULT ARRAY['NONE']::"SpecialCircumstance"[];
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "medicalConditions" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "allergies" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bloodType" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emergencyContactName" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emergencyContactPhone" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emergencyContactRelation" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "UserDocument" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CommonMedicalCondition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommonMedicalCondition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CommonAllergy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommonAllergy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "UserDocument_userId_type_key" ON "UserDocument"("userId", "type");
CREATE UNIQUE INDEX IF NOT EXISTS "CommonMedicalCondition_name_key" ON "CommonMedicalCondition"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "CommonAllergy_name_key" ON "CommonAllergy"("name");

-- AddForeignKey
ALTER TABLE "UserDocument" ADD CONSTRAINT "UserDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Insert common medical conditions
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM "CommonMedicalCondition" LIMIT 1) THEN
        INSERT INTO "CommonMedicalCondition" (id, name, category, description) VALUES
            (gen_random_uuid(), 'Hypertension', 'Cardiovascular', 'High blood pressure'),
            (gen_random_uuid(), 'Diabetes Type 1', 'Endocrine', 'Insulin-dependent diabetes'),
            (gen_random_uuid(), 'Diabetes Type 2', 'Endocrine', 'Non-insulin-dependent diabetes'),
            (gen_random_uuid(), 'Asthma', 'Respiratory', 'Chronic lung condition'),
            (gen_random_uuid(), 'Epilepsy', 'Neurological', 'Seizure disorder'),
            (gen_random_uuid(), 'Heart Disease', 'Cardiovascular', 'Various heart conditions');
    END IF;
END $$;

-- Insert common allergies
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM "CommonAllergy" LIMIT 1) THEN
        INSERT INTO "CommonAllergy" (id, name, category, description) VALUES
            (gen_random_uuid(), 'Penicillin', 'Medication', 'Common antibiotic allergy'),
            (gen_random_uuid(), 'Peanuts', 'Food', 'Common food allergy'),
            (gen_random_uuid(), 'Shellfish', 'Food', 'Common seafood allergy'),
            (gen_random_uuid(), 'Latex', 'Material', 'Rubber/latex products'),
            (gen_random_uuid(), 'Dust Mites', 'Environmental', 'Common household allergen'),
            (gen_random_uuid(), 'Bee Stings', 'Insect', 'Common insect venom allergy');
    END IF;
END $$;
