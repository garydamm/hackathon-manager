-- PostgreSQL Test Database Initialization
-- Create enum types needed by the application

CREATE TYPE user_role AS ENUM ('participant', 'organizer', 'judge', 'admin', 'mentor');
CREATE TYPE hackathon_status AS ENUM ('draft', 'registration_open', 'registration_closed', 'in_progress', 'judging', 'completed', 'cancelled');
CREATE TYPE submission_status AS ENUM ('draft', 'submitted', 'under_review', 'accepted', 'rejected');
CREATE TYPE event_type AS ENUM ('workshop', 'presentation', 'meal', 'deadline', 'ceremony', 'networking', 'other');
