mongo-bulk
================

[![Build Status](https://travis-ci.org/jeremybini/mongo-bulk.svg?branch=master)](https://travis-ci.org/jeremybini/mongo-bulk)
[![Coverage Status](https://coveralls.io/repos/github/jeremybini/mongo-bulk/badge.svg?branch=master)](https://coveralls.io/github/jeremybini/mongo-bulk?branch=master)

> Lightweight wrapper around [mongodb's bulkWrite](https://mongodb.github.io/node-mongodb-native/2.2/api/Collection.html#bulkWrite) method.

## Purpose

MongoDB does not support self-reference during write/update operations. Updating large datasets with references requires at least three steps:
1. Fetch matching documents
2. Map documents to update
3. Pass updates to bulkWrite API

Furthermore, when dealing with very large datasets, concurrency/memory must be monitored and throttled to avoid running out of memory.

With mongo-bulk, this can be reduced to a single operation.

### Usage

mongo-bulk supplies the following imports
```js
import bulkWrite, { bulkDelete, bulkInsert, bulkReplace, bulkUpdate } from 'mongo-bulk'
```

Each of these methods require the following props:
* `collection`: a collection name string, or a valid mongodb Collection instance (required)
* `db`: a mongo url, or a valid mongodb Db instance (required if collection is a string)
* `document`: an object to be passed in to the bulk operation, or a function that returns an object (required)
    * for 'insert' operations the function will receive the current index as its argument
    * for 'update' and 'replace' operations the function will recieve the old document as its argument
* `filter`: a query object specifying which documents to run the bulk operations against (default is all documents)
* `type`: the type of bulk operation to run (only required if using bulkWrite)

The following props are optional:
* `concurrency`: desired number of concurrent operations (default is 1000)
* `count`: the number of documents to insert (required for bulkInsert, default is 1)
* `operations`: a pre-built array of operations (Note: with this, the document option is not required)
* `options`: an options object to be passed to [mongodb's bulkWrite](https://mongodb.github.io/node-mongodb-native/2.2/api/Collection.html#bulkWrite)


Each method returns a `promise`, which resolves to a BulkWrite result.

## Examples

### Insert
```js
import { bulkInsert } from 'mongo-bulk';

return bulkInsert({
  collection: '...collectionName...',
  db: '...mongoUrl...',
  count: 1000000,
  document: currentIndex => ({
    property: currentIndex
  }),
});
```

### Update
```js
import { bulkUpdate } from 'mongo-bulk';

return bulkUpdate({
  collection: '...collectionName...',
  db: '...mongoUrl...',
  filter: {},
  document: oldDoc => ({
    $set: {
      newProperty: oldDoc.property * 2,
    }
  }),
});
```

## Installation

```
$ npm install mongo-bulk
```


## Tests

```
$ npm test
```


## License

Copyright (c) 2017

Licensed under the [MIT license](LICENSE).
