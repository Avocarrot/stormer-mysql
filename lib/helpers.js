'use strict'
const assert = require('assert');

/**
 *  Transforms a javascript object to its mysql counterpart
 */
const toMysqlValue = (val) => {
  if (val instanceof Date) {
    return val.toISOString().replace('T', ' ').substring(0, 19);
  }
  if (typeof(val) === 'boolean') {
    return val ? 1 : 0;
  }
  return val;
};

/**
 *  Serializes mysql values to a javascript object based on the provided schema
 */
const fromMysqlValues = (schema, obj) => {
  assert(schema, 'schema must be provided');
  assert(obj, 'no object to serialize');
  return Object.keys(obj).reduce((acc, el) => {
    if (schema[el]) {
      if (schema[el].type === 'Date') {
        acc[el] = new Date(obj[el]);
      } else if (schema[el].type === 'Boolean') {
        acc[el] = Boolean(obj[el]);
      } else {
        acc[el] = obj[el];
      }
    }
    return acc;
  }, {});
};

module.exports = { toMysqlValue, fromMysqlValues };
