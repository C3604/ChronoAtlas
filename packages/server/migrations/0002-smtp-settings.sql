-- SMTP settings migration (PostgreSQL)

CREATE TABLE IF NOT EXISTS smtp_settings (
  id integer PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  host varchar(255) NOT NULL DEFAULT '',
  port integer NOT NULL DEFAULT 587,
  secure boolean NOT NULL DEFAULT false,
  username varchar(255) NULL,
  password varchar(255) NULL,
  from_address varchar(255) NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
