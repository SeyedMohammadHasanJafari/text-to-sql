-- =============================================================================
-- 001 · System schema
-- Owner: app_admin. The `app` schema is invisible to readonly_agent
-- (no USAGE is ever granted), so AI-generated SQL can never reach it.
-- =============================================================================

CREATE OR REPLACE FUNCTION app.touch_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------------
CREATE TABLE app.users (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text        NOT NULL UNIQUE
                            CHECK (email = lower(email) AND char_length(email) <= 254),
  password_hash text        NOT NULL,
  display_name  text        CHECK (char_length(display_name) BETWEEN 1 AND 80),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Datasets: one row per uploaded file → one physical table in the user's sandbox
-- ---------------------------------------------------------------------------
CREATE TYPE app.dataset_status AS ENUM ('processing', 'ready', 'failed');

CREATE TABLE app.datasets (
  id                uuid               PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid               NOT NULL REFERENCES app.users (id) ON DELETE CASCADE,
  table_name        text               NOT NULL CHECK (table_name ~ '^[a-z_][a-z0-9_]{0,62}$'),
  original_filename text               NOT NULL CHECK (char_length(original_filename) BETWEEN 1 AND 255),
  status            app.dataset_status NOT NULL DEFAULT 'processing',
  row_count         integer            CHECK (row_count >= 0),
  error_message     text,
  created_at        timestamptz        NOT NULL DEFAULT now(),
  updated_at        timestamptz        NOT NULL DEFAULT now(),
  UNIQUE (user_id, table_name)
);

-- ---------------------------------------------------------------------------
-- Dataset columns + semantic layer
-- ---------------------------------------------------------------------------
CREATE TABLE app.dataset_columns (
  id                   uuid     PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id           uuid     NOT NULL REFERENCES app.datasets (id) ON DELETE CASCADE,
  ordinal              smallint NOT NULL CHECK (ordinal >= 0),
  column_name          text     NOT NULL CHECK (column_name ~ '^[a-z_][a-z0-9_]{0,62}$'),
  original_name        text     NOT NULL,
  data_type            text     NOT NULL
                                CHECK (data_type IN ('integer', 'bigint', 'numeric', 'boolean', 'date', 'timestamptz', 'text')),
  semantic_description text     CHECK (char_length(semantic_description) <= 500),
  UNIQUE (dataset_id, column_name),
  UNIQUE (dataset_id, ordinal)
);

-- ---------------------------------------------------------------------------
-- Chat
-- ---------------------------------------------------------------------------
CREATE TYPE app.chat_role AS ENUM ('user', 'assistant');

CREATE TABLE app.chat_sessions (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES app.users (id) ON DELETE CASCADE,
  title      text        NOT NULL DEFAULT 'New chat' CHECK (char_length(title) BETWEEN 1 AND 120),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX chat_sessions_user_recent_idx ON app.chat_sessions (user_id, updated_at DESC);

CREATE TABLE app.chat_messages (
  id         uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid          NOT NULL REFERENCES app.chat_sessions (id) ON DELETE CASCADE,
  role       app.chat_role NOT NULL,
  content    text          NOT NULL,
  sql_query  text,
  chart_data jsonb,
  created_at timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX chat_messages_session_timeline_idx ON app.chat_messages (session_id, created_at);

-- ---------------------------------------------------------------------------
-- Dashboard pins (FRD: "dashboards"; one row = one pinned chart).
-- Stores a data snapshot for instant rendering AND the source SQL so the
-- chart can be refreshed later through the sandbox.
-- ---------------------------------------------------------------------------
CREATE TYPE app.chart_type AS ENUM ('bar', 'line', 'pie');

CREATE TABLE app.dashboard_pins (
  id                uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid           NOT NULL REFERENCES app.users (id) ON DELETE CASCADE,
  source_message_id uuid           REFERENCES app.chat_messages (id) ON DELETE SET NULL,
  title             text           NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  chart_type        app.chart_type NOT NULL,
  chart_data        jsonb          NOT NULL,
  sql_query         text,
  position          integer        NOT NULL DEFAULT 0,
  created_at        timestamptz    NOT NULL DEFAULT now()
);

CREATE INDEX dashboard_pins_user_position_idx ON app.dashboard_pins (user_id, position);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
CREATE TRIGGER users_touch_updated_at
  BEFORE UPDATE ON app.users FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

CREATE TRIGGER datasets_touch_updated_at
  BEFORE UPDATE ON app.datasets FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

CREATE TRIGGER chat_sessions_touch_updated_at
  BEFORE UPDATE ON app.chat_sessions FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
