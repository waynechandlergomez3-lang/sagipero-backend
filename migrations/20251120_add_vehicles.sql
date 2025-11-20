-- Migration: add vehicles table and emergency_vehicles join table
-- NOTE: This migration creates quoted table names and uses TEXT ids to match the
-- existing production schema where user/emergency ids are stored as text.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop any partially created variants (both quoted and unquoted) so the migration
-- can be re-run safely from the Supabase SQL editor.
DROP TABLE IF EXISTS public."Vehicle" CASCADE;
DROP TABLE IF EXISTS public.vehicle CASCADE;
DROP TABLE IF EXISTS public."emergency_vehicles" CASCADE;
DROP TABLE IF EXISTS public.emergency_vehicles CASCADE;

-- Create main Vehicle table using TEXT ids (gen_random_uuid()::text) so values
-- look like UUID strings but are stored as TEXT to match existing user ids.
CREATE TABLE IF NOT EXISTS public."Vehicle" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "responderId" text NOT NULL,
  "plateNumber" text,
  "model" text,
  "color" text,
  "active" boolean DEFAULT true,
  "createdAt" timestamptz DEFAULT now(),
  "updatedAt" timestamptz DEFAULT now(),
  CONSTRAINT fk_vehicle_responder FOREIGN KEY ("responderId") REFERENCES public."User"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_Vehicle_responderId ON public."Vehicle"("responderId");

-- Optional join table for assigning vehicles to emergencies (TEXT ids)
CREATE TABLE IF NOT EXISTS public."emergency_vehicles" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "emergencyId" text NOT NULL,
  "vehicleId" text NOT NULL,
  "assignedAt" timestamptz DEFAULT now(),
  CONSTRAINT fk_ev_emergency FOREIGN KEY ("emergencyId") REFERENCES public."Emergency"("id") ON DELETE CASCADE,
  CONSTRAINT fk_ev_vehicle FOREIGN KEY ("vehicleId") REFERENCES public."Vehicle"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_emergency_vehicles_emergencyId ON public."emergency_vehicles"("emergencyId");
CREATE INDEX IF NOT EXISTS idx_emergency_vehicles_vehicleId ON public."emergency_vehicles"("vehicleId");
