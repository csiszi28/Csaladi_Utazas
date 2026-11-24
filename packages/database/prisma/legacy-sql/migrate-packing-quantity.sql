-- Csomagolási tétel darabszám
ALTER TABLE "packing_items"
  ADD COLUMN IF NOT EXISTS "quantity" INTEGER NOT NULL DEFAULT 1;
