-- Create a temporary column
ALTER TABLE "User" ADD COLUMN "temp_status" text;

-- Copy the current status to the temporary column
UPDATE "User" SET "temp_status" = "situationStatus"::text;

-- Drop the situationStatus column
ALTER TABLE "User" DROP COLUMN "situationStatus";

-- Drop the old enum type
DROP TYPE IF EXISTS "SituationStatus";

-- Create the new enum type
CREATE TYPE "SituationStatus" AS ENUM ('SAFE', 'NEED_ASSISTANCE', 'EMERGENCY');

-- Add the new situationStatus column
ALTER TABLE "User" ADD COLUMN "situationStatus" "SituationStatus" NOT NULL DEFAULT 'SAFE';

-- Update the values based on the temp column
UPDATE "User" 
SET "situationStatus" = CASE 
    WHEN "temp_status" IN ('UNKNOWN', 'SAFE') THEN 'SAFE'::"SituationStatus"
    WHEN "temp_status" IN ('EVACUATING', 'AT_EVACUATION_CENTER') THEN 'NEED_ASSISTANCE'::"SituationStatus"
    ELSE 'SAFE'::"SituationStatus"
END;

-- Drop the temporary column
ALTER TABLE "User" DROP COLUMN "temp_status";
