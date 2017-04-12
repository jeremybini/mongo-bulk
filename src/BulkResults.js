import { BulkWriteResult } from 'mongodb/lib/bulk/common';

const EMPTY_RESULT = {
  deletedCount: 0,
  insertedCount: 0,
  insertedIds: [],
  matchedCount: 0,
  modifiedCount: 0,
  n: 0,
  nInserted: 0,
  nUpserted: 0,
  nMatched: 0,
  nModified: 0,
  nRemoved: 0,
  ok: 0,
  upserted: [],
  upsertedCount: 0,
  writeErrors: [],
};

export default class BulkResults extends BulkWriteResult {
  constructor(results = []) {
    results = Array.isArray(results) ? results : [results];

    if (!results.length) {
      results = [new BulkWriteResult(EMPTY_RESULT)];
    }

    const mergedResult = results.reduce((finalResult, result) => ({
      insertedIds: [
        ...finalResult.insertedIds,
        ...result.getInsertedIds(),
      ],
      ok: finalResult.ok + result.ok,
      nInserted: finalResult.nInserted + result.nInserted,
      nUpserted: finalResult.nUpserted + result.nUpserted,
      nMatched: finalResult.nMatched + result.nMatched,
      nModified: finalResult.nModified + result.nModified,
      nRemoved: finalResult.nRemoved + result.nRemoved,
      upserted: [
        ...finalResult.upserted,
        ...result.getUpsertedIds(),
      ],
      writeErrors: [
        ...finalResult.writeErrors,
        ...result.getWriteErrors(),
      ],
      // Duplicate above fields to on different props to match the result returned by node's mongodb
      // Note: we are currently skipping the "insertIds" and "upsertedIds" fields
      deletedCount: finalResult.deletedCount + result.nRemoved,
      insertedCount: finalResult.insertedCount + result.getInsertedIds().length,
      matchedCount: finalResult.matchedCount + result.nMatched,
      modifiedCount: finalResult.modifiedCount + result.nModified,
      n: finalResult.n + result.nInserted, // TBD: Is this right? What is n?
      upsertedCount: finalResult.upsertedCount + result.getUpsertedIds().length,
    }), EMPTY_RESULT);

    super(mergedResult);

    // Reassign additional properties to 'this' since calling super does not handle these
    Object.assign(this, {
      deletedCount: mergedResult.deletedCount,
      insertedCount: mergedResult.insertedCount,
      matchedCount: mergedResult.matchedCount,
      modifiedCount: mergedResult.modifiedCount,
      n: mergedResult.n,
      upsertedCount: mergedResult.upsertedCount,
    });

    // Record all individual result objects
    this.results = results;
  }
}
