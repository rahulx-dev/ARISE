import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Batch 5H: re-run-safety sweep of supabase/schema.sql. The live re-run
// (with 5G applied) got past the 5E clamp and died at the Batch 5D
// upgrade block with:
//   ERROR 42P07: relation "cpx_postback_provider_trans_unique" already exists
// The block guarded its ADD CONSTRAINT ... UNIQUE with
// EXCEPTION WHEN duplicate_object (42710), but a UNIQUE constraint's
// backing index is a relation, so Postgres raises 42P07
// (duplicate_table) instead. An earlier partial run had already added
// the constraint, so every re-run died there. These assertions pin the
// whole file's re-run-safety properties, not just that one handler.
// SQL assertions read the real supabase/schema.sql (same pattern as
// tests/batch5e/5f/5g.test.mjs). Comment lines are stripped first so
// mentions inside comments cannot create false passes or failures.
const schema = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8');
const code = schema
  .split('\n')
  .filter((line) => !line.trimStart().startsWith('--'))
  .join('\n');

// The EXCEPTION clause that guards the statement starting at `idx`:
// scan a short window forward for the first EXCEPTION WHEN ... ;
function guardAfter(idx, windowChars = 600) {
  const m = code.slice(idx, idx + windowChars).match(/EXCEPTION WHEN ([^;]+);/);
  assert.ok(m, `no EXCEPTION guard found within ${windowChars} chars of offset ${idx}`);
  return m[1];
}

test('5H: the cpx provider/trans UNIQUE block catches duplicate_table (42P07)', () => {
  const idx = code.indexOf('ADD CONSTRAINT cpx_postback_provider_trans_unique UNIQUE');
  assert.ok(idx >= 0, 'cpx_postback_provider_trans_unique ADD block missing');
  const guard = guardAfter(idx);
  assert.ok(guard.includes('duplicate_object'), 'guard must keep duplicate_object');
  assert.ok(guard.includes('duplicate_table'), 'guard must also catch duplicate_table (42P07)');
});

test('5H: the sibling cpx CHECK blocks in the same DO block are widened for uniformity', () => {
  for (const name of ['cpx_postback_status_check', 'cpx_postback_provider_check']) {
    const idx = code.indexOf(`ADD CONSTRAINT ${name} CHECK`);
    assert.ok(idx >= 0, `${name} ADD block missing`);
    const guard = guardAfter(idx);
    assert.ok(guard.includes('duplicate_table'), `${name} guard must catch duplicate_table too`);
  }
});

test('5H: NO ADD CONSTRAINT ... UNIQUE in the file is guarded by duplicate_object alone', () => {
  const re = /ADD CONSTRAINT\s+\S+\s+UNIQUE/g;
  let m;
  let found = 0;
  while ((m = re.exec(code)) !== null) {
    found += 1;
    const guard = guardAfter(m.index);
    assert.ok(
      guard.includes('duplicate_table'),
      `UNIQUE constraint at offset ${m.index} is guarded by "${guard.trim()}" — missing duplicate_table`,
    );
  }
  assert.ok(found >= 1, 'expected at least one ADD CONSTRAINT ... UNIQUE in schema.sql');
});

test('5H: every CREATE INDEX / CREATE UNIQUE INDEX carries IF NOT EXISTS', () => {
  const re = /CREATE (UNIQUE )?INDEX(?! IF NOT EXISTS)/g;
  const bad = [...code.matchAll(re)];
  assert.equal(bad.length, 0, `found ${bad.length} CREATE INDEX without IF NOT EXISTS`);
  // Sanity: the file really does create indexes (guard against a vacuous pass).
  assert.ok((code.match(/CREATE (UNIQUE )?INDEX IF NOT EXISTS/g) || []).length >= 15);
});

test('5H: every ADD COLUMN carries IF NOT EXISTS', () => {
  const re = /ADD COLUMN(?! IF NOT EXISTS)/g;
  const bad = [...code.matchAll(re)];
  assert.equal(bad.length, 0, `found ${bad.length} ADD COLUMN without IF NOT EXISTS`);
  assert.ok((code.match(/ADD COLUMN IF NOT EXISTS/g) || []).length >= 50);
});
