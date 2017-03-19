import expect from 'expect';
import Chance from 'chance';
import monk from 'monk';

import { BulkUpdate } from '../src/bulkUpdate';

import { dropAndSeedCollection } from './seed';
import { expectAsyncError } from './utils';

const chance = new Chance();

const { MONGO_URL } = process.env;

const userCollection = monk(MONGO_URL).get('users');

function buildBulkUpdate(options) {
  const bulkOptions = {
    collection: 'users',
    db: MONGO_URL,
    filter: {},
    update: {},
    ...options,
  };

  return new BulkUpdate(bulkOptions);
}

function reseedUserCollection(options = {}) {
  return dropAndSeedCollection({
    collection: 'users',
    count: 100,
    dbUrl: MONGO_URL,
    seed: () => ({
      age: chance.age({ type: 'all' }),
      gender: chance.gender(),
      name: chance.name(),
    }),
    ...options,
  });
}

describe('BulkUpdate', () => {
  before(() => reseedUserCollection());

  beforeEach(() => {
    expect.restoreSpies();
  });

  describe('Instantiation options', () => {
    describe('update', () => {
      it('throws an error if an "update" option is not supplied', () => {
        expect(() =>
          new BulkUpdate({
            collection: 'users',
            db: MONGO_URL,
          })
        ).toThrow();
      });

      it('allows "update" to be a plain object', () =>
        new BulkUpdate({
          collection: 'users',
          db: MONGO_URL,
          update: {}
        })
      );

      it('allows "update" to be a function', () =>
        new BulkUpdate({
          collection: 'users',
          db: MONGO_URL,
          update: () => {},
        })
      );
    });
  });

  describe('buildOperations', () => {
    function buildOperations(options) {
      const bulkUpdate = buildBulkUpdate(options);
      return bulkUpdate.buildOperations();
    }

    describe('updateOne', () => {
      it('throws an error if the "update" function does not return a object', async () => {
        const options = { update: () => true };
        return expectAsyncError(buildOperations(options));
      });

      it('builds an array of "updateOne" operations if the "update" option is a function', async () => {
        const updateDoc = { $set: { name: 'Test User' } };
        const operations = await buildOperations({
          update: () => updateDoc,
        });

        expect(operations).toBeAn('array');

        operations.forEach((operation) => {
          const { updateOne } = operation;
          const { filter, update, upsert } = updateOne;

          expect(updateOne).toBeAn('object');
          expect(filter).toBeAn('object');
          expect(update).toEqual(updateDoc);
          expect(upsert).toBeFalsy();
        });
      });

      it('works for "update" functions that return a promise', async () => {
        const updateDoc = { $set: { name: 'Test User' } };
        const operations = await buildOperations({
          update: () => Promise.resolve(updateDoc),
        });

        operations.forEach(operation => expect(operation.updateOne.update).toEqual(updateDoc));
      });

      it('fetches all filtered documents while building the operations', async () => {
        const filterDoc = { name: { $ne: null } };
        const bulkUpdate = buildBulkUpdate({
          filter: filterDoc,
          update: doc => doc,
        });

        const collectionFindSpy = expect.spyOn(bulkUpdate.collection, 'find').andCallThrough();

        await bulkUpdate.buildOperations();

        expect(collectionFindSpy).toHaveBeenCalled();
        expect(collectionFindSpy).toHaveBeenCalledWith(filterDoc);
      });

      it('builds an option for every document retrieved by the "filter" query', async () => {
        const documents = await userCollection.find();
        const operations = await buildOperations({ update: doc => doc });

        expect(operations.length).toEqual(documents.length);
        documents.forEach((doc, index) => {
          expect(operations[index].updateOne.filter._id.toString()).toEqual(doc._id.toString());
        });
      });

      it('sets upsert to "true" if specified', async () => {
        const operations = await buildOperations({
          update: doc => doc,
          upsert: true,
        });

        operations.forEach(operation => expect(operation.updateOne.upsert).toBe(true));
      });
    });

    describe('updateMany', () => {
      it('builds an array of one "updateMany" operation if the "update" option is an object', async () => {
        const updateDoc = { $set: { name: 'Test User' } };
        const filterDoc = { extraProp: { $exists: false } };
        const operations = await buildOperations({
          filter: filterDoc,
          update: updateDoc,
        });

        expect(operations).toBeAn('array');
        expect(operations.length).toEqual(1);

        const { updateMany } = operations[0];
        const { filter, update, upsert } = updateMany;
        expect(updateMany).toBeAn('object');
        expect(filter).toEqual(filterDoc);
        expect(update).toEqual(updateDoc);
        expect(upsert).toBeFalsy();
      });

      it('does not fetch any documents while building the operations', async () => {
        const updateDoc = { $set: { name: 'Test User' } };
        const filterDoc = { extraProp: { $exists: false } };
        const bulkUpdate = buildBulkUpdate({
          filter: filterDoc,
          update: updateDoc,
        });

        const collectionFindSpy = expect.spyOn(bulkUpdate.collection, 'find');

        await bulkUpdate.buildOperations();

        expect(collectionFindSpy.calls.length).toEqual(0);
      });

      it('sets upsert to "true" if specified', async () => {
        const operations = await buildOperations({
          upsert: true,
        });

        expect(operations[0].updateMany.upsert).toBe(true);
      });
    });
  });

  describe('execute', () => { // maybe make integration (?) tests
    beforeEach(() => reseedUserCollection({ count: 20000 }));

    describe('updateOne', () => {
      it('updates all matching documents via the "update" function if no "filter" query is supplied', async () => {
        const genericDetails = {
          type: 'human'
        };

        const bulkUpdate = buildBulkUpdate({
          update: doc => ({
            $set: {
              nickname: doc.name,
              details: genericDetails,
            },
          }),
        });

        const bulkRes = await bulkUpdate.execute();

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

        const bulkUpdate = buildBulkUpdate({
          filter: { age: { $gt: 65 } },
          update: doc => ({
            $set: {
              nickname: doc.name,
              details: genericDetails,
            },
          }),
        });

        const bulkRes = await bulkUpdate.execute();
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

        const bulkUpdate = buildBulkUpdate({
          filter: { age: null },
          update: doc => ({
            $set: {
              nickname: doc.name,
              details: genericDetails,
            },
          }),
        });

        const bulkRes = await bulkUpdate.execute();
        expect(bulkRes.nModified).toEqual(0);
      });
    });

    describe('updateMany', () => {
      it('updates all matching documents via the "update" object if no "filter" query is supplied', async () => {
        const genericDetails = {
          type: 'human'
        };

        const bulkUpdate = buildBulkUpdate({
          update: {
            $set: {
              details: genericDetails,
            },
          },
        });

        const bulkRes = await bulkUpdate.execute();

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

        const bulkUpdate = buildBulkUpdate({
          filter: { age: { $lt: 18 } },
          update: {
            $set: {
              details: genericDetails,
            },
          },
        });

        const bulkRes = await bulkUpdate.execute();
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

        const bulkUpdate = buildBulkUpdate({
          filter: { age: null },
          update: {
            $set: {
              details: genericDetails,
            },
          },
        });

        const bulkRes = await bulkUpdate.execute();
        expect(bulkRes.nModified).toEqual(0);
      });
    });
  });
});
