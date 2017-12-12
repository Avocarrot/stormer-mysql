const debug = require('debug')('stormer-mysql:mock');
const util = require('util');
const stormer = require('stormer');

const Store = stormer.Store;
const NotFoundError = stormer.errors.NotFoundError;

const Condition = require('./lib/condition');

class Dummy extends Store {
  constructor(dataset) {
    super();
    this._dataset = new Map(dataset || []);
    this._alias = new Map();
  }

  define(name, schema) {
    const model = super.define(name, schema);
    this.alias(name, name);
    this.models[name].name = name;

    const dateTypes = Object.keys(schema).filter( key => schema[key].type && schema[key].type === 'Date');
    const data = (this._dataset.get(name) || []).map( entry => {
      dateTypes.forEach((name) => {
        entry[1][name] = new Date(entry[1][name]);
      });
      return entry;
    });
    const max  = Math.max.apply(null, (this._dataset.get(name) || []).map(obj => obj.id)) || 0;
    this._dataset.set(name, new Map(data));

    this.models[name].map = this._dataset.get(name);
    this.models[name].auto_increment = max;
    return model;
  }

  _dateify(schema, data) {
    Object.keys(schema).forEach((k) => {

      if (schema[k].type == 'Date' && !(data[k] instanceof Date)) {
        data[k] = new Date(data[k]);
      }
    });
    return data;
  }
  /**
   * Set an alias for a model name
   *
   * @param {Object} model - The model
   * @param {String} pk - The object's primary key
   * @return {Promise} - A Promise
   *
   */
  alias(alias, name) {
    this._alias.set(alias, name);
  }

  getModel(name) {
    return super.getModel(this._alias.get(name));
  }

  count(name, query) {
    const model = this.getModel(name);
    delete query._limit;
    delete query._offset;
    let count = Array.from(model.map.values()).filter( obj => Object.keys(query).every( q => obj[q]===query[q])).length;
    debug('count', model.name, count + '/' + model.map.size);
    return Promise.resolve(count);
  }
  /**
   * Handles the logic for getting an entry from the storage
   *
   * @param {Object} model - The model
   * @param {String} pk - The object's primary key
   * @return {Promise} - A Promise
   *
   */
  _get(model, pk) {
    if (model.map.has(pk)) {
      return Promise.resolve(this._dateify(model.schema.schema, model.map.get(pk)));
    }
    return Promise.reject(new NotFoundError(util.format('Could not find `%s` with primary key "%s"', model.name, pk)));
  }

  /**
   * Handles the logic for filtering entries from the storage
   *
   * @param {Object} model - The model
   * @param {String} query - The query object
   * @return {Promise} - A Promise. The resolved value should be an array. Return empty array if none is natching the query.
   *
   */
  _filter(model, query) {
    debug(model.name, query);
    const keys    = Object.keys(model.schema.schema);
    const compare = Object.keys(query).filter( k => ~keys.indexOf(k));
    debug(compare);
    const found   = [];
    model.map.forEach((value) => {
      const match = compare.every((key) => {
        debug(key, query[key], value[key]);
        if (query[key] instanceof Condition) {
          return query[key].compare(value[key]);
        }
        return query[key] == value[key];
      });
      if (match) {
        found.push(this._dateify(model.schema.schema, value));
      }
    });
    debug(found);
    return Promise.resolve(found);
  }

  /**
   * Handles the logic for creating or updating an entry in the storage
   *
   * @param {Object} obj - The entry
   * @return {Promise} - A Promise
   *
   */
  _set(model, obj, operation) {
    const pk = model.schema.primaryKey;
    if (operation === 'create') {
      const id = ++model.auto_increment;
      obj.id = id;
      model.map.set(obj[pk], obj);
      return Promise.resolve(obj);
    }
    if (operation === 'update') {
      const orig = model.map.get(obj[pk]);
      if (orig) {
        const keys = Object.keys(model.schema.schema);
        Object.keys(obj).filter( k => ~keys.indexOf(k)).forEach(key => {
          orig[key] = obj[key];
        });
        return Promise.resolve(orig);
      }
    }
    return Promise.reject(new Error(util.format('Unsupported operation: "%s"', operation)));
  }

  /**
   * Handles the logic for deleting an entry from the storage
   *
   * @param {String} query - The query object
   * @return {Promise} - A Promise. The resolved value should be the created obj.
   *
   */
  _delete() {
    return Promise.reject(new Error('Store.prototype._delete(query) is not implemented'));
  }
}

module.exports = Dummy;
