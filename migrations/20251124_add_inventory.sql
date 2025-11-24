-- Migration: add InventoryItem table
-- NOTE: Uses quoted table name and TEXT ids to match production schema conventions.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP TABLE IF EXISTS public."InventoryItem" CASCADE;
DROP TABLE IF EXISTS public.inventory_item CASCADE;

CREATE TABLE IF NOT EXISTS public."InventoryItem" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "responderId" text,
  "name" text NOT NULL,
  "sku" text,
  "quantity" integer DEFAULT 0,
  "unit" text,
  "notes" text,
  "available" boolean DEFAULT true,
  "isActive" boolean DEFAULT true,
  "createdAt" timestamptz DEFAULT now(),
  "updatedAt" timestamptz DEFAULT now(),
  CONSTRAINT fk_inventory_responder FOREIGN KEY ("responderId") REFERENCES public."User"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_InventoryItem_responderId ON public."InventoryItem"("responderId");
CREATE INDEX IF NOT EXISTS idx_InventoryItem_name ON public."InventoryItem"("name");
