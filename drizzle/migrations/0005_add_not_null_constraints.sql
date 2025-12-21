-- Ensure all days have an eventId
UPDATE days SET event_id = (SELECT id FROM events WHERE slug = 'family' LIMIT 1) WHERE event_id IS NULL;

-- Ensure all people have an eventId
UPDATE people SET event_id = (SELECT id FROM events WHERE slug = 'family' LIMIT 1) WHERE event_id IS NULL;

-- Add NOT NULL constraints
ALTER TABLE days ALTER COLUMN event_id SET NOT NULL;
ALTER TABLE people ALTER COLUMN event_id SET NOT NULL;

