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

    this.timeout = options.timeout || 1000;
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
   * Perform count operation on model
   * @param {String} name - Model name or alias
   * @param {Object} query - Query object
   * @return {Promise} - Promise resolved with an integer
   */
  count(name, query) {
    const model = this.getModel(name);
    delete query._limit;
    delete query._offset;
    const statement = this._statement(Object.keys(model.schema.schema), query, 'COUNT(*) AS `count`');
    const sql = this._prepare(statement, [ model.name ]);
    debug(sql);
    return new Promise((resolve, reject) => {
      let timeout = this.timeout;
      this._pool.query({ sql, timeout }, (err, result) => {
        if (err) {
          return reject(err);
        }
        return resolve(result.pop().count);
      });
    });
  }

  /**
   * Handles the logic for filtering entries from the storage
   *
   * @param {Object} model - The model
   * @param {Objest} query - The query object
   * @return {Promise} - A Promise. The resolved value should be an array. Return empty array if none is natching the query.
   *
   */
  _filter(model, query) {
    const keys = Object.keys(model.schema.schema);

    const statement = this._statement(keys, query, false);
    const sql = this._prepare(statement, keys.concat([ model.name ]));
    debug(sql);
    return new Promise((resolve, reject) => {
      let timeout = this.timeout;
      this._pool.query({ sql, timeout }, (err, result) => {
        if (err) {
          return reject(err);
        }
        return resolve(result);
      });
    });
  }

  /**
   * Statement to used to prepare the query 
   *
   * @param {Array|String} keys - If String then the actual SELECT part, if Array properties to select
   * @param {Object} query - The query object
   * @return {String} - Statement to perform query
   */
  _statement(keys, query, select = null) {
    if (!select) {
      select = (new Array(keys.length)).fill('??').join(', ');
    }
    let order  = '';
    let limit  = '';
    let offset = '';
    if (query.hasOwnProperty('_limit')) {
      limit = util.format('LIMIT %s', query._limit);
    }
    if (query.hasOwnProperty('_offset')) {
      offset = util.format('OFFSET %s', query._offset);
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

    const where = this._where(keys, query);

    return util.format('SELECT %s FROM ?? WHERE %s %s %s %s', select, where, order, limit, offset).trim() + ';'
  }

 
  _prepareCondition(keys) {
    return (condition, key) => {
      if (condition instanceof Array) {
        let or = condition.filter(c=>c instanceof Condition).map(this._prepareCondition(keys)).filter(c=>c);

        if (or.length === 0) {
          return null;
        }
        return util.format('(%s)', or.join(' OR '));
      }
      if (!(condition instanceof Condition)) {
        condition = new Condition(key, '=', condition);
      }
      if (!~keys.indexOf(condition.left)) {
        return null;
      }
      if (!condition.isValue && !~keys.indexOf(condition.right)) {
        return null;
      }
      return condition;
    }
  }

  _where(keys, query, concat = 'AND') {
    const prepare = this._prepareCondition(keys);
    let conditions = Object.keys(query).reduce((conditions, key) => {
      debug(key);
      let condition = prepare(query[key], key);
      if (condition === null) {
        return conditions;
      }
      conditions.push(condition);
      return conditions;
    }, []);
    if (conditions.length === 0) {
      return '1=1';
    }
    return conditions.join(util.format(' %s ', concat));
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
      let timeout = this.timeout;
      this._pool.query({ sql, timeout }, (err, result) => {
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
