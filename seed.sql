-- Hackathon Manager Seed Data
-- Use this to populate the database with sample data for development/testing

-- =============================================================================
-- SAMPLE USERS
-- =============================================================================

-- Password for all test users: "password123" (bcrypt hash)
INSERT INTO users (id, email, password_hash, first_name, last_name, display_name, bio, skills) VALUES
    ('11111111-1111-1111-1111-111111111111', 'admin@hackathon.io', '$2b$10$rQEYlz8VxJNqC8BdBVHCpOYJvlM8sKKlQ8w5CKBQxjYCwZnPIYDOa', 'Admin', 'User', 'Admin', 'Platform administrator', ARRAY['management', 'organizing']),
    ('22222222-2222-2222-2222-222222222222', 'organizer@hackathon.io', '$2b$10$rQEYlz8VxJNqC8BdBVHCpOYJvlM8sKKlQ8w5CKBQxjYCwZnPIYDOa', 'Sarah', 'Organizer', 'Sarah O', 'Hackathon organizer and tech enthusiast', ARRAY['event planning', 'community']),
    ('33333333-3333-3333-3333-333333333333', 'judge1@hackathon.io', '$2b$10$rQEYlz8VxJNqC8BdBVHCpOYJvlM8sKKlQ8w5CKBQxjYCwZnPIYDOa', 'Mike', 'Judge', 'Mike J', 'Senior engineer at TechCorp', ARRAY['backend', 'architecture', 'python']),
    ('44444444-4444-4444-4444-444444444444', 'judge2@hackathon.io', '$2b$10$rQEYlz8VxJNqC8BdBVHCpOYJvlM8sKKlQ8w5CKBQxjYCwZnPIYDOa', 'Lisa', 'Expert', 'Lisa E', 'VC Partner and startup advisor', ARRAY['startups', 'product', 'business']),
    ('55555555-5555-5555-5555-555555555555', 'alice@example.com', '$2b$10$rQEYlz8VxJNqC8BdBVHCpOYJvlM8sKKlQ8w5CKBQxjYCwZnPIYDOa', 'Alice', 'Developer', 'Alice D', 'Full-stack developer', ARRAY['javascript', 'react', 'node.js']),
    ('66666666-6666-6666-6666-666666666666', 'bob@example.com', '$2b$10$rQEYlz8VxJNqC8BdBVHCpOYJvlM8sKKlQ8w5CKBQxjYCwZnPIYDOa', 'Bob', 'Builder', 'Bob B', 'Backend specialist', ARRAY['python', 'go', 'postgresql']),
    ('77777777-7777-7777-7777-777777777777', 'carol@example.com', '$2b$10$rQEYlz8VxJNqC8BdBVHCpOYJvlM8sKKlQ8w5CKBQxjYCwZnPIYDOa', 'Carol', 'Creator', 'Carol C', 'UI/UX designer and frontend dev', ARRAY['figma', 'css', 'vue.js']),
    ('88888888-8888-8888-8888-888888888888', 'dave@example.com', '$2b$10$rQEYlz8VxJNqC8BdBVHCpOYJvlM8sKKlQ8w5CKBQxjYCwZnPIYDOa', 'Dave', 'Data', 'Dave D', 'ML engineer', ARRAY['python', 'tensorflow', 'data science']);

-- =============================================================================
-- SAMPLE HACKATHON
-- =============================================================================

INSERT INTO hackathons (id, name, slug, description, rules, status, location, is_virtual, timezone, registration_opens_at, registration_closes_at, starts_at, ends_at, judging_starts_at, judging_ends_at, max_team_size, min_team_size, created_by) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'TechHack 2025', 'techhack-2025',
     'Join us for the biggest hackathon of the year! Build innovative solutions to real-world problems and compete for amazing prizes.',
     E'1. Teams must consist of 1-5 members\n2. All code must be written during the hackathon\n3. You may use open-source libraries and APIs\n4. Projects must be submitted before the deadline\n5. Be respectful and have fun!',
     'registration_open',
     'San Francisco, CA',
     false,
     'America/Los_Angeles',
     '2025-01-01 00:00:00+00',
     '2025-02-01 00:00:00+00',
     '2025-02-15 09:00:00+00',
     '2025-02-16 21:00:00+00',
     '2025-02-16 21:00:00+00',
     '2025-02-17 18:00:00+00',
     5, 1,
     '22222222-2222-2222-2222-222222222222');

-- =============================================================================
-- HACKATHON USER REGISTRATIONS
-- =============================================================================

INSERT INTO hackathon_users (hackathon_id, user_id, role) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'admin'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'organizer'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'judge'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'judge'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555', 'participant'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666666', 'participant'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '77777777-7777-7777-7777-777777777777', 'participant'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-8888-8888-8888-888888888888', 'participant');

-- =============================================================================
-- SAMPLE TEAMS
-- =============================================================================

INSERT INTO teams (id, hackathon_id, name, description, invite_code, is_open, created_by) VALUES
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Code Crusaders', 'Building the future one line at a time', 'CRUSH2025', true, '55555555-5555-5555-5555-555555555555'),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Data Dragons', 'ML-powered solutions for everything', 'DRAGON25', false, '88888888-8888-8888-8888-888888888888');

INSERT INTO team_members (team_id, user_id, is_leader) VALUES
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '55555555-5555-5555-5555-555555555555', true),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '66666666-6666-6666-6666-666666666666', false),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', '88888888-8888-8888-8888-888888888888', true),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', '77777777-7777-7777-7777-777777777777', false);

-- =============================================================================
-- SAMPLE PROJECTS
-- =============================================================================

