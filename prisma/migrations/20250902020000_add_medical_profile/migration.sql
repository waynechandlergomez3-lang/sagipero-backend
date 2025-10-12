-- CreateEnum
CREATE TYPE "SpecialCircumstance" AS ENUM (
    'PREGNANT',
    'PWD',
    'ELDERLY',
    'CHILD',
    'WITH_INFANT',
    'NONE'
);

-- Add nullable columns first
ALTER TABLE "User" 
    ADD COLUMN IF NOT EXISTS "specialCircumstances" "SpecialCircumstance"[] DEFAULT ARRAY['NONE']::"SpecialCircumstance"[],
    ADD COLUMN IF NOT EXISTS "medicalConditions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS "allergies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS "bloodType" TEXT,
    ADD COLUMN IF NOT EXISTS "emergencyContactName" TEXT,
    ADD COLUMN IF NOT EXISTS "emergencyContactPhone" TEXT,
    ADD COLUMN IF NOT EXISTS "emergencyContactRelation" TEXT;

-- CreateTable
CREATE TABLE "UserDocument" (
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
CREATE TABLE "CommonMedicalCondition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommonMedicalCondition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommonAllergy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommonAllergy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'UserDocument_userId_type_key') THEN
        CREATE UNIQUE INDEX "UserDocument_userId_type_key" ON "UserDocument"("userId", "type");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'CommonMedicalCondition_name_key') THEN
        CREATE UNIQUE INDEX "CommonMedicalCondition_name_key" ON "CommonMedicalCondition"("name");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'CommonAllergy_name_key') THEN
        CREATE UNIQUE INDEX "CommonAllergy_name_key" ON "CommonAllergy"("name");
    END IF;
END$$;

-- AddForeignKey if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'UserDocument_userId_fkey') THEN
        ALTER TABLE "UserDocument" ADD CONSTRAINT "UserDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END$$;

-- Insert common medical conditions
INSERT INTO "CommonMedicalCondition" (id, name, category, description) VALUES
    (gen_random_uuid(), 'Hypertension', 'Cardiovascular', 'High blood pressure'),
    (gen_random_uuid(), 'Diabetes Type 1', 'Endocrine', 'Insulin-dependent diabetes'),
    (gen_random_uuid(), 'Diabetes Type 2', 'Endocrine', 'Non-insulin-dependent diabetes'),
    (gen_random_uuid(), 'Asthma', 'Respiratory', 'Chronic lung condition'),
    (gen_random_uuid(), 'Epilepsy', 'Neurological', 'Seizure disorder'),
    (gen_random_uuid(), 'Heart Disease', 'Cardiovascular', 'Various heart conditions');

-- Insert common allergies
INSERT INTO "CommonAllergy" (id, name, category, description) VALUES
    (gen_random_uuid(), 'Penicillin', 'Medication', 'Common antibiotic allergy'),
    (gen_random_uuid(), 'Peanuts', 'Food', 'Common food allergy'),
    (gen_random_uuid(), 'Shellfish', 'Food', 'Common seafood allergy'),
    (gen_random_uuid(), 'Latex', 'Material', 'Rubber/latex products'),
    (gen_random_uuid(), 'Dust Mites', 'Environmental', 'Common household allergen'),
    (gen_random_uuid(), 'Bee Stings', 'Insect', 'Common insect venom allergy');
