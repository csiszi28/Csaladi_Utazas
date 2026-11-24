-- Egy fiók több profilhoz is kapcsolódhat (pl. saját + más család virtuális profilja)
DROP INDEX IF EXISTS family_members_linkedUserId_key;

CREATE INDEX IF NOT EXISTS family_members_linkedUserId_idx ON family_members("linkedUserId");
