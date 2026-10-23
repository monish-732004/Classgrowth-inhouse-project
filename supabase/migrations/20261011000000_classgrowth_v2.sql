-- ClassGrowth v2 migration — PART 1 of 2
-- Run this first, then run 20261011000000_classgrowth_v2_part2.sql
-- Reason: ALTER TYPE ... ADD VALUE must be committed before the new values can be used.

-- ============================================================
-- 0. Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- 1. Expand user_role enum (must be committed before use in part 2)
-- ============================================================
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'fa';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'co_fa';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'cr';
