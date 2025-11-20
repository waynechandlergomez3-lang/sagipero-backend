-- Migration: add vehicles table and emergency_vehicles join table

CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  responder_id uuid NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  plate_number text,
  model text,
  color text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_responder_id ON vehicles(responder_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_plate_number ON vehicles(plate_number);

-- Optional join table for assigning vehicles to emergencies
CREATE TABLE IF NOT EXISTS emergency_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  emergency_id uuid NOT NULL REFERENCES "Emergency"(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emergency_vehicles_emergency_id ON emergency_vehicles(emergency_id);
CREATE INDEX IF NOT EXISTS idx_emergency_vehicles_vehicle_id ON emergency_vehicles(vehicle_id);
