'use strict'
const test = require('tape');
const h = require('../../lib/helpers');

const Condition = require('../../lib/condition');

test('new Condition() should throw an error', (t) => {
  t.test('for missing parameter left', (assert) => {
    assert.plan(1);
    try { new Condition(); }
    catch(err) {
      assert.equals(err.message, 'left is required');
    }
  });
  t.test('for not supporrted operator', (assert) => {
    assert.plan(1);
    try { new Condition('test'); }
    catch(err) {
      assert.equals(err.message, 'operator must be one of the operators: <>,>,>=,<,=<,=,LIKE');
    }
  });
  t.test('for not supported operator', (assert) => {
    assert.plan(1);
    try { new Condition('test', '='); }
    catch(err) {
      assert.ok(err.message, 'right is required');
    }
  });
});

test('condition.toString() should return value check', (assert) => {
  assert.plan(2);
  assert.equals(String(new Condition('test', '=', 1)), '`test` = 1');
  assert.equals(String(new Condition('test', '=', '1')), '`test` = \'1\'');
});

test('condition.toString() should return comparison check', (assert) => {
  assert.plan(6);
  assert.equals(String(new Condition('test', '>', 'test2', false)), '`test` > `test2`');
  assert.equals(String(new Condition('test', '<', 'test2', false)), '`test` < `test2`');
  assert.equals(String(new Condition('test', '=', 'test2', false)), '`test` = `test2`');
  assert.equals(String(new Condition('test', '<>', 'test2', false)), '`test` <> `test2`');
  assert.equals(String(new Condition('test', '>=', 'test2', false)), '`test` >= `test2`');
  assert.equals(String(new Condition('test', '=<', 'test2', false)), '`test` =< `test2`');
});

test('condition.toString() should transform objects', (assert) => {
  assert.plan(2);
  const now = new Date();
  assert.equals(String(new Condition('datefield', '=', now)), '`datefield` = \'' +  h.toMysqlValue(now) + '\'' );
  assert.equals(String(new Condition('tinyint', '=', true)), '`tinyint` = 1');
});

test('condition.compare() should handle compare values', (assert) => {
  assert.plan(10);
  assert.equals(false, (new Condition('t', '=', 'test', false)).compare('test'));
  assert.equals(true,  (new Condition('t', '=', 'test',  true)).compare('test'));
  assert.equals(true,  (new Condition('t', '>',  0, true)).compare(1));
  assert.equals(true,  (new Condition('t', '<>', 0, true)).compare(1));
  assert.equals(true,  (new Condition('t', '>=', 0, true)).compare(0));
  assert.equals(true,  (new Condition('t', '>=', 0, true)).compare(1));
  assert.equals(true,  (new Condition('t', '<',  0,  true)).compare(-1));
  assert.equals(true,  (new Condition('t', '=<', 0,  true)).compare(0));
  assert.equals(true,  (new Condition('t', '=<', 0,  true)).compare(-1));
  assert.equals(true,  (new Condition('t', 'LIKE', '%test%',  true)).compare('atest'));
});
