-- Create universities table
CREATE TABLE IF NOT EXISTS universities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(100),
    type VARCHAR(50) CHECK (type IN ('Devlet', 'Vakıf')),
    aliases TEXT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for name search with trigram similarity
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_universities_name_trgm ON universities USING gin(name gin_trgm_ops);

-- Create index for city and type filtering
CREATE INDEX IF NOT EXISTS idx_universities_city ON universities(city);
CREATE INDEX IF NOT EXISTS idx_universities_type ON universities(type);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for universities table
CREATE TRIGGER update_universities_updated_at 
    BEFORE UPDATE ON universities 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();