import Promise from 'bluebird';
import expect from 'expect';
import { Cursor, MongoClient } from 'mongodb';

import { BulkWrite } from '../../src/bulkWrite';

import { dropUserCollection, reseedUserCollection } from '../seed';

const { MONGO_URL } = process.env;

describe('getCursor', () => {
  let connectedDb;
  let mongoUserCollection;

  before(async () => {
    connectedDb = await MongoClient.connect(MONGO_URL);
    mongoUserCollection = connectedDb.collection('users');
  });

  before(reseedUserCollection);

  after(dropUserCollection);

  function getCursor(options) {
    return new BulkWrite({
      collection: mongoUserCollection,
      document: {},
      ...options,
    }).getCursor();
  }

  describe('insert', () => {
    it('returns a mock cursor object', async () => {
      const cursor = await getCursor({
        count: 5,
        type: 'insert',
      });

      expect(cursor.next).toBeA('function');
    });

    it('calling next returns the next index value for the insert operations', async () => {
      const cursor = await getCursor({
        count: 5,
        type: 'insert',
      });

      const objects = await Promise.map(new Array(5), () => cursor.next());

      objects.forEach((object, idx) => {
        expect(object).toEqual(idx);
      });
    });

    it('calling next returns null if the count has been reached', async () => {
      const cursor = await getCursor({
        count: 3,
        type: 'insert',
      });

      cursor.next();
      cursor.next();
      cursor.next();

      const next = await cursor.next();

      expect(next === null).toBe(true);
    });

    it('calling next returns null if the count is 0', async () => {
      const cursor = await getCursor({
        count: 0,
        type: 'insert',
      });

      const nextIndex = await cursor.next();

      expect(nextIndex === null).toBe(true);
    });
  });

  describe('non-insert operations', () => {
    it('returns a mongodb cursor', async () => {
      const cursor = await getCursor({
        type: 'update',
      });

      expect(cursor instanceof Cursor).toBe(true);
    });
  });
});
