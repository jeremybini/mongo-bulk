import Promise from 'bluebird';
import { isFunction, isNil, isPlainObject, isString } from 'lodash';
import { MongoClient } from 'mongodb';

import BulkResults from './BulkResults';

const SUPPORTED_TYPES = [
  'delete', 'insert', 'replace', 'update',
];

const TYPE_FIELD_DICTIONARY = {
  insert: 'document',
  replace: 'replacement',
  update: 'update',
};

const UPSERT_METHODS = [
  'replace',
  'update',
];

export class BulkWrite {
  constructor(options) {
    Object.assign(this, {
      ...options,
      count: isNil(options.count) ? 1 : options.count,
      concurrency: options.concurrency || 1000,
      filter: options.filter || {},
      idField: options.idField || '_id',
      options: {
        ordered: true, // Add test for this?
        ...options.options,
      },
      results: [],
      queue: [],
    });

    this.ensureValidOptions();
  }

  buildOperation({ document, filter, many = false }) {
    const { type } = this;

    const documentField = TYPE_FIELD_DICTIONARY[type];
    const operationType = many ? `${type}Many` : `${type}One`;

    const operation = {
      [operationType]: {
        filter,
        [documentField]: { ...document },
      },
    };

    if (UPSERT_METHODS.includes(type)) {
      operation[operationType].upsert = this.upsert;
      return operation;
    }

    return operation;
  }

  async bulkWrite(operations) {
    const collection = await this.getCollection();
    const result = await collection.bulkWrite(operations, this.options);
    return new BulkResults(result);
  }

  ensureValidOptions() {
    const { collection, db, document, operations, type } = this;
    const errors = [];

    if (!collection) {
      errors.push('missing option - "collection"');
    } else if (isString(collection)) {
      if (!db) {
        errors.push('missing option - "db"');
      } else if (!isString(db) && !isFunction(db.collection)) {
        errors.push('invalid option format - "db"');
      }
    } else if (!isFunction(collection.bulkWrite)) {
      errors.push('invalid option format - "collection"');
    }

    if (operations) {
      if (!Array.isArray(operations)) {
        errors.push('invalid option format - "operations"');
      }
    } else if (!type) {
      errors.push('missing options - must supply either "operations" or "type"');
    } else if (!SUPPORTED_TYPES.includes(type)) {
      errors.push('invalid option value - "type"');
    } else if (type !== 'delete') {
      if (!document) {
        errors.push('missing option - "document"');
      } else if (!isFunction(document) && !isPlainObject(document)) {
        errors.push('invalid option value - "document"');
      }
    }

    if (errors.length) {
      throw new Error(`Unable to perform bulk operation:\n${errors.join('\n')}`);
    }
  }

  async execute() {
    const { document, filter, operations } = this;

    if (operations) {
      return this.bulkWrite(operations);
    } else if (this.shouldExecuteInChunks()) {
      return this.executeInChunks();
    }

    // We only call a single "${type}Many" operation if a POJO document was supplied,
    // and we are not inserting
    const operation = this.buildOperation({
      document,
      filter,
      many: true,
    });

    return this.bulkWrite([operation]);
  }

  async executeInChunks() {
    const cursor = await this.getCursor();

    await this.processCursor(cursor);

    return new BulkResults(this.results);
  }

  async getCollection() {
    const { collection } = this;

    if (isString(collection)) {
      const db = await this.getDb();
      return db.collection(collection);
    }

    return collection;
  }

  async getCursor() {
    const { count, type } = this;

    if (type === 'insert') {
      let index = 0;

      // Mock out a mongo cursor for insert operations
      return {
        async next() {
          if (count === 0 || index >= count) {
            return null;
          }

          const currentIndex = index;
          index += 1;

          return currentIndex;
        },
      };
    }

    const collection = await this.getCollection();
    return collection.find(this.filter);
  }

  async getDb() {
    const { db, dbOptions, dbResolver } = this;

    // Only call connect once
    if (!dbResolver) {
      this.dbResolver = new Promise(async (resolve, reject) => {
        try {
          // Call connect if a db url was supplied
          if (isString(db)) {
            const connectedDb = await MongoClient.connect(db, dbOptions);
            resolve(connectedDb);
          }

          // Otherwise, a resolve the supplied db connection
          resolve(db);
        } catch (err) {
          reject(err);
        }
      });
    }

    return this.dbResolver;
  }

  // TODO: Test large data sets and long-running "document" functions
  // Determine if cursor stream support to pause/resume stream while processing queue is needed
  async processCursor(cursor) {
    const { concurrency, queue } = this;

    const doc = await cursor.next();

    if (doc === null) {
      // Process any remaining docs in queue
      return this.processQueue();
    }

    queue.push(doc);

    if (queue.length === concurrency) {
      await this.processQueue();
      this.queue = [];
    }

    return this.processCursor(cursor);
  }

  async processQueue() {
    const { document, idField, results, queue } = this;

    // Return so we don't pass empty operations to bulkWrite
    if (!queue.length) {
      return results;
    }

    const docMapper = isFunction(document) ? document : () => document;

    const operations = await Promise.map(queue, async (item) => {
      // Build the bulk document based on the supplied "document" function
      const doc = await Promise.try(() => docMapper(item));
      const documentFilter = { [idField]: item[idField] };

      // TODO: Validate document
      // Check if object, require $set, etc for 'updates', throw error 'did you mean "replace"' ???
      if (!isPlainObject(doc)) {
        throw new Error('"document" function must return a value');
      }

      // Create a `${type}One` operation for each record
      return this.buildOperation({
        document: doc,
        filter: documentFilter,
      });
    });

    const bulkResult = await this.bulkWrite(operations);

    results.push(bulkResult);

    return results;
  }

  shouldExecuteInChunks() {
    const { document, type } = this;

    return isFunction(document) || type === 'insert';
  }
}

export default async function bulkWrite(options) {
  return new BulkWrite(options).execute();
}
