import expect from 'expect';

import { BulkWrite } from '../../src/bulkWrite';

import { reseedUserCollection } from '../seed';
import { expectAsyncError } from '../utils';

const { MONGO_URL } = process.env;

const testItem1 = {
  _id: 'randomId1',
  type: 'user',
};

const testItem2 = {
  _id: 'randomId2',
  type: 'user',
};

const testResult = {
  nMatched: 2,
};

function buildBulkWriteWithQueue(
  options,
  {
    queue = [testItem1, testItem2],
    results = [testResult],
  } = {}
) {
  const bulk = new BulkWrite({
    collection: 'users',
    db: MONGO_URL,
    document: {},
    type: 'update',
    ...options,
  });

  Object.assign(bulk, {
    queue,
    results,
  });

  return bulk;
}

describe('processQueue', () => {
  before(reseedUserCollection);
  afterEach(() => expect.restoreSpies());

  it('throws an error if the "document" function does not return a object', () => {
    const bulk = buildBulkWriteWithQueue({ document: () => null });
    return expectAsyncError(bulk.processQueue());
  });

  it('returns the results if the queue is empty', async () => {
    const bulk = buildBulkWriteWithQueue({}, { queue: [] });
    const results = await bulk.processQueue();
    expect(results).toEqual([testResult]);
  });

  it('calls the "document" function for each item in the queue', async () => {
    const documentSpy = expect.createSpy().andCall(doc => doc);
    const bulk = buildBulkWriteWithQueue({ document: documentSpy });
    await bulk.processQueue();

    expect(documentSpy.calls.length).toEqual(2);
    expect(documentSpy)
      .toHaveBeenCalledWith(testItem1)
      .toHaveBeenCalledWith(testItem2);
  });

  it('calls bulkWrite for the built operations', async () => {
    const bulkWriteSpy = expect.spyOn(BulkWrite.prototype, 'bulkWrite').andCallThrough();
    const bulk = buildBulkWriteWithQueue({
      document: doc => doc,
      upsert: true,
    });

    await bulk.processQueue();

    expect(bulkWriteSpy).toHaveBeenCalled();
    expect(bulkWriteSpy).toHaveBeenCalledWith([
      {
        updateOne: {
          filter: {
            _id: testItem1._id,
          },
          update: testItem1,
          upsert: true,
        },
      },
      {
        updateOne: {
          filter: {
            _id: testItem2._id,
          },
          update: testItem2,
          upsert: true,
        },
      },
    ]);
  });

  it('adds the result to the results array and returns all results', async () => {
    const bulk = buildBulkWriteWithQueue({ document: doc => doc }, { results: [] });
    const results = await bulk.processQueue();

    expect(results.length).toEqual(1);
    expect(results[0].nMatched).toEqual(2);
  });
});
