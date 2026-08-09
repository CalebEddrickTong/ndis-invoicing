UPDATE gender
SET
  code = 'UNIDENTIFIED',
  label = 'Unidentified',
  updated_at = now()
WHERE code = 'OTHER';