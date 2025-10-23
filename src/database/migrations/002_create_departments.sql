-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    university_id INTEGER NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    faculty VARCHAR(255),
    language VARCHAR(100) DEFAULT 'Türkçe',
    aliases TEXT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_departments_university_id ON departments(university_id);
CREATE INDEX IF NOT EXISTS idx_departments_name_trgm ON departments USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_departments_faculty ON departments(faculty);
CREATE INDEX IF NOT EXISTS idx_departments_language ON departments(language);

-- Create composite index for university and department search
CREATE INDEX IF NOT EXISTS idx_departments_university_name ON departments(university_id, name);

-- Create trigger for departments table
CREATE TRIGGER update_departments_updated_at 
    BEFORE UPDATE ON departments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();