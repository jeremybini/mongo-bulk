import expect from 'expect';

import { BulkWrite } from '../../src/bulkWrite';

const { MONGO_URL } = process.env;

function buildBulkWrite(options) {
  return new BulkWrite({
    collection: 'users',
    db: MONGO_URL,
    document: {},
    type: 'update',
    ...options,
  });
}

describe('processCursor', () => {
  let processQueueSpy;

  before(() => {
    processQueueSpy = expect
      .spyOn(BulkWrite.prototype, 'processQueue')
      .andCall(() => Promise.resolve([]));
  });

  afterEach(() => processQueueSpy.reset());
  after(() => expect.restoreSpies());

  it('calls processQueue if nextObject returns null', async () => {
    const bulk = buildBulkWrite();
    const cursor = {
      next: () => Promise.resolve(null),
    };

    await bulk.processCursor(cursor);

    expect(processQueueSpy).toHaveBeenCalled();
  });

  it('adds the nextObject to the queue', async () => {
    const bulk = buildBulkWrite({ concurrency: 1 });
    const nextObject = {
      _id: 'randomId',
      type: 'user',
    };
    const queue = bulk.queue;

    let count = 0;

    const cursor = {
      async next() {
        if (count === 0) {
          count += 1;
          return nextObject;
        }

        return null;
      }
    };

    await bulk.processCursor(cursor);

    expect(queue[0]).toEqual(nextObject);
  });

  it('calls processQueue if the queue length has reached the concurrency', async () => {
    const concurrency = 5;
    const bulk = buildBulkWrite({ concurrency });
    const nextObject = {
      _id: 'randomId',
      type: 'user',
    };
    const queue = bulk.queue;

    let count = 0;

    const cursor = {
      async next() {
        if (count < concurrency) {
          count += 1;
          return nextObject;
        }

        return null;
      }
    };

    await bulk.processCursor(cursor);

    expect(queue.length).toBe(concurrency);
  });
});
