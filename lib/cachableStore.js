const debug = require('debug')('store:mysqlcachable');
const assert = require('assert');
const { Store, errors } = require('stormer');
const MySqlStore = require('./store');


class Cachable extends MySqlStore {
  constructor(mysql, options, cache) {
    super(mysql, options);
    assert(cache instanceof Store, 'cache must be an instanceof StormerStore');
    this._cache = cache;
  }

  define(name, schema) {
    this._cache.define(name, schema);
    return super.define(name, schema);
  }

  alias(alias, name) {
    this._cache.alias(alias, name);
    super.alias(alias, name);
  }

  get(modelName, pk) {
    return new Promise( (resolve, reject) => {
      this._cache.get(modelName, pk)
        .then(resolve)
        .catch( err => {
          if ( !(err instanceof errors.NotFoundError) ) {
            return reject(err);
          }
          debug('store._cache.get returned error', err);
          return super.get(modelName, pk)
            .then( found => {
              resolve(found);
              this._cache.create(modelName, found).catch( err => {
                debug('store._cache.create returned error', err);
              });
            })
            .catch(reject);
        });
    });
  }

  create(modelName, obj) {
    return new Promise( (resolve, reject) => {
      super.create(modelName, obj)
        .then( created => {
          resolve(created);
          this._cache.create(modelName, created).catch( err => {
            debug('store._cache.create returned error', err);
          });
        }).catch(reject);
    });
  }

  delete(modelName, query) {
    return super.delete(modelName, query).then( () => {
      this._cache.delete(modelName, query);
    });
  }

}

module.exports = Cachable;
