import test from 'node:test';
import assert from 'node:assert/strict';

function parseWorkoutDeepLink(urlStr) {
  try {
    const url = new URL(urlStr);
    if (url.protocol !== 'arise:') return null;

    if (url.host === 'exercise') {
      const exerciseType = url.pathname.replace('/', '').toLowerCase();
      if (!['pushup', 'squat', 'plank', 'jumping_jack'].includes(exerciseType)) {
        return null;
      }
      const rawTarget = parseInt(url.searchParams.get('target') || '10', 10);
      const target = Number.isFinite(rawTarget) ? Math.max(1, Math.min(100, rawTarget)) : 10;
      const source = (url.searchParams.get('source') || 'direct').slice(0, 32);

      return { exerciseType, target, source };
    }

    if (url.host === 'watch-ad-unlock' || url.host === 'shop') {
      return { action: url.host };
    }

    return null;
  } catch {
    return null;
  }
}

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
