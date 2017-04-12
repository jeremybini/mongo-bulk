import expect from 'expect';
import monk from 'monk';

import bulkUpdate from '../src/bulkUpdate';
import BulkResults from '../src/BulkResults';

import { dropUserCollection, reseedUserCollection } from './seed';

const { MONGO_URL } = process.env;

const userCollection = monk(MONGO_URL).get('users');

function executeBulkUpdate(options) {
  const bulkOptions = {
    collection: 'users',
    db: MONGO_URL,
    document: {},
    filter: {},
    ...options,
  };

  return bulkUpdate(bulkOptions);
}

describe('bulkUpdate', () => {
  beforeEach(reseedUserCollection);

  beforeEach(() => {
    expect.restoreSpies();
  });

  after(dropUserCollection);

  describe('updateOne', () => {
    it('updates all matching documents via the "document" function if no "filter" query is supplied', async () => {
      const genericDetails = {
        type: 'human'
      };

      const bulkRes = await executeBulkUpdate({
        document: doc => ({
          $set: {
            nickname: doc.name,
            details: genericDetails,
          },
        }),
      });

      const allDocs = await userCollection.find();

      expect(bulkRes.nModified).toEqual(allDocs.length);

      allDocs.forEach((doc) => {
        const { gender, name, nickname, details } = doc;
        expect(gender).toBeA('string');
        expect(name).toBeA('string');
        expect(nickname).toEqual(name);
        expect(details).toEqual(genericDetails);
      });
    });

    it('only updates documents that match the "filter" query', async () => {
      const genericDetails = {
        type: 'senior',
      };

      const bulkRes = await executeBulkUpdate({
        document: doc => ({
          $set: {
            nickname: doc.name,
            details: genericDetails,
          },
        }),
        filter: { age: { $gt: 65 } },
      });

      const allDocs = await userCollection.find();

      const updateCount = allDocs.reduce((total, doc) => (total + !!doc.details), 0);

      expect(bulkRes.nModified).toEqual(updateCount);

      allDocs.forEach((doc) => {
        const { age, name, nickname, details } = doc;
        expect(name).toBeA('string');

        if (age > 65) {
          expect(nickname).toEqual(name);
          expect(details).toEqual(genericDetails);
        } else {
          expect(nickname).toNotExist();
          expect(details).toNotExist();
        }
      });
    });

    it('returns a bulk response if no matching documents were found', async () => {
      const genericDetails = {
        type: 'senior',
      };

      const bulkRes = await executeBulkUpdate({
        document: doc => ({
          $set: {
            nickname: doc.name,
            details: genericDetails,
          },
        }),
        filter: { age: null },
      });

      expect(bulkRes.nModified).toEqual(0);
      expect(bulkRes instanceof BulkResults).toBe(true);
    });
  });

  describe('updateMany', () => {
    it('updates all matching documents via the "update" object if no "filter" query is supplied', async () => {
      const genericDetails = {
        type: 'human'
      };

      const bulkRes = await executeBulkUpdate({
        document: {
          $set: {
            details: genericDetails,
          },
        },
      });

      const allDocs = await userCollection.find();

      expect(bulkRes.nModified).toEqual(allDocs.length);

      allDocs.forEach((doc) => {
        const { gender, name, details } = doc;
        expect(gender).toBeA('string');
        expect(name).toBeA('string');
        expect(details).toEqual(genericDetails);
      });
    });

    it('only updates documents that match the "filter" query', async () => {
      const genericDetails = {
        type: 'child',
      };

      const bulkRes = await executeBulkUpdate({
        document: {
          $set: {
            details: genericDetails,
          },
        },
        filter: { age: { $lt: 18 } },
      });

      const allDocs = await userCollection.find();

      const updateCount = allDocs.reduce((total, doc) => (total + !!doc.details), 0);

      expect(bulkRes.nModified).toEqual(updateCount);

      allDocs.forEach((doc) => {
        const { age, name, details } = doc;
        expect(name).toBeA('string');

        if (age < 18) {
          expect(details).toEqual(genericDetails);
        } else {
          expect(details).toNotExist();
        }
      });
    });

    it('returns a bulk response if no matching documents were found', async () => {
      const genericDetails = {
        type: 'senior',
      };

      const bulkRes = await executeBulkUpdate({
        document: {
          $set: {
            details: genericDetails,
          },
        },
        filter: { age: null },
      });

      expect(bulkRes.nModified).toEqual(0);
      expect(bulkRes instanceof BulkResults).toBe(true);
    });
  });
});
