import assert from 'node:assert/strict';
import { calculateStats, getTotalDaysThrough, getWeekIndex, parseRelay } from '../app.mjs';

assert.equal(getWeekIndex('2026-08-18'), 0);
assert.equal(getWeekIndex('2026-10-12'), 7);
assert.equal(getWeekIndex('2026-10-13'), -1);
assert.equal(getTotalDaysThrough('2026-09-01'), 15);

const testRoster = [{ id: 'm01', name: 'Person A' }, { id: 'm02', name: 'Person B' }];
const parsed = parseRelay('today\n1.Person A\n2. Person A\n3.Person B\n4.Unknown', testRoster);
assert.deepEqual(parsed.names, ['Person A', 'Person B']);
assert.deepEqual(parsed.duplicates, ['PersonA']);
assert.deepEqual(parsed.unknown, ['Unknown']);

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
