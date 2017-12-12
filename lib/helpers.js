'use strict'
const toMysqlValue = (val) => {
  if (val instanceof Date) {
    return val.toISOString().replace('T', ' ').substring(0, 19);
  }
  if (typeof(val) === 'boolean') {
    return val ? 1 : 0;
  }
  return val;
};

module.exports = { toMysqlValue };
