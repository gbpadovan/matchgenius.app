 -- Create new user and database
CREATE USER mpuser WITH PASSWORD 'gustav16' NOSUPERUSER CREATEDB CREATEROLE INHERIT;
CREATE DATABASE matchperfect;

-- Grant initial connection privileges
GRANT CONNECT ON DATABASE matchperfect TO mpuser;

-- Connect to the new database
\c matchperfect

-- Grant schema privileges
GRANT USAGE ON SCHEMA public TO mpuser;
GRANT CREATE ON SCHEMA public TO mpuser;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO mpuser;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO mpuser;

-- Make mpuser the owner of the database
ALTER DATABASE matchperfect OWNER TO mpuser;

-- Verify permissions
SELECT pg_catalog.has_schema_privilege('mpuser', 'public', 'USAGE') AS has_usage,
       pg_catalog.has_schema_privilege('mpuser', 'public', 'CREATE') AS has_create;
