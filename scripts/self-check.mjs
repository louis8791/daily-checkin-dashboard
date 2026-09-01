import assert from 'node:assert/strict';
await import('../app.mjs');
const { calculateStats, getTotalDaysThrough, getWeekIndex, inferRelayDate, parseRelay } = globalThis.CheckinCore;

assert.equal(getWeekIndex('2026-08-18'), 0);
assert.equal(getWeekIndex('2026-10-12'), 7);
assert.equal(getWeekIndex('2026-10-13'), -1);
assert.equal(getTotalDaysThrough('2026-09-01'), 15);
assert.equal(inferRelayDate('2026/08/25 今日接龍'), '2026-08-25');
assert.equal(inferRelayDate('8月25日 今日接龍'), '2026-08-25');
assert.equal(inferRelayDate('8/19（三）我已完成'), '2026-08-19');
assert.equal(inferRelayDate('今天接龍'), null);

const testRoster = [{ id: 'm01', name: 'Person A' }, { id: 'm02', name: 'Person B' }];
const parsed = parseRelay('today\n1.Person A\n2. Person A\n3.Person B\n4.Unknown', testRoster);
assert.deepEqual(parsed.names, ['Person A', 'Person B', 'Unknown']);
assert.deepEqual(parsed.duplicates, ['Person A']);
assert.deepEqual(parsed.unknown, []);
assert.deepEqual(parsed.newNames, ['Unknown']);
const pastedShape = parseRelay('[daily slogan\n8/19（三）我已完成\n1.A\n2.B]', [{ id: 'm01', name: 'A' }, { id: 'm02', name: 'B' }]);
assert.deepEqual(pastedShape.names, ['A', 'B']);
assert.deepEqual(pastedShape.unknown, []);
const autoRoster = parseRelay('[daily slogan\n8/19（三）我已完成\n1.A\n2.B]', []);
assert.deepEqual(autoRoster.names, ['A', 'B']);
assert.deepEqual(autoRoster.ids, ['m01', 'm02']);
assert.deepEqual(autoRoster.newNames, ['A', 'B']);

const stats = calculateStats({
  roster: testRoster,
  records: {
    '2026-08-18': ['m01', 'm02'],
    '2026-08-19': ['m01'],
  },
  importedDays: ['2026-08-18', '2026-08-19'],
  asOf: '2026-08-19',
});
assert.equal(stats.people[0].weekly[0].count, 2);
assert.equal(stats.people[0].weekly[0].total, 2);
assert.equal(stats.people[0].rate, 1);
assert.equal(stats.people[1].rate, 0.5);
console.log('PASS self-check: date ranges, relay parsing, and weekly stats');
