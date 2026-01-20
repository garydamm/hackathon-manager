-- H2 compatibility schema for PostgreSQL enums
-- Create domain types that H2 can understand

CREATE DOMAIN IF NOT EXISTS hackathon_status AS VARCHAR(50);
CREATE DOMAIN IF NOT EXISTS user_role AS VARCHAR(50);
CREATE DOMAIN IF NOT EXISTS submission_status AS VARCHAR(50);
CREATE DOMAIN IF NOT EXISTS event_type AS VARCHAR(50);
