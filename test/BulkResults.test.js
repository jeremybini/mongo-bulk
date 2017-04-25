import expect from 'expect';
import { pick } from 'lodash';
import { BulkWriteResult } from 'mongodb/lib/bulk/common';

import BulkResults, { EMPTY_RESULT } from '../src/BulkResults';

const expectedEmptyResult = pick(EMPTY_RESULT, [
  'deletedCount',
  'insertedCount',
  'matchedCount',
  'modifiedCount',
  'n',
  'nInserted',
  'nMatched',
  'nModified',
  'nRemoved',
  'nUpserted',
  'ok',
  'upsertedCount',
]);

function expectAdditionalFieldsWereAdded(result, resultCount = 1) {
  const {
    deletedCount,
    insertedCount,
    matchedCount,
    modifiedCount,
    nInserted,
    nMatched,
    nModified,
    nRemoved,
    results,
    upsertedCount,
  } = result;

  expect(deletedCount).toEqual(nRemoved);
  expect(insertedCount).toEqual(nInserted);
  expect(matchedCount).toEqual(nMatched);
  expect(modifiedCount).toEqual(nModified);
  expect(upsertedCount).toEqual(result.getUpsertedIds().length);

  expect(results.length).toEqual(resultCount);
}

describe('BulkResults', () => {
  it('returns an empty result if none is supplied', () => {
    const results = new BulkResults();
    expect(results).toInclude(expectedEmptyResult);
    expectAdditionalFieldsWereAdded(results);
  });

  it('returns any writeErrors', () => {
    const errors = [{ message: 'error' }];
    const result = new BulkWriteResult({
      ...EMPTY_RESULT,
      writeErrors: errors,
    });

    const bulkResult = new BulkResults(result);

    expect(bulkResult.getWriteErrors()).toEqual(errors);
  });

  it('returns any writeConcernErrors', () => {
    const errors = [{ message: 'error' }];
    const result = new BulkWriteResult({
      ...EMPTY_RESULT,
      writeConcernErrors: errors,
    });

    const bulkResult = new BulkResults(result);

    expect(bulkResult.getWriteConcernError()).toEqual(errors[0]);
  });

  it('records if any of the results are not "ok"', () => {
    const results = [
      new BulkWriteResult(EMPTY_RESULT),
      new BulkWriteResult({
        ...EMPTY_RESULT,
        ok: 0,
      }),
      new BulkWriteResult(EMPTY_RESULT),
    ];

    const bulkResult = new BulkResults(results);

    expect(bulkResult.isOk()).toEqual(false);
  });
});
