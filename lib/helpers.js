'use strict'
const toMysqlDate = (date) => {
  return date.toISOString().replace('T', ' ').substring(0, 19);
};

module.exports = { toMysqlDate };
