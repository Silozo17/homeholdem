
-- Add new enum values (must be committed separately before use)
ALTER TYPE poker_table_type ADD VALUE IF NOT EXISTS 'private';
ALTER TYPE poker_table_type ADD VALUE IF NOT EXISTS 'community';
