-- V8: Decouple projects from teams
-- Makes team_id nullable and adds created_by to track project creator independently

-- Step 1: Add created_by column as nullable first (will make NOT NULL after backfill)
ALTER TABLE projects ADD COLUMN created_by UUID REFERENCES users(id);

-- Step 2: Backfill created_by from the team's created_by for all existing projects
UPDATE projects p
SET created_by = t.created_by
FROM teams t
WHERE p.team_id = t.id;

-- Step 3: Now make created_by NOT NULL
ALTER TABLE projects ALTER COLUMN created_by SET NOT NULL;

-- Step 4: Make team_id nullable
ALTER TABLE projects ALTER COLUMN team_id DROP NOT NULL;

-- Step 5: Drop the existing partial unique index on (team_id, hackathon_id)
DROP INDEX IF EXISTS projects_team_hackathon_active_key;

-- Step 6: Add new partial unique index that only applies when team_id is NOT NULL and project is active
-- This ensures one active project per team per hackathon, but allows unlinked (team_id IS NULL) projects
CREATE UNIQUE INDEX projects_team_hackathon_active_key
ON projects (team_id, hackathon_id)
WHERE team_id IS NOT NULL AND archived_at IS NULL;

-- Step 7: Add index on created_by for lookups
CREATE INDEX idx_projects_created_by ON projects(created_by);

-- Step 8: Add composite index for querying user's projects in a hackathon
CREATE INDEX idx_projects_hackathon_created_by ON projects(hackathon_id, created_by);
