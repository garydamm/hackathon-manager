-- Add archived_at column to projects table
ALTER TABLE projects
ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE;

-- Add index for archived_at column to optimize queries that filter by archived status
CREATE INDEX idx_projects_archived_at ON projects(archived_at);

-- Add comment to document the column
COMMENT ON COLUMN projects.archived_at IS 'Timestamp when the project was archived. NULL indicates an active project. Archived projects are completely hidden from all user-facing views and lists.';
