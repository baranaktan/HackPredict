-- =============================================
-- HackPredict Database Schema for Supabase
-- Run this in: Supabase Dashboard > SQL Editor
-- =============================================

-- 1. MIGRATIONS TABLE (tracks applied migrations)
CREATE TABLE IF NOT EXISTS migrations (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. LIVESTREAMS TABLE
CREATE TABLE IF NOT EXISTS livestreams (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  creator_wallet_address TEXT NOT NULL,
  stream_url TEXT,
  thumbnail_url TEXT,
  status TEXT DEFAULT 'scheduled' NOT NULL CHECK (status IN ('scheduled', 'active', 'ended')),
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  view_count INTEGER DEFAULT 0,
  category TEXT,
  tags JSONB DEFAULT '[]',
  transcript TEXT,
  market_ids JSONB DEFAULT '[]',
  market_address TEXT,
  user_id INTEGER,
  github_url TEXT DEFAULT 'https://github.com',
  avatar TEXT DEFAULT 'https://res.cloudinary.com/storagemanagementcontainer/image/upload/v1751747169/default-avatar_ynttwb.png',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Livestreams indexes
CREATE INDEX IF NOT EXISTS idx_livestreams_creator ON livestreams(creator_wallet_address);
CREATE INDEX IF NOT EXISTS idx_livestreams_status ON livestreams(status);
CREATE INDEX IF NOT EXISTS idx_livestreams_start_time ON livestreams(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_livestreams_tags ON livestreams USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_livestreams_market_ids ON livestreams USING gin(market_ids);
CREATE INDEX IF NOT EXISTS idx_livestreams_market_address ON livestreams(market_address);

-- 3. MARKET_METADATA TABLE
CREATE TABLE IF NOT EXISTS market_metadata (
  id SERIAL PRIMARY KEY,
  contract_address TEXT UNIQUE NOT NULL,
  creator_wallet_address TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  tags JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Market metadata indexes
CREATE INDEX IF NOT EXISTS idx_market_metadata_creator ON market_metadata(creator_wallet_address);
CREATE INDEX IF NOT EXISTS idx_market_metadata_category ON market_metadata(category);
CREATE INDEX IF NOT EXISTS idx_market_metadata_tags ON market_metadata USING gin(tags);

-- 4. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  wallet_address TEXT UNIQUE NOT NULL,
  email TEXT,
  username TEXT,
  avatar_url TEXT DEFAULT 'https://res.cloudinary.com/storagemanagementcontainer/image/upload/v1751747169/default-avatar_ynttwb.png',
  github_url TEXT,
  bio TEXT,
  win_rate DECIMAL(5,2) DEFAULT 0,
  total_winnings DECIMAL(18, 9) DEFAULT 0,
  total_bets INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  rank TEXT DEFAULT 'Newcomer',
  rating DECIMAL(3,1) DEFAULT 0.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_win_rate ON users(win_rate DESC);
CREATE INDEX IF NOT EXISTS idx_users_total_winnings ON users(total_winnings DESC);

-- Add foreign key for livestreams.user_id after users table exists
ALTER TABLE livestreams 
ADD CONSTRAINT fk_livestreams_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_livestreams_user_id ON livestreams(user_id);

-- 5. LIKES TABLE
CREATE TABLE IF NOT EXISTS likes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  livestream_id INTEGER REFERENCES livestreams(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, livestream_id)
);

-- Likes indexes
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_livestream_id ON likes(livestream_id);
CREATE INDEX IF NOT EXISTS idx_likes_created_at ON likes(created_at DESC);

-- 6. COMMENTS TABLE
CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  livestream_id INTEGER REFERENCES livestreams(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Comments indexes
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_livestream_id ON comments(livestream_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- 7. BETS TABLE
CREATE TABLE IF NOT EXISTS bets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  market_address TEXT NOT NULL,
  livestream_id INTEGER REFERENCES livestreams(id) ON DELETE SET NULL,
  amount DECIMAL(18, 9) NOT NULL,
  outcome BOOLEAN, -- true for yes, false for no
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'lost', 'cancelled')),
  payout DECIMAL(18, 9) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Bets indexes
CREATE INDEX IF NOT EXISTS idx_bets_user_id ON bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_market_address ON bets(market_address);
CREATE INDEX IF NOT EXISTS idx_bets_livestream_id ON bets(livestream_id);
CREATE INDEX IF NOT EXISTS idx_bets_status ON bets(status);
CREATE INDEX IF NOT EXISTS idx_bets_created_at ON bets(created_at DESC);

-- 8. PROJECTS TABLE
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  tags JSONB DEFAULT '[]',
  github_url TEXT,
  demo_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  volume DECIMAL(18, 9) DEFAULT 0,
  participants INTEGER DEFAULT 0,
  odds DECIMAL(5,2) DEFAULT 0,
  result TEXT CHECK (result IN ('won', 'lost', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Projects indexes
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_tags ON projects USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

-- 9. MARKETS TABLE (optional - for caching on-chain market data)
CREATE TABLE IF NOT EXISTS markets (
  id SERIAL PRIMARY KEY,
  contract_address TEXT UNIQUE NOT NULL,
  creator_wallet_address TEXT NOT NULL,
  question TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  tags JSONB DEFAULT '[]',
  livestream_id INTEGER REFERENCES livestreams(id) ON DELETE SET NULL,
  expiry_date TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'resolved')),
  total_volume DECIMAL(18, 9) DEFAULT 0,
  yes_volume DECIMAL(18, 9) DEFAULT 0,
  no_volume DECIMAL(18, 9) DEFAULT 0,
  resolved_outcome BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Markets indexes
CREATE INDEX IF NOT EXISTS idx_markets_creator ON markets(creator_wallet_address);
CREATE INDEX IF NOT EXISTS idx_markets_category ON markets(category);
CREATE INDEX IF NOT EXISTS idx_markets_livestream ON markets(livestream_id);
CREATE INDEX IF NOT EXISTS idx_markets_status ON markets(status);
CREATE INDEX IF NOT EXISTS idx_markets_tags ON markets USING gin(tags);

-- =============================================
-- Mark all migrations as applied
-- =============================================
INSERT INTO migrations (name) VALUES
  ('add_tags_and_transcript_columns'),
  ('add_market_ids_column'),
  ('create_market_metadata_table'),
  ('add_market_address_column'),
  ('create_users_table'),
  ('create_likes_table'),
  ('create_comments_table'),
  ('create_bets_table'),
  ('create_projects_table'),
  ('add_user_id_to_livestreams'),
  ('set_default_usernames'),
  ('add_github_url_to_livestreams'),
  ('add_avatar_to_livestreams'),
  ('create_markets_table')
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- SUCCESS! Database schema created.
-- =============================================
