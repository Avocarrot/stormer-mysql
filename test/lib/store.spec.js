const test  = require('tape');
const NotFoundError = require('stormer').errors.NotFoundError;

const Store = require('../../lib/store');
const Condition = require('../../lib/condition');

const mysql = require('mysql');
const sinon = require('sinon');

const model = {
  id:  { type: 'String', primaryKey: true },
  foo: { type: 'String' }
};

test('new Store() should throw an error for', (t) => {
  t.test('missing mysql library', (assert) => {
    assert.plan(1);
    try {
      new Store();
    } catch(err) {
      assert.equals(err.message, 'mysql is required');
    }
  });
  t.test('missing mysql library', (assert) => {
    assert.plan(1);
    try {
      new Store(mysql);
    } catch(err) {
      assert.equals(err.message, 'options is required');
    }
  });
});

test('store.define(...) should define schema and name and schema', (assert) => {
  assert.plan(2);
  sinon.stub(mysql, 'createPool', ()=>{});
  const store = new Store(mysql, {});

  const model = store.define('test', { });
  assert.equals(model.name, 'test');
  assert.deepEquals(model.schema, { primaryKey: undefined, schema: {} });
  mysql.createPool.restore();
});

test('store.alias() should alias a model name', (assert) => {
  assert.plan(2);
  sinon.stub(mysql, 'createPool', ()=>{});
  const store = new Store(mysql, {});

  const actual = store.define('test_is_this_ugly_name', {});
  store.alias('test', 'test_is_this_ugly_name');

  assert.equals(actual, store.getModel('test'));
  assert.equals(actual, store.getModel('test_is_this_ugly_name'));
  mysql.createPool.restore();
});

test('store.get("model", pk) should resolve with an object', (assert) => {
  assert.plan(3);
  const id = "some-uuid";
  const expected = { id: Date.now() };
  let timeout = Math.random();
  sinon.stub(mysql, 'createPool', ()=> {
    return {
      query: (options, cb) => {
        assert.equals(options.sql, "SELECT `id`, `foo` FROM `test_table_name` WHERE `id` = 'some-uuid'  LIMIT 1;");
        assert.equals(options.timeout, timeout);
        cb(null, [ expected ]);
      }
    };
  });

  const store = new Store(mysql, {timeout});
  store.define('test_table_name', model);
  store.alias('test', 'test_table_name');

  store.get('test', id)
    .then(actual => assert.equals(actual, expected))
    .catch(err => assert.error(err));

  mysql.createPool.restore();
});

test('store.get("model", pk) should reject with a NotFoundError', (assert) => {
  assert.plan(2);
  sinon.stub(mysql, 'createPool', ()=> {
    return {
      query: (sql, cb) => {
        cb(null, [ ]);
      }
    };
  });

  const store = new Store(mysql, {});
  store.define('test', model);

  store.get('test', 1).catch(err => {
    assert.ok(err instanceof NotFoundError);
    assert.equals(err.message, 'Could not find `test` with primary key "1"');
  });

  mysql.createPool.restore();
});

test('store.get("model", pk) should reject with a NotFoundError', (assert) => {
  assert.plan(2);
  sinon.stub(mysql, 'createPool', ()=> {
    return {
      query: (sql, cb) => {
        cb();
      }
    };
  });

  const store = new Store(mysql, {});
  store.define('test', model);

  store.get('test', 1).catch(err => {
    assert.ok(err instanceof NotFoundError);
    assert.equals(err.message, 'Could not find `test` with primary key "1"');
  });

  mysql.createPool.restore();
});

test('store.get("model", pk) should reject with a NotFoundError', (assert) => {
  assert.plan(1);
  const expected = new Error('some error');
  sinon.stub(mysql, 'createPool', ()=> {
    return {
      query: (sql, cb) => {
        cb(expected);
      }
    };
  });

  const store = new Store(mysql, {});
  store.define('test', model);

  store.get('test', 1).catch(actual => assert.equals(actual, expected));
  mysql.createPool.restore();
});

test('store.create(model, {}) should resolve with obj created', (assert) => {
  assert.plan(3);
  let timeout = Math.random();
  sinon.stub(mysql, 'createPool', ()=> {
    return {
      query: (options, cb) => {
        assert.equals(options.sql,'INSERT INTO `test_table_name` (`id`,`foo`) VALUES (\'1\',\'1\');');
        assert.equals(options.timeout, timeout);
        cb(null, { affectedRows: 1 });
      }
    };
  });

  const store = new Store(mysql, { timeout });
  store.define('test_table_name', model);
  store.alias('test', 'test_table_name');

  const expected = { id: "1", foo: "1" };
  store.create('test', expected)
    .then(actual => assert.deepEquals(actual, expected));
  mysql.createPool.restore();
});