INSERT INTO projects (id, team_id, hackathon_id, name, tagline, description, status, demo_url, repository_url, technologies) VALUES
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
     'EcoTrack',
     'Track your carbon footprint effortlessly',
     'EcoTrack is a mobile-first web app that helps users monitor and reduce their environmental impact through daily activity tracking and personalized recommendations.',
     'draft',
     'https://ecotrack.demo.com',
     'https://github.com/codecrusaders/ecotrack',
     ARRAY['React', 'Node.js', 'PostgreSQL', 'TailwindCSS']),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
     'MedAssist AI',
     'Your AI-powered health companion',
     'MedAssist AI uses machine learning to help users understand their symptoms and get preliminary health guidance before visiting a doctor.',
     'draft',
     'https://medassist.demo.com',
     'https://github.com/datadragons/medassist',
     ARRAY['Python', 'FastAPI', 'TensorFlow', 'React', 'MongoDB']);

-- =============================================================================
-- JUDGING CRITERIA
-- =============================================================================

INSERT INTO judging_criteria (id, hackathon_id, name, description, max_score, weight, display_order) VALUES
    ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Innovation', 'How creative and novel is the solution?', 10, 1.00, 1),
    ('11111111-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Technical Complexity', 'How technically impressive is the implementation?', 10, 1.00, 2),
    ('11111111-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Design & UX', 'How polished and user-friendly is the product?', 10, 0.75, 3),
    ('11111111-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Impact', 'What is the potential real-world impact?', 10, 1.25, 4),
    ('11111111-0000-0000-0000-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Presentation', 'How well was the project presented?', 10, 0.50, 5);

-- =============================================================================
-- PRIZE TRACKS AND PRIZES
-- =============================================================================

INSERT INTO prize_tracks (id, hackathon_id, name, description, sponsor_name, display_order) VALUES
    ('22222222-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Main Track', 'Overall competition prizes', NULL, 1),
    ('22222222-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Best AI/ML Project', 'Best use of artificial intelligence or machine learning', 'TechCorp AI', 2),
    ('22222222-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Social Impact', 'Project with greatest potential for positive social change', 'GoodTech Foundation', 3);

INSERT INTO prizes (hackathon_id, track_id, name, description, value, display_order) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-0000-0000-0000-000000000001', 'Grand Prize', 'First place overall', '$10,000', 1),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-0000-0000-0000-000000000001', 'Second Place', 'Runner up', '$5,000', 2),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-0000-0000-0000-000000000001', 'Third Place', 'Third place overall', '$2,500', 3),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-0000-0000-0000-000000000002', 'Best AI Project', 'Most impressive AI/ML implementation', '$3,000 + Cloud Credits', 1),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-0000-0000-0000-000000000003', 'Social Impact Award', 'Greatest potential for positive change', '$2,500 + Mentorship', 1);

-- =============================================================================
-- SCHEDULE EVENTS
-- =============================================================================

INSERT INTO schedule_events (hackathon_id, name, description, event_type, location, starts_at, ends_at, is_mandatory) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Opening Ceremony', 'Welcome to TechHack 2025! Meet the organizers, sponsors, and fellow hackers.', 'ceremony', 'Main Hall', '2025-02-15 09:00:00+00', '2025-02-15 10:00:00+00', true),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Team Formation Mixer', 'Looking for teammates? Join us to find your perfect team!', 'networking', 'Networking Area', '2025-02-15 10:00:00+00', '2025-02-15 11:00:00+00', false),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Hacking Begins!', 'Official start of the hackathon', 'deadline', 'All Venues', '2025-02-15 11:00:00+00', '2025-02-15 11:00:00+00', true),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Lunch', 'Fuel up with lunch!', 'meal', 'Cafeteria', '2025-02-15 12:00:00+00', '2025-02-15 13:00:00+00', false),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Workshop: Building with AI APIs', 'Learn how to integrate popular AI APIs into your project', 'workshop', 'Workshop Room A', '2025-02-15 14:00:00+00', '2025-02-15 15:00:00+00', false),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Dinner', 'Take a break and refuel', 'meal', 'Cafeteria', '2025-02-15 18:00:00+00', '2025-02-15 19:00:00+00', false),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Midnight Snacks', 'Late night fuel for the dedicated hackers', 'meal', 'Cafeteria', '2025-02-16 00:00:00+00', '2025-02-16 01:00:00+00', false),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Submissions Due', 'Final deadline for project submissions', 'deadline', 'Online', '2025-02-16 21:00:00+00', '2025-02-16 21:00:00+00', true),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Project Demos', 'Present your projects to the judges', 'presentation', 'Demo Hall', '2025-02-17 10:00:00+00', '2025-02-17 16:00:00+00', true),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Closing Ceremony & Awards', 'Announcing the winners!', 'ceremony', 'Main Hall', '2025-02-17 17:00:00+00', '2025-02-17 18:00:00+00', true);

-- =============================================================================
-- SAMPLE ANNOUNCEMENTS
-- =============================================================================

INSERT INTO announcements (hackathon_id, title, content, is_pinned, is_urgent, created_by) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Welcome to TechHack 2025!',
     E'We''re thrilled to have you join us for this year''s hackathon!\n\nMake sure to:\n- Complete your profile\n- Join or create a team\n- Check out the schedule\n- Review the rules and judging criteria\n\nHappy hacking!',
     true, false, '22222222-2222-2222-2222-222222222222'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Sponsor Office Hours Announced',
     'Our sponsors will be holding office hours throughout the hackathon. Check the schedule for times and locations. This is a great opportunity to get feedback and mentorship!',
     false, false, '22222222-2222-2222-2222-222222222222');
