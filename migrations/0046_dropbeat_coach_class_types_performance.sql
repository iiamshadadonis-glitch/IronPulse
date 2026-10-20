-- IronPulse Gym V1.09
-- Coaches now declare the class types they conduct. Existing coach records keep
-- their previous behavior by supporting every class type until an admin edits
-- the profile and chooses a narrower set.

ALTER TABLE dance_coaches ADD COLUMN class_types_json TEXT NOT NULL
  DEFAULT '["online_class","offline_class","demo","webinar","trial"]';

UPDATE dance_coaches
SET class_types_json='["online_class","offline_class","demo","webinar","trial"]'
WHERE class_types_json IS NULL OR trim(class_types_json)='' OR trim(class_types_json)='[]';

CREATE INDEX IF NOT EXISTS idx_dance_coaches_status_sort
  ON dance_coaches(status,sort_order,id);

PRAGMA optimize;
