'use strict'
const util = require('util');
const stormer = require('stormer');
const assert = require('assert');
const debug = require('debug')('store:mysql');

const parseDate = require('./helpers').toMysqlDate;

const Store = stormer.Store;
const NotFoundError = stormer.errors.NotFoundError;

const Condition = require('./condition');

class MySql extends Store {
  constructor(mysql, options) {
    assert(mysql, 'mysql is required');
    assert(options, 'options is required');
    super();
    this._prepare = mysql.format.bind(mysql);
    this._pool = mysql.createPool(options);

    this._alias = new Map();
  }

  define(name, schema) {
    const model = super.define(name, schema);
    this.alias(name, name);
    this.models[name].name = name;
    return model;
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

  /**
   * Handles the logic for getting an entry from the storage
   *
   * @param {Object} model - The model
   * @param {String} pk - The object's primary key
   * @return {Promise} - A Promise
   *
   */
  _get(model, pk) {
    const query = { _limit: 1 };
    query[model.schema.primaryKey] = pk;
    return this._filter(model, query).then((result) => {
      if (result && result.length > 0) {
        return Promise.resolve(result[0]);
      }
      return Promise.reject(new NotFoundError(util.format('Could not find `%s` with primary key "%s"', model.name, pk)));
    });
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
    const keys = Object.keys(model.schema.schema);

    const select = (new Array(keys.length)).fill('??').join(', ');
    let limit = '';
    let order = '';
    if (query.hasOwnProperty('_limit')) {
      limit = util.format('LIMIT %s', query._limit);
    }
    if (query.hasOwnProperty('_order') && query._order instanceof Object) {
      order = Object.keys(query._order).reduce((order, key) => {
        let direction = query._order[key];
        if (~keys.indexOf(key) && (direction === 'ASC' || direction === 'DESC' )) {
          order.push(util.format('`%s` %s', key, direction));
        }
        return order;
      }, []);

      if ( order.length > 0 ) {
        order = util.format('ORDER BY %s', order.join(', '));
      }
    }

    const where = Object.keys(query).reduce((conditions, key) => {
      let condition = query[key];
      debug(key);
      if (!(condition instanceof Condition)) {
        condition = new Condition(key, '=', query[key]);
      }
      if (!~keys.indexOf(condition.left)) {
        return conditions;
      }
      if (!condition.isValue && !~keys.indexOf(condition.right)) {
        return conditions;
      }
      conditions.push(condition);
      return conditions;
    }, [ '1=1' ]).join(' AND ');


    const statement = util.format('SELECT %s FROM ?? WHERE %s %s %s', select, where, order, limit).trim() + ';'
    const sql = this._prepare(statement, keys.concat([ model.name ]));
    debug(sql);
    return new Promise((resolve, reject) => {
      this._pool.query(sql, (err, result) => {
        if (err) {
          return reject(err);
        }
        return resolve(result);
      });
    });
  }

  /**
   * Handles the logic for creating or updating an entry in the storage
   *
   * @param {Object} obj - The entry
   * @return {Promise} - A Promise
   *
   */
  _set(model, obj, operation) {
    let sql = '';
    switch(operation) {
    case 'create': {
      sql = this._prepareInsert(model, obj);
      break;
    }
    case 'update': {
      sql = this._prepareUpdate(model, obj);
      break;
    }
    default: {
      return Promise.reject(new Error(util.format('Unsupported operation: "%s"', operation)));
    }
    }
    return new Promise((resolve, reject) => {
      this._pool.query(sql, (err, result) => {
        if (err) {
          return reject(err);
        }
        if (result.affectedRows == 0) {
          return reject(new Error('No row was affected from the operation'));
        }
        if (result.insertId) {
          obj.id = result.insertId;
        }
        return resolve(obj);
      });
    });
  }

  _prepareInsert(model, obj) {
    const keys = Object.keys(model.schema.schema);
    const obj_keys = Object.keys(obj).filter( k => ~keys.indexOf(k));

    const into = (new Array(obj_keys.length)).fill('??').join(',');
    const values = (new Array(obj_keys.length)).fill('?').join(',');

    const statement = util.format('INSERT INTO ?? (%s) VALUES (%s);', into, values);
    return this._prepare(statement, [ model.name ].concat(obj_keys).concat(obj_keys.map( k => {
      if (obj[k] instanceof Date) {
        return parseDate(obj[k]);
      }
      return obj[k];
    })));
  }

  _prepareUpdate(model, obj) {
    const keys = Object.keys(model.schema.schema);
    const obj_keys = Object.keys(obj).filter( k => ~keys.indexOf(k));

    // prepare set syntax with keys - minus the primary key
    const set = (new Array(obj_keys.length-1)).fill('?? = ?').join(',');

    const pk = model.schema.primaryKey;
    const statement = util.format('UPDATE ?? SET %s WHERE %s LIMIT 1;', set, new Condition(pk, '=', obj[pk]));

    return this._prepare(statement, obj_keys.reduce((result, key) => {
      if (key!=pk) {
        result.push(key);
        result.push(obj[key]);
      }
      return result;
    }, [ model.name ]));
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

module.exports = MySql;
