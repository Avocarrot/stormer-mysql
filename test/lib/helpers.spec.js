const test = require('tape');
const h = require('../../lib/helpers');
const MockDate = require('mockdate');

test('h.toMysqlDate should return utc value', (assert) => {
  assert.plan(1);
  MockDate.set('2017-01-16T14:24:50.008Z');
  assert.equals(h.toMysqlDate(new Date()), '2017-01-16 14:24:50');
  MockDate.reset();
});