test('store.create(model, {}) should reject with err', (assert) => {
  assert.plan(1);
  const expected = new Error('some error');
  sinon.stub(mysql, 'createPool', ()=> {
    return {
      query: (sql, cb) => {
        cb(expected);
      }
    };
  });

  const store = new Store(mysql, {});
  store.define('test', model);

  store.create('test', { id: "1", foo: "1" })
    .catch(actual => assert.equals(actual, expected));
  mysql.createPool.restore();
});

test('store.create(model, {}) should reject with err', (assert) => {
  assert.plan(1);
  const expected = 'No row was affected from the operation';
  sinon.stub(mysql, 'createPool', ()=> {
    return {
      query: (sql, cb) => {
        cb(null, { affectedRows: 0 });
      }
    };
  });

  const store = new Store(mysql, {});
  store.define('test', model);

  store.create('test', { id: "1", foo: "1" })
    .catch(actual => assert.equals(actual.message, expected));
  mysql.createPool.restore();
});

test('store.update(model, {}) should resolve with obj updated', (assert) => {
  assert.plan(3);
  let timeout = Math.random();
  sinon.stub(mysql, 'createPool', ()=> {
    return {
      query: (options, cb) => {
        assert.equals(options.sql,'UPDATE `test_table_name` SET `foo` = \'1\' WHERE `id` = \'1\' LIMIT 1;');
        assert.equals(options.timeout, timeout);
        cb(null, { affectedRows: 1 });
      }
    };
  });

  const store = new Store(mysql, { timeout });
  store.define('test_table_name', model);
  store.alias('test', 'test_table_name');

  const expected = { id: "1", foo: "1" };
  store.update('test', expected)
    .then(actual => assert.deepEquals(actual, expected));
  mysql.createPool.restore();
});

test('store.update(model, {}) should reject with err', (assert) => {
  assert.plan(1);
  const expected = new Error('some error');
  sinon.stub(mysql, 'createPool', ()=> {
    return {
      query: (sql, cb) => {
        cb(expected);
      }
    };
  });

  const store = new Store(mysql, {});
  store.define('test', model);

  store.update('test', { id: "1", foo: "1" })
    .catch(actual => assert.equals(actual, expected));
  mysql.createPool.restore();
});

test('store.update(model, {}) should reject with err', (assert) => {
  assert.plan(1);
  const expected = 'No row was affected from the operation';
  sinon.stub(mysql, 'createPool', ()=> {
    return {
      query: (sql, cb) => {
        cb(null, { affectedRows: 0 });
      }
    };
  });

  const store = new Store(mysql, {});
  store.define('test', model);

  store.update('test', { id: "1", foo: "1" })
    .catch(actual => assert.equals(actual.message, expected));
  mysql.createPool.restore();
});

test('store.delete(model, query) should reject for not implemented', (assert) => {
  assert.plan(1);
  sinon.stub(mysql, 'createPool', ()=> {
    return {};
  });

  const store = new Store(mysql, {});
  store.define('test', model);

  store.delete('test', { })
    .catch(actual => assert.equals(actual.message, 'Store.prototype._delete(query) is not implemented'));
  mysql.createPool.restore();
});

test('store.filter(model, query) should resolve with array', (assert) => {
  assert.plan(3);
  let timeout = Math.random();
  const expected = [ { foo: "1" }, { foo: "2" } ];
  sinon.stub(mysql, 'createPool', ()=> {
    return {
      query: (options, cb) => {
        assert.equals(options.sql, 'SELECT `id`, `foo` FROM `test` WHERE `foo` >= 1 AND `foo` =< 10;');
        assert.equals(options.timeout, timeout);
        cb(null, expected);
      }
    };
  });

  const store = new Store(mysql, { timeout });
  store.define('test', model);

  store.filter('test', {
    min: new Condition('foo', '>=', 1),
    max: new Condition('foo', '=<', 10),
    will_not_appear_in_query: new Condition('ho_ho_ho', '=<', 10),
    will_not_appear_in_query_2: new Condition('foo', '=<', 'ho_ho_ho', false),
  })
    .then(actual => assert.deepEquals(actual, expected))
    .catch(err => assert.error(err));
  mysql.createPool.restore();
});

