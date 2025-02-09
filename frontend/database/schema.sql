-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL
);

-- Tables (Dining Tables/Parties) Table
CREATE TABLE dining_tables (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  dining_hall_name TEXT NOT NULL,
  table_size INTEGER NOT NULL CHECK (table_size > 0),
  topic_of_discussion TEXT NOT NULL,
  is_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table Members (for tracking who's at which table)
CREATE TABLE table_members (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  table_id UUID REFERENCES dining_tables(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(table_id, user_id)
);

-- Table Messages (Chat Messages)
CREATE TABLE table_messages (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  table_id UUID REFERENCES dining_tables(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  username TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE dining_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_messages ENABLE ROW LEVEL SECURITY;

-- Policies for Users
CREATE POLICY "Users can read other users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Policies for Dining Tables
CREATE POLICY "Anyone can read tables"
  ON dining_tables FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create tables"
  ON dining_tables FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Only owner can update table"
  ON dining_tables FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Only owner can delete table"
  ON dining_tables FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- Policies for Table Members
CREATE POLICY "Anyone can read table members"
  ON table_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Members can join unlocked tables"
  ON table_members FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    NOT EXISTS (
      SELECT 1 FROM dining_tables
      WHERE id = table_id AND is_locked = true
    )
  );

-- Policies for Messages
CREATE POLICY "Members can send messages"
  ON table_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM table_members
      WHERE table_id = table_messages.table_id
      AND user_id = auth.uid()
    )
  );

-- Add new policies for anonymous access to table_messages
DROP POLICY IF EXISTS "Anyone can read messages" ON table_messages;
DROP POLICY IF EXISTS "Anyone can insert messages" ON table_messages;

CREATE POLICY "Anyone can read messages"
  ON table_messages FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anyone can insert messages"
  ON table_messages FOR INSERT
  TO anon
  WITH CHECK (true);

-- Enable Realtime for messages if not already enabled
ALTER PUBLICATION supabase_realtime ADD TABLE table_messages;

-- Create indexes for better performance
CREATE INDEX idx_table_messages_table_id ON table_messages(table_id);
CREATE INDEX idx_table_members_table_id ON table_members(table_id);
CREATE INDEX idx_dining_tables_owner ON dining_tables(owner_id);

-- Enable RLS
ALTER TABLE table_messages ENABLE ROW LEVEL SECURITY; 