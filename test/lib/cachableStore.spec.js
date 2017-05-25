const test = require('tape');
const { MySqlCachableStore } = require('../../index');

const { MemcachedStore, MockMemcached } = require('stormer-memcached');

const cache = new MemcachedStore(MockMemcached);

const sinon = require('sinon');
const mysql = require('mysql');

const model = {
  id:  { type: 'String', primaryKey: true },
  foo: { type: 'String' }
};

test('new MySqlCachableStore() should throw an assert error', assert => {
  assert.plan(1);
  sinon.stub(mysql, 'createPool', ()=>{});
  try {
    new MySqlCachableStore(mysql, {});
  } catch(err) {
    assert.equals(err.message, 'cache must be an instanceof StormerStore');
    mysql.createPool.restore();
  }
});

test('MySqlCachableStore.get should perform query only once', assert => {
  assert.plan(3);
  
  const expected = { id: String(Date.now() + Math.random()) };
  const pool = {
    query: sinon.spy((options, cb) => {
      cb(null, [ expected ]);
    })
  };
  sinon.stub(mysql, 'createPool').returns(pool);

  const store = new MySqlCachableStore(mysql, {}, cache);
  store.define('my_model', model);
  store.alias('model', 'my_model');

  store.get('model', expected.id)
    .then(actual => {
      assert.deepEquals(actual, expected)
      setTimeout( ()=> store.get('model', expected.id)
        .then(actual => {
          assert.deepEquals(actual, expected);
          assert.ok(pool.query.calledOnce);
        })
        .catch(err => assert.error(err))
      , 10);
    })
    .catch(err => assert.error(err));

  mysql.createPool.restore();
});

test('MySqlCachableStore.create should keep model in cache', assert => {
  assert.plan(3);
  
  const expected = { id: String(Date.now() + Math.random()) };
  const pool = {
    query: sinon.spy((options, cb) => {
      cb(null, [ expected ]);
    })
  };
  sinon.stub(mysql, 'createPool').returns(pool);

  const store = new MySqlCachableStore(mysql, {}, cache);
  store.define('my_model', model);
  store.alias('model', 'my_model');

  store.create('model', expected)
    .then( actual => {
      assert.deepEquals(actual, expected);
      setTimeout( ()=> store.get('model', expected.id)
        .then(actual => {
          assert.deepEquals(actual, expected);
          assert.ok(pool.query.calledOnce);
        })
        .catch(err => assert.error(err))
      , 10);
    })
    .catch(err => assert.error(err));

  mysql.createPool.restore();
});

test('MySqlCachableStore.create should keep model in cache', assert => {
  assert.plan(3);
  
  const expected = { id: String(Date.now()) };
  const pool = {
    query: sinon.spy((options, cb) => {
      cb(null, [ expected ]);
    })
  };
  sinon.stub(mysql, 'createPool').returns(pool);

  const store = new MySqlCachableStore(mysql, {}, cache);
  store.define('my_model', model);
  store.alias('model', 'my_model');

  store.create('model', expected)
    .then( actual =>{
      assert.deepEquals(actual, expected);
      setTimeout( ()=> store.get('model', expected.id)
        .then(actual => {
          assert.deepEquals(actual, expected);
          assert.ok(pool.query.calledOnce);
        })
        .catch(err => assert.error(err))
      , 10);
    })
    .catch(err => assert.error(err));

  mysql.createPool.restore();
});

test('MySqlCachableStore.delete should reject unsupported', assert => {
  assert.plan(1);
  
  const expected = { id: String(Date.now()) };
  const pool = {
    query: sinon.spy((options, cb) => {
      cb(null, [ expected ]);
    })
  };
  sinon.stub(mysql, 'createPool').returns(pool);

  const store = new MySqlCachableStore(mysql, {}, cache);
  store.define('my_model', model);
  store.alias('model', 'my_model');

  store.delete('model', expected)
    .catch(err => assert.equals(err.message, 'Store.prototype._delete(query) is not implemented'));

  mysql.createPool.restore();
});
