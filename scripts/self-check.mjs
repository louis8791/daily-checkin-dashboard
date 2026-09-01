import assert from 'node:assert/strict';
import { calculateStats, getTotalDaysThrough, getWeekIndex, members, parseRelay } from '../app.mjs';

assert.equal(getWeekIndex('2026-08-18'), 0);
assert.equal(getWeekIndex('2026-10-12'), 7);
assert.equal(getWeekIndex('2026-10-13'), -1);
assert.equal(getTotalDaysThrough('2026-09-01'), 15);

const parsed = parseRelay('今天一起加油\n1.小明\n2. 小明\n3.小王\n4.陌生人', members);
assert.deepEqual(parsed.names, ['小明', '小王']);
assert.deepEqual(parsed.duplicates, ['小明']);
assert.deepEqual(parsed.unknown, ['陌生人']);

const stats = calculateStats({
  roster: members.slice(0, 2),
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
