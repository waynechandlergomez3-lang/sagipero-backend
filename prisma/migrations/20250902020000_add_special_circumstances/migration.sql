-- 1) Create enum type SpecialCircumstance if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'specialcircumstance') THEN
    CREATE TYPE "SpecialCircumstance" AS ENUM (
      'PREGNANT',
      'PWD',
      'ELDERLY',
      'CHILD',
      'WITH_INFANT',
      'NONE'
    );
  END IF;
END
$$;

-- 2) Add columns to "User" table (if they don't exist)
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "specialCircumstances" "SpecialCircumstance"[] DEFAULT ARRAY['NONE']::"SpecialCircumstance"[],
  ADD COLUMN IF NOT EXISTS "specialCircumstancesDetails" TEXT;

-- 3) Create UserDocument table if missing
CREATE TABLE IF NOT EXISTS "UserDocument" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4) Ensure unique index on (userId, type)
CREATE UNIQUE INDEX IF NOT EXISTS "UserDocument_userId_type_key" ON "UserDocument"("userId", "type");

-- 5) Add foreign key from UserDocument.userId -> User.id if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'UserDocument' AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'userId'
  ) THEN
    ALTER TABLE "UserDocument"
      ADD CONSTRAINT "UserDocument_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- 6) Create CommonMedicalCondition table (if missing)
CREATE TABLE IF NOT EXISTS "CommonMedicalCondition" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7) Create CommonAllergy table (if missing)
CREATE TABLE IF NOT EXISTS "CommonAllergy" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8) Unique indexes for name columns
CREATE UNIQUE INDEX IF NOT EXISTS "CommonMedicalCondition_name_key" ON "CommonMedicalCondition"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "CommonAllergy_name_key" ON "CommonAllergy"("name");

-- 9) Safe inserts (use ON CONFLICT DO NOTHING to avoid duplicate key errors)
INSERT INTO "CommonMedicalCondition" (id, name, category, description)
VALUES
('1', 'Diabetes', 'Chronic Disease', 'Type 1 or Type 2 Diabetes'),
('2', 'Hypertension', 'Chronic Disease', 'High blood pressure'),
('3', 'Asthma', 'Respiratory', 'Chronic respiratory condition'),
('4', 'Heart Disease', 'Cardiovascular', 'Various heart conditions'),
('5', 'Epilepsy', 'Neurological', 'Seizure disorder'),
('6', 'Arthritis', 'Musculoskeletal', 'Joint inflammation')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "CommonAllergy" (id, name, category, description)
VALUES
('1', 'Penicillin', 'Medication', 'Antibiotic allergy'),
('2', 'Peanuts', 'Food', 'Common food allergy'),
('3', 'Shellfish', 'Food', 'Seafood allergy'),
('4', 'Dust Mites', 'Environmental', 'Common environmental allergy'),
('5', 'Latex', 'Material', 'Common material allergy'),
('6', 'Bee Stings', 'Insect', 'Insect sting allergy')
ON CONFLICT ("id") DO NOTHING;
