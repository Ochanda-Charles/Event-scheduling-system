-- ============================================
-- DATABASE SCHEMA
-- ============================================
-- Phase 4: Core Tables
-- Phase 5: Organization Members
-- Phase 6: Analytics + Notifications

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  role VARCHAR(50) DEFAULT 'member', 
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ORGANIZATIONS TABLE (Teams)
CREATE TABLE IF NOT EXISTS organizations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ORGANIZATION MEMBERS (Phase 5 - Many-to-Many: Users <-> Organizations)
CREATE TABLE IF NOT EXISTS organization_members (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',  -- 'admin', 'member'
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id, user_id)    -- A user can only be a member once
);

-- BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  status VARCHAR(50) DEFAULT 'confirmed',  -- 'confirmed', 'cancelled'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ANALYTICS EVENTS TABLE (Phase 6)
-- High-write table — stores every user action for dashboarding
CREATE TABLE IF NOT EXISTS analytics_events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(100) NOT NULL,       -- 'PAGE_VIEW', 'BOOKING_CREATED', 'LOGIN', etc.
  metadata JSONB DEFAULT '{}',            -- Flexible payload (page, device, etc.)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on event_type for fast dashboard queries
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_events(created_at);

-- NOTIFICATIONS TABLE (Phase 6)
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL,             -- 'BOOKING_CONFIRMED', 'ORG_INVITE', 'SYSTEM', etc.
  title VARCHAR(255) NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',            -- Extra data (booking_id, org_id, etc.)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for fast "unread notifications" queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);
