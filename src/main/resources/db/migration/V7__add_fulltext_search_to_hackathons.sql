-- Add full-text search support to hackathons table
-- Uses PostgreSQL tsvector with weighted ranking: name (A) and description (B)

-- Add tsvector column for full-text search
ALTER TABLE hackathons
ADD COLUMN search_vector tsvector;

-- Create GIN index for fast full-text search
CREATE INDEX idx_hackathons_search_vector ON hackathons USING GIN (search_vector);

-- Create trigger function to auto-update search_vector on INSERT and UPDATE
CREATE OR REPLACE FUNCTION hackathons_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER hackathons_search_vector_trigger
    BEFORE INSERT OR UPDATE OF name, description
    ON hackathons
    FOR EACH ROW
    EXECUTE FUNCTION hackathons_search_vector_update();

-- Backfill existing records with search vectors
UPDATE hackathons
SET search_vector =
    setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(description, '')), 'B');
