import Promise from 'bluebird';
import { isFunction, isObject } from 'lodash';

import { BulkWrite } from './bulkWrite';

/*
 *  TODO:
 *    1) concurrency,
 *    2) tests,
 *    3) proper comment formatting,
 *    4) backwards compatability,
 *    5) streams,
 */

export class BulkUpdate extends BulkWrite {
  constructor(options) {
    if (!options.update) {
      throw new Error('Missing required option: "update"');
    }

    super(options);
  }

  async buildOperations() {
    const { collection, filter, idField, operations, update, upsert } = this;

    if (operations) {
      return operations;
    }

    // We only support a single operation if a POJO update is supplied,
    // since we are not dynamically generating the updates
    if (!isFunction(update)) {
      return [{
        updateMany: {
          filter,
          update,
          upsert,
        },
      }];
    }

    // TODO: support concurrency

    // If update is a mapper function, we need to fetch documents for mapping
    const documents = await collection.find(filter); // skip().limit()

    if (!documents.length) {
      console.warn('No matching documents found for BulkUpdate');

      // Return a blank update operation, in order to return a consistent BulkWriteResult
      return [{
        updateOne: {
          filter,
          update: {
            $set: {},
          },
          upsert,
        }
      }];
    }

    return Promise.map(documents, async (doc) => {
      const documentUpdate = await Promise.try(() => update(doc));
      const documentFilter = { [idField]: doc[idField] };

      if (!isObject(documentUpdate)) {
        throw new Error('"update" function must return a value');
      }

      // TODO: support validation

      return {
        updateOne: {
          filter: documentFilter,
          update: documentUpdate,
          upsert,
        },
      };
    });
  }
}

export default function bulkUpdate(options) {
  return new BulkUpdate(options).execute();
}
