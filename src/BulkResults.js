import { BulkWriteResult } from 'mongodb/lib/bulk/common';

export const EMPTY_RESULT = {
  deletedCount: 0,
  insertedCount: 0,
  insertedIds: [],
  lastOp: null,
  matchedCount: 0,
  modifiedCount: 0,
  n: 0,
  nInserted: 0,
  nUpserted: 0,
  nMatched: 0,
  nModified: 0,
  nRemoved: 0,
  ok: 1,
  upserted: [],
  upsertedCount: 0,
  writeConcernErrors: [],
  writeErrors: [],
};

export default class BulkResults extends BulkWriteResult {
  constructor(results = []) {
    results = Array.isArray(results) ? results : [results];

    if (!results.length) {
      results = [new BulkWriteResult(EMPTY_RESULT)];
    }

    // Merge/modify the results to have the shape
    // that BulkWriteResults is expecting
    const mergedResult = results.reduce((finalResult, result) => {
      const {
        insertedIds,
        ok,
        n,
        nInserted,
        nUpserted,
        nMatched,
        nModified,
        nRemoved,
        upserted,
        writeConcernErrors,
        writeErrors,
      } = finalResult;

      const newWriteConcernError = result.getWriteConcernError();

      return {
        insertedIds: [
          ...insertedIds,
          ...result.getInsertedIds(),
        ],
        lastOp: result.getLastOp(),
        ok: ok ? Number(result.isOk()) : ok,
        n: n + (result.n || 0),
        nInserted: nInserted + result.nInserted,
        nUpserted: nUpserted + result.nUpserted,
        nMatched: nMatched + result.nMatched,
        nModified: nModified + result.nModified,
        nRemoved: nRemoved + result.nRemoved,
        upserted: [
          ...upserted,
          ...result.getUpsertedIds(),
        ],
        writeConcernErrors: newWriteConcernError ? [
          ...writeConcernErrors,
          newWriteConcernError,
        ] : writeConcernErrors,
        writeErrors: [
          ...writeErrors,
          ...result.getWriteErrors(),
        ],
      };
    }, EMPTY_RESULT);

    super(mergedResult);

    // Add properties to return something that more closely
    // resembles a mongo collection.bulkWrite result
    // Also, keep a record of all individual result objects
    Object.assign(this, {
      insertedCount: this.nInserted,
      matchedCount: this.nMatched,
      modifiedCount: this.nModified || 0,
      n: mergedResult.n,
      deletedCount: this.nRemoved,
      results,
      upsertedCount: this.getUpsertedIds().length,
    });
  }
}
