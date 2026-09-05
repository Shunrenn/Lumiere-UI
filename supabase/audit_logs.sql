-- Production SQL DDL for generic unified audit_logs table
-- Enforces mandatory NOT NULL reason constraint and JSONB target_snapshot support

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  module TEXT NOT NULL,
  action_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  target_snapshot JSONB DEFAULT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for efficient module & action_type lookups
CREATE INDEX IF NOT EXISTS idx_audit_logs_module_action ON audit_logs(module, action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_id ON audit_logs(target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
