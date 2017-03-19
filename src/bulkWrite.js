import Promise from 'bluebird';
import { Collection, Db } from 'mongodb';
import monk from 'monk';

/*
 *  TODO:
 *    1) concurrency,
 *    2) tests,
 *    3) proper comment formatting,
 *    4) backwards compatability,
 *    5) streams,
 */

export class BulkWrite {
  constructor({
    collection, // string or instance of mongodb collection, allow monk instance?
    concurrency = 1000, // TODO: add support for concurrency
    db, // url string or instance of mongodb db
    dbOptions, // mongodb connection options
    filter = {}, // which documents to update
    idField = '_id', // if mapping, what field to match on
    operations, // pre built set of operations, if you want to do that for some reason
    options = {}, // any options to pass to bulk update
    ...additionalOptions,
  }) {
    if (!collection) {
      throw new Error('Missing required option: "collection"');
    }

    let connectedCollection;

    // TODO: need to check instanceof? or just if object? (support other mongo libs)
    if (typeof collection === 'string') {
      if (!db) {
        throw new Error('Missing option: "db"');
      }

      if (db instanceof Db) {
        connectedCollection = db.collection(collection);
      } else if (typeof db === 'string') {
        connectedCollection = monk(db, dbOptions).get(collection);
      } else {
        throw new Error('Invalid option format: "db"');
      }
    } else if (collection instanceof Collection) {
      connectedCollection = collection;
    } else {
      throw new Error('Invalid option format: "collection"');
    }

    if (operations && !Array.isArray(operations) && typeof operations !== 'function') {
      throw new Error('Invalid option format: "operations"');
    }

    Object.assign(this, {
      collection: connectedCollection,
      concurrency,
      filter,
      idField,
      operations,
      options: {
        ordered: true, // Add test for this
        ...options,
      },
      ...additionalOptions,
    });
  }

  buildOperations() { // should this just be operations(), and allow being overwritten?
    throw new Error(`Must add buildOperations method to ${this.constructor.name}`);
  }

  async execute() {
    let operations;

    if (typeof this.operations === 'function') {
      operations = await Promise.try(() => this.operations());
    } else if (Array.isArray(this.operations)) {
      operations = this.operations;
    } else {
      operations = await this.buildOperations();
    }

    return this.collection.bulkWrite(operations, this.options);
  }
}

export default function bulkWrite(options) {
  return new BulkWrite(options).execute();
}
