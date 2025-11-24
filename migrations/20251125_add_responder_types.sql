-- Migration: add responderTypes column to User
-- Adds a text[] column to store the emergency types a responder is qualified for

ALTER TABLE public."User" DROP COLUMN IF EXISTS "responderTypes";
ALTER TABLE public."User" ADD COLUMN IF NOT EXISTS "responderTypes" text[] DEFAULT ARRAY[]::text[];

-- Create an index to help filtering by responder type
CREATE INDEX IF NOT EXISTS idx_user_responderTypes ON public."User" USING GIN ("responderTypes");

-- Note: Backfill can be added here if you have default mappings for existing responders.