test('store.filter(model, query) should prepare query with or conditions', (assert) => {
  assert.plan(3);
  let timeout = Math.random();
  const expected = [ ];
  sinon.stub(mysql, 'createPool', ()=> {
    return {
      query: (options, cb) => {
        assert.equals(options.sql, 'SELECT `id`, `foo` FROM `test` WHERE (`id` = 1 OR `id` = 2) AND (`foo` = \'bar\' OR `foo` = \'foo\')  LIMIT 1 OFFSET 10;');
        assert.equals(options.timeout, timeout);
        cb(null, expected);
      }
    };
  });

  const store = new Store(mysql, { timeout });
  store.define('test', model);

  store.filter('test', {
    search_for_id: [ new Condition('id', '=', 1), new Condition('id', '=', 2) ],
    search_for_foo: [ new Condition('foo', '=', 'bar'), new Condition('foo', '=', 'foo') ],
    _limit:  1,
    _offset: 10
  })
    .then(actual => assert.deepEquals(actual, expected))
    .catch(err => assert.error(err));
  mysql.createPool.restore();
});

test('store.filter(model, query) should query with limit/offset', (assert) => {
  assert.plan(3);
  let timeout = Math.random();
  const expected = [ ];
  sinon.stub(mysql, 'createPool', ()=> {
    return {
      query: (options, cb) => {
        assert.equals(options.sql, 'SELECT `id`, `foo` FROM `test` WHERE 1=1  LIMIT 1 OFFSET 10;');
        assert.equals(options.timeout, timeout);
        cb(null, expected);
      }
    };
  });

  const store = new Store(mysql, { timeout });
  store.define('test', model);

  store.filter('test', {
    _limit:  1,
    _offset: 10
  })
    .then(actual => assert.deepEquals(actual, expected))
    .catch(err => assert.error(err));
  mysql.createPool.restore();
});

test('store.filter(model, query) should query with order by for existing properties', (assert) => {
  assert.plan(3);
  let timeout = Math.random();
  const expected = [ ];
  sinon.stub(mysql, 'createPool', ()=> {
    return {
      query: (options, cb) => {
        assert.equals(options.sql, 'SELECT `id`, `foo` FROM `test` WHERE 1=1 ORDER BY `foo` DESC, `id` ASC;');
        assert.equals(options.timeout, timeout);
        cb(null, expected);
      }
    };
  });

  const store = new Store(mysql, { timeout });
  store.define('test', model);

  store.filter('test', {
    _order: { foo: 'DESC', id: 'ASC', unknown: 'ASC' }
  })
    .then(actual => assert.deepEquals(actual, expected))
    .catch(err => assert.error(err));
  mysql.createPool.restore();
});

test('store.filter(model, query) should query without order by for not existing properties', (assert) => {
  assert.plan(3);
  let timeout = Math.random();
  const expected = [ ];
  sinon.stub(mysql, 'createPool', ()=> {
    return {
      query: (options, cb) => {
        assert.equals(options.sql, 'SELECT `id`, `foo` FROM `test` WHERE 1=1;');
        assert.equals(options.timeout, timeout);
        cb(null, expected);
      }
    };
  });

  const store = new Store(mysql, { timeout });
  store.define('test', model);

  store.filter('test', {
    _order: { unknown: 'ASC' }
  })
    .then(actual => assert.deepEquals(actual, expected))
    .catch(err => assert.error(err));
  mysql.createPool.restore();
});

test('store.count(model, query) should perform count query', (assert) => {
  assert.plan(3);
  let timeout = Math.random();
  const expected = [ { count: 1 } ];
  sinon.stub(mysql, 'createPool', ()=> {
    return {
      query: (options, cb) => {
        assert.equals(options.sql, 'SELECT COUNT(*) AS `count` FROM `test` WHERE `foo` = \'bar\';');
        assert.equals(options.timeout, timeout);
        cb(null, expected);
      }
    };
  });

  const store = new Store(mysql, { timeout });
  store.define('test', model);

  store.count('test', {  foo: 'bar', _limit: 10, _offset: 100 })
    .then(actual => assert.deepEquals(actual, 1))
    .catch(err => assert.error(err));
  mysql.createPool.restore();
});

test('store._set(model, obj, \'operation\') should reject for unsupported operation', (assert) => {
  assert.plan(1);
  const store = new Store(mysql, {});
  store.define('test', model);

  store._set({}, {}, 'something').catch(err => assert.equals(err.message, 'Unsupported operation: "something"'));
});
