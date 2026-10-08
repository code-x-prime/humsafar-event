-- Starter time slots so checkout offers times from day one. Only inserted when
-- no slot exists yet; after that the admin owns them (Time Slots page).
INSERT INTO "TimeSlot" ("id", "label", "startTime", "endTime", "capacity", "surgeCharge", "isActive", "position")
SELECT v.id, v.label, v."startTime", v."endTime", 3, 0, true, v.position
FROM (VALUES
  ('default_slot_morning',   'Morning (9 AM - 12 PM)',    '09:00', '12:00', 1),
  ('default_slot_afternoon', 'Afternoon (12 PM - 3 PM)',  '12:00', '15:00', 2),
  ('default_slot_evening',   'Evening (3 PM - 6 PM)',     '15:00', '18:00', 3),
  ('default_slot_night',     'Night (6 PM - 9 PM)',       '18:00', '21:00', 4)
) AS v(id, label, "startTime", "endTime", position)
WHERE NOT EXISTS (SELECT 1 FROM "TimeSlot");
