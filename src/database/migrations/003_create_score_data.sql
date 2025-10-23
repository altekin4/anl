-- Create score_data table
CREATE TABLE IF NOT EXISTS score_data (
    id SERIAL PRIMARY KEY,
    department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    score_type VARCHAR(10) NOT NULL CHECK (score_type IN ('TYT', 'SAY', 'EA', 'SOZ', 'DIL')),
    base_score DECIMAL(6,2),
    ceiling_score DECIMAL(6,2),
    base_rank INTEGER,
    ceiling_rank INTEGER,
    quota INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_score_data_department_year ON score_data(department_id, year);
CREATE INDEX IF NOT EXISTS idx_score_data_year ON score_data(year);
CREATE INDEX IF NOT EXISTS idx_score_data_score_type ON score_data(score_type);
CREATE INDEX IF NOT EXISTS idx_score_data_base_score ON score_data(base_score);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_score_data_dept_year_type ON score_data(department_id, year, score_type);

-- Create unique constraint to prevent duplicate entries
CREATE UNIQUE INDEX IF NOT EXISTS idx_score_data_unique ON score_data(department_id, year, score_type);

-- Add constraint to ensure base_score <= ceiling_score
ALTER TABLE score_data ADD CONSTRAINT chk_score_data_scores 
    CHECK (base_score IS NULL OR ceiling_score IS NULL OR base_score <= ceiling_score);

-- Add constraint to ensure base_rank >= ceiling_rank (lower rank number means better rank)
ALTER TABLE score_data ADD CONSTRAINT chk_score_data_ranks 
    CHECK (base_rank IS NULL OR ceiling_rank IS NULL OR base_rank >= ceiling_rank);