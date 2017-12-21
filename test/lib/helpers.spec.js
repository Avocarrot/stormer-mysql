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

test('h.fromMysqlValues should throw error for missing schema', (assert) => {
  assert.plan(1);
  try {
    h.fromMysqlValues();
  } catch (err) {
    assert.equals(err.message, 'schema must be provided');
  }
});

test('h.fromMysqlValues should throw error for missing object', (assert) => {
  assert.plan(1);
  try {
    h.fromMysqlValues({});
  } catch (err) {
    assert.equals(err.message, 'no object to serialize');
  }
});

test('h.fromMysqlValues should serialize mysql values to js objects', (assert) => {
  assert.plan(1);
  MockDate.set('1977-03-03T01:00:00.000Z');
  const schema = {
    name: { type: 'String' },
    owned: { type: 'Boolean' },
    issueDate: { type: 'Date' }
  };
  const mysqlResult = {
    name: 'Rumours',
    owned: 1,
    issueDate: '1977-03-03T01:00:00.000Z'
  };
  const expected = {
    name: 'Rumours',
    owned: true,
    issueDate: new Date()
  };
  assert.deepEquals(h.fromMysqlValues(schema, mysqlResult), expected);
});
