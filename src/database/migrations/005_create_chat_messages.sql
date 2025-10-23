-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(10) NOT NULL CHECK (message_type IN ('user', 'bot')),
    intent VARCHAR(50),
    entities JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_type ON chat_messages(message_type);

-- Create composite index for session messages ordered by time
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_time ON chat_messages(session_id, created_at);

-- Create GIN index for entities JSONB column
CREATE INDEX IF NOT EXISTS idx_chat_messages_entities ON chat_messages USING gin(entities);

-- Create index for intent analysis
CREATE INDEX IF NOT EXISTS idx_chat_messages_intent ON chat_messages(intent) WHERE intent IS NOT NULL;

-- Add constraint to ensure content is not empty
ALTER TABLE chat_messages ADD CONSTRAINT chk_chat_messages_content 
    CHECK (length(trim(content)) > 0);