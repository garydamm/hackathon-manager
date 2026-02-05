-- Add archived column to hackathons table
ALTER TABLE hackathons
ADD COLUMN archived BOOLEAN NOT NULL DEFAULT false;

-- Add index for archived column to optimize queries that filter by archived status
CREATE INDEX idx_hackathons_archived ON hackathons(archived);

-- Add comment to document the column
COMMENT ON COLUMN hackathons.archived IS 'Indicates if the hackathon is archived. Archived hackathons are hidden from public listings but remain accessible via direct URL for authenticated users.';
