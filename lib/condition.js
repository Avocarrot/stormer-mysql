'use strict'
const util = require('util');
const { toMysqlValue } = require('./helpers');
const assert = require('assert');
const mysql = require('mysql');

const GT = '>';
const DIFF = '<>';
const GQ = '>=';
const LS = '<';
const LQ = '=<';
const LIKE = 'LIKE';
const EQ = '=';

const ops = [ DIFF, GT, GQ, LS, LQ, EQ, LIKE ];

class Condition {
  constructor(left, operator, right, isValue = true) {
    assert(left, 'left is required');
    assert(~ops.indexOf(operator), util.format('operator must be one of the operators: %s', ops.join(',')));
    assert(typeof right !== 'undefined' && right !== null , 'right is required');
    this.operator = operator;
    this.right = right;
    this.left = left;
    this.isValue = isValue;
  }

  toString() {
    return mysql.format(this.preformat, this.parts);
  }

  compare(value) {
    if (!this.isValue) {
      return false;
    }
    switch(this.operator) {
    case GT:
      return value > this.right;
    case DIFF:
      return value != this.right;
    case GQ:
      return (value === this.right || value > this.right);
    case LS:
      return value < this.right;
    case LQ:
      return (value === this.right || value < this.right);
    case LIKE:
      return (new RegExp(this.right.replace(/%/gi, '(.*)+'))).test(value);
    case EQ:
      return value === this.right;
    }
  }

  get preformat() {
    return util.format('%s %s %s', '??', this.operator, (this.isValue) ? '?' : '??');
  }

  get parts() {
    return [ this.left, toMysqlValue(this.right) ];
  }
}

module.exports = Condition;
