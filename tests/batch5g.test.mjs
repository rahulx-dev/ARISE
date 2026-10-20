import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Batch 5G: live-table shape normalization. CREATE TABLE IF NOT EXISTS
// never alters a table created by an older schema version, so the live
// coin-era user_wallets (no mana_crystals/level/streak/total_reps/
// total_xp) killed the live run at the Batch 5E clamp block with
// ERROR 42703: column "level" does not exist. The 5G section ensures
// every relied-on column BEFORE any upgrade block / policy / function
// can reference it. SQL assertions read the real supabase/schema.sql
// (same pattern as tests/batch5e.test.mjs / batch5f.test.mjs).
const schema = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8');

const SECTION_START = 'live-table shape normalization';
const SECTION_END = 'End of Batch 5G shape normalization';

function section() {
  const start = schema.indexOf(SECTION_START);
  assert.ok(start >= 0, '5G section header missing');
  const end = schema.indexOf(SECTION_END, start);
  assert.ok(end > start, '5G section end marker missing');
  return { start, end, text: schema.slice(start, end) };
}

test('5G: normalization section exists and runs before every consumer of the columns', () => {
  const { start, end } = section();
  const clampIdx = schema.indexOf('level = GREATEST(level, 1)');
  const cpxUpgradeIdx = schema.indexOf('Upgrade path for databases created before Batch 5D');
  const firstFnIdx = schema.indexOf('CREATE OR REPLACE FUNCTION');
  assert.ok(clampIdx > end, 'section must end before the Batch 5E wallet clamp UPDATE');
  assert.ok(cpxUpgradeIdx > end, 'section must end before the Batch 5D cpx upgrade DO block');
  assert.ok(firstFnIdx > end, 'section must end before the first CREATE OR REPLACE FUNCTION');
  assert.ok(start >= 0);
});

test('5G: the five wallet columns the live table is missing are ensured, with types', () => {
  const { text } = section();
  for (const col of ['mana_crystals', 'level', 'streak', 'total_reps', 'total_xp']) {
    assert.ok(
      text.includes(`ADD COLUMN IF NOT EXISTS ${col} INTEGER`),
      `user_wallets.${col} normalization missing`,
    );
  }
  // mana_crystals is the one column whose CHECK travels with the add.
  assert.ok(text.includes('CHECK (mana_crystals >= 0)'), 'mana_crystals CHECK missing');
});

test('5G: every table in the file has a normalization ALTER', () => {
  const { text } = section();
  for (const table of [
    'crystal_ledger',
    'coin_ledger',
    'user_wallets',
    'user_cloud_saves',
    'crystal_leaderboard',
    'crystal_redemptions',
    'payout_requests',
    'cpx_postback_log',
  ]) {
    assert.ok(
      text.includes(`ALTER TABLE IF EXISTS public.${table}`),
      `normalization ALTER missing for ${table}`,
    );
  }
});

test('5G: the section never drops a column and never adds a key column', () => {
  const { text } = section();
  assert.ok(!text.includes('DROP COLUMN'), 'normalization must not drop columns');
  // PRIMARY KEY / UNIQUE / serial columns are out of scope for ADD COLUMN.
  assert.ok(!text.includes('ADD COLUMN IF NOT EXISTS trans_id'), 'trans_id is UNIQUE in the def — must be skipped');
  assert.ok(!text.includes('ADD COLUMN IF NOT EXISTS email'), 'email is the cloud-saves PRIMARY KEY — must be skipped');
  assert.ok(!text.includes('ADD COLUMN IF NOT EXISTS id '), 'serial id columns must be skipped');
});

test('5G: NOT NULL columns with no default in the def are added nullable with a zero default', () => {
  const { text } = section();
  // crystal_ledger.user_id is TEXT NOT NULL with no default in the def.
  assert.ok(text.includes("ADD COLUMN IF NOT EXISTS user_id TEXT DEFAULT ''"));
  // user_cloud_saves.backup_data is JSONB NOT NULL with no default.
  assert.ok(text.includes("ADD COLUMN IF NOT EXISTS backup_data JSONB DEFAULT '{}'::jsonb"));
  // ...while a NOT NULL column WITH a default keeps NOT NULL.
  assert.ok(text.includes('ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 1'));
});
