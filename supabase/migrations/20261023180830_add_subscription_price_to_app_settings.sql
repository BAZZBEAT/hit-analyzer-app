-- Add subscription price column to app_settings (in rubles)
ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS subscription_price_rub int NOT NULL DEFAULT 100;

-- Update the singleton row to reflect the current price
UPDATE app_settings SET subscription_price_rub = 100 WHERE id = 1;