CREATE TABLE IF NOT EXISTS mod_example_package_items (
  id SERIAL PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  priority INTEGER NOT NULL DEFAULT 3,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  owner_user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT mod_example_package_items_status_chk
    CHECK (status IN ('draft', 'active', 'archived')),
  CONSTRAINT mod_example_package_items_priority_chk
    CHECK (priority BETWEEN 1 AND 5)
);

CREATE INDEX IF NOT EXISTS mod_example_package_items_owner_user_id_idx
  ON mod_example_package_items(owner_user_id);
CREATE INDEX IF NOT EXISTS mod_example_package_items_status_idx
  ON mod_example_package_items(status);
CREATE INDEX IF NOT EXISTS mod_example_package_items_public_idx
  ON mod_example_package_items(is_public);

CREATE TABLE IF NOT EXISTS mod_example_package_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL,
  setting_value TEXT NOT NULL,
  updated_by_user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS mod_example_package_settings_key_idx
  ON mod_example_package_settings(setting_key);
