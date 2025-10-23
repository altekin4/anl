-- Create net_values table for storing historical net-to-score conversion data
CREATE TABLE IF NOT EXISTS net_values (
    id SERIAL PRIMARY KEY,
    score_type VARCHAR(10) NOT NULL CHECK (score_type IN ('TYT', 'SAY', 'EA', 'SOZ', 'DIL')),
    year INTEGER NOT NULL,
    subject VARCHAR(50) NOT NULL, -- e.g., 'Matematik', 'Türkçe', 'Fizik', etc.
    net_value DECIMAL(4,2) NOT NULL, -- Points per correct answer
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_net_values_score_type ON net_values(score_type);
CREATE INDEX IF NOT EXISTS idx_net_values_year ON net_values(year);
CREATE INDEX IF NOT EXISTS idx_net_values_subject ON net_values(subject);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_net_values_type_year ON net_values(score_type, year);

-- Create unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_net_values_unique ON net_values(score_type, year, subject);

-- Insert default net values for 2024 (example data)
INSERT INTO net_values (score_type, year, subject, net_value) VALUES
-- TYT values
('TYT', 2024, 'Türkçe', 2.5),
('TYT', 2024, 'Matematik', 2.5),
('TYT', 2024, 'Sosyal Bilimler', 2.5),
('TYT', 2024, 'Fen Bilimleri', 2.5),

-- AYT SAY values
('SAY', 2024, 'Matematik', 4.0),
('SAY', 2024, 'Fizik', 4.0),
('SAY', 2024, 'Kimya', 4.0),
('SAY', 2024, 'Biyoloji', 4.0),

-- AYT EA values
('EA', 2024, 'Matematik', 4.0),
('EA', 2024, 'Coğrafya', 4.0),
('EA', 2024, 'Tarih', 4.0),

-- AYT SOZ values
('SOZ', 2024, 'Edebiyat', 4.0),
('SOZ', 2024, 'Tarih', 4.0),
('SOZ', 2024, 'Coğrafya', 4.0),

-- AYT DIL values
('DIL', 2024, 'Yabancı Dil', 5.0)

ON CONFLICT (score_type, year, subject) DO NOTHING;