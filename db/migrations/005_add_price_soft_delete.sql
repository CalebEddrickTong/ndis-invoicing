ALTER TABLE rate_set_support_item_price
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;