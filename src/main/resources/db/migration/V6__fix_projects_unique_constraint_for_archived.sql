-- Drop the existing unique constraint that prevents creating new projects after archiving
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_team_id_hackathon_id_key;

-- Create a partial unique index that only applies to non-archived projects
-- This allows teams to create new projects after archiving old ones
CREATE UNIQUE INDEX projects_team_hackathon_active_key
ON projects (team_id, hackathon_id)
WHERE archived_at IS NULL;
