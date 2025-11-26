-- Add responder type and location tracking to CitizenMedia
ALTER TABLE "CitizenMedia" 
ADD COLUMN IF NOT EXISTS "emergencyType" VARCHAR(50),
ADD COLUMN IF NOT EXISTS "location" JSONB,
ADD COLUMN IF NOT EXISTS "locationLat" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "locationLng" DOUBLE PRECISION;

-- Create index on emergencyType for faster filtering
CREATE INDEX IF NOT EXISTS "CitizenMedia_emergencyType_idx" ON "CitizenMedia"("emergencyType");

-- Add index on location coordinates for proximity queries
CREATE INDEX IF NOT EXISTS "CitizenMedia_location_idx" ON "CitizenMedia" USING GIST("location");
