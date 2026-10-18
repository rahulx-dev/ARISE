import test from 'node:test';
import assert from 'node:assert/strict';
import { parseWorkoutDeepLink } from '../src/utils/deepLinks.js';

test('parseWorkoutDeepLink parses valid workout deep links with clamped targets', () => {
  const link = parseWorkoutDeepLink('arise://exercise/pushup?target=10&source=overlay');
  assert.deepEqual(link, { exerciseType: 'pushup', target: 10, source: 'overlay' });

  const clampedLink = parseWorkoutDeepLink('arise://exercise/squat?target=999999');
  assert.equal(clampedLink.target, 100);

  const negativeTarget = parseWorkoutDeepLink('arise://exercise/pushup?target=-5');
  assert.equal(negativeTarget.target, 1);
});

test('parseWorkoutDeepLink rejects forbidden/admin/unsupported routes', () => {
  assert.equal(parseWorkoutDeepLink('arise://admin/unlock-all'), null);
  assert.equal(parseWorkoutDeepLink('arise://debug/grant-coins?amount=10000'), null);
  assert.equal(parseWorkoutDeepLink('arise://exercise/invalid_type'), null);
  assert.equal(parseWorkoutDeepLink('https://evil.com/phish'), null);
});
