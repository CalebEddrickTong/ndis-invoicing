INSERT INTO gender (code, label)
VALUES
  ('MALE', 'Male'),
  ('FEMALE', 'Female'),
  ('OTHER', 'Other')
ON CONFLICT (code) DO NOTHING;

INSERT INTO rate_set_support_item_pricing_region (
  code,
  label,
  full_label
)
VALUES
  ('ACT', 'ACT', 'Australian Capital Territory'),
  ('NSW', 'NSW', 'New South Wales'),
  ('NT', 'NT', 'Northern Territory'),
  ('QLD', 'QLD', 'Queensland'),
  ('SA', 'SA', 'South Australia'),
  ('TAS', 'TAS', 'Tasmania'),
  ('VIC', 'VIC', 'Victoria'),
  ('WA', 'WA', 'Western Australia'),
  ('REMOTE', 'Remote', 'Remote'),
  ('VERY_REMOTE', 'Very Remote', 'Very Remote')
ON CONFLICT (code) DO NOTHING;