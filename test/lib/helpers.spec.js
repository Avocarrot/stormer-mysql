const test = require('tape');
const h = require('../../lib/helpers');
const MockDate = require('mockdate');

test('h.toMysqlValue should return utc value for dates', (assert) => {
  assert.plan(1);
  MockDate.set('2017-01-16T14:24:50.008Z');
  assert.equals(h.toMysqlValue(new Date()), '2017-01-16 14:24:50');
  MockDate.reset();
});

test('h.toMysqlValue should return integer for booleans', (assert) => {
  assert.plan(3);
  assert.equals(h.toMysqlValue(true), 1);
  assert.equals(h.toMysqlValue(false), 0);
  assert.equals(h.toMysqlValue(1 === 1), 1);
});
