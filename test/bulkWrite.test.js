import expect from 'expect';
import { Collection, MongoClient } from 'mongodb';
import monk, { Collection as MonkCollection } from 'monk';

import bulkWrite, { BulkWrite } from '../src/bulkWrite';

import { dropUserCollection, reseedUserCollection } from './seed';
import { expectAsyncError } from './utils';

const { MONGO_URL } = process.env;
const userCollection = monk(MONGO_URL).get('users');

describe('BulkWrite', () => {
  beforeEach(() => {
    expect.restoreSpies();
  });

  after(dropUserCollection);

  describe('Instantiation options', () => {
    describe('collection', () => {
      function expectValidCollection(collection) {
        expect(collection).toExist();

        const collectionIsValid = collection instanceof Collection ||
                                  collection instanceof MonkCollection;

        expect(collectionIsValid).toBe(true);
      }

      it('throws an error if a "collection" option is not supplied', () => {
        expect(() => new BulkWrite({ db: MONGO_URL })).toThrow();
      });

      it('allows a "collection" option that is a mongodb Collection instance', async () => {
        const db = await MongoClient.connect(MONGO_URL);
        const mongoUserCollection = db.collection('users');
        const { collection } = new BulkWrite({ collection: mongoUserCollection });

        expectValidCollection(collection);
      });

      describe('with type string', () => {
        it('throws an error if a "db" option is not supplied', () => {
          expect(() => new BulkWrite({ collection: 'users' })).toThrow();
        });

        it('throws an error if the "db" option is not a valid mongodb instance', () => {
          expect(() => new BulkWrite({ collection: 'users', db: { collection: () => {} } })).toThrow();
        });

        it('properly sets the "collection" property with a valid "db" url', () => {
          const { collection } = new BulkWrite({
            collection: 'users',
            db: MONGO_URL,
          });

          expectValidCollection(collection);
        });

        it('properly sets the "collection" property with a valid mongodb "db" instance', async () => {
          const db = await MongoClient.connect(MONGO_URL);
          const { collection } = new BulkWrite({
            collection: 'users',
            db,
          });

          expectValidCollection(collection);
        });
      });
    });

    describe('operations', () => {
      it('throws an error if an invalid "operations" type is supplied', () => {
        expect(() => new BulkWrite({
          collection: 'users',
          db: MONGO_URL,
          operations: {},
        })).toThrow();
      });

      it('allows a prebuilt array of "operations"', () => {
        const operations = [
          { updateOne: {} },
          { removeOne: {} },
        ];

        return new BulkWrite({
          collection: 'users',
          db: MONGO_URL,
          operations,
        });
      });

      it('allows a function to be passed in as "operations"', () => {
        const operations = () => ([
          { updateOne: {} },
          { removeOne: {} },
        ]);

        return new BulkWrite({
          collection: 'users',
          db: MONGO_URL,
          operations,
        });
      });
    });
  });

  describe('execute', () => {
    const testOperations = [
      {
        deleteMany: {
          filter: {},
        },
      },
      {
        insertOne: {
          document: { name: 'Test User' },
        },
      },
      {
        updateOne: {
          filter: {},
          update: { $set: { age: 31 } },
          upsert: false,
        },
      },
    ];

    async function expectTestOperationsWereRun(bulkResponse) {
      const { deletedCount, insertedCount, matchedCount, modifiedCount } = bulkResponse;

      expect(deletedCount).toEqual(2000);
      expect(insertedCount).toEqual(1);
      expect(matchedCount).toEqual(1);
      expect(modifiedCount).toEqual(1);

      const allUsers = await userCollection.find();

      expect(allUsers.length).toEqual(1);
      expect(allUsers[0].name).toEqual('Test User');
      expect(allUsers[0].age).toEqual(31);
    }

    beforeEach(reseedUserCollection);

    it('throws an error if missing "operations" option and "buildOptions" method', () => {
      expectAsyncError(bulkWrite({
        collection: 'users',
        db: MONGO_URL,
      }));
    });

    it('performs the specified operations in the "operations" array', async () => {
      const bulkRes = await bulkWrite({
        collection: 'users',
        db: MONGO_URL,
        operations: testOperations,
      });

      return expectTestOperationsWereRun(bulkRes);
    });

    it('performs the operations returned by the "operations" function', async () => {
      const bulkRes = await bulkWrite({
        collection: 'users',
        db: MONGO_URL,
        operations: () => testOperations,
      });

      return expectTestOperationsWereRun(bulkRes);
    });

    it('throws an error if the "operations" function returns improperly formatted operations', async () =>
      expectAsyncError(bulkWrite({
        collection: 'users',
        db: MONGO_URL,
        operations: () => ([
          ...testOperations,
          {
            invalidOperator: { document: {} },
          },
        ]),
      }))
    );

    // Test for extending with buildOperations, or maybe just operations?
  });
});
