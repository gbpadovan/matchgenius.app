-- Connect to postgres database
\c postgres

-- Revoke privileges that are causing dependency issues
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM mpuser;
REVOKE ALL PRIVILEGES ON SCHEMA public FROM mpuser;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM mpuser;

-- Now try dropping the database and user
DROP DATABASE IF EXISTS matchperfect;
DROP USER IF EXISTS mpuser;

-- If you still get dependency errors, we can force it with:
-- Find dependent objects
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname = 'matchperfect';

-- Then drop database and user with FORCE
DROP DATABASE IF EXISTS matchperfect;
DROP OWNED BY mpuser;
DROP USER IF EXISTS mpuser;