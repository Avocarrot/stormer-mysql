# Stormer MySQL
Implementation of Stormer Store for MySQL

[![CircleCI](https://circleci.com/gh/Avocarrot/stormer-mysql/tree/master.svg?style=shield&circle-token=58155d22b1cfff8895ed7d53417c7f63ea3f6170)](https://circleci.com/gh/Avocarrot/stormer-mysql/tree/master)

## Requirements

- [stormer ^v0.9.0 ](https://www.npmjs.com/package/stormer)
- [mysql ^v2.31.0 ](https://www.npmjs.com/package/mysql)

## Usage

```js
const mysql = require('mysql');
const Store = require('stormer-mysql').MySqlStore;

// mysql connection options as found here:
//https://www.npmjs.com/package/mysql#connection-options
const options = {}; 

const db = new Store(mysql, options);
```

## Contributing

This project is work in progress and we'd love more people contributing to it. 

1. Fork the repo
2. Apply your changes
3. Write tests
4. Submit your pull request
