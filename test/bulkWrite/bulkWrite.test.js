import expect from 'expect';
import monk from 'monk';

import bulkWrite, { BulkWrite } from '../../src/bulkWrite';
import BulkResults from '../../src/BulkResults';

import { dropUserCollection, reseedUserCollection } from '../seed';

const { MONGO_URL } = process.env;

const userCollection = monk(MONGO_URL).get('users');

describe('bulkWrite', () => {
  afterEach(() => expect.restoreSpies());
  after(dropUserCollection);

  it('executes a new BulkWrite operation', async () => {
    const executeSpy = expect.spyOn(BulkWrite.prototype, 'execute');

    await bulkWrite({
      collection: 'users',
      count: 2,
      db: MONGO_URL,
      document: {},
      type: 'insert',
    });

    expect(executeSpy).toHaveBeenCalled();
  });

  it('returns a BulkResults instance', async () => {
    const options = {
      collection: 'users',
      count: 2,
      db: MONGO_URL,
      document: {},
      type: 'insert',
    };

    const bulkRes = await bulkWrite(options);

    expect(bulkRes instanceof BulkResults).toBe(true);
  });

  describe('calling with "operations"', () => {
    before(reseedUserCollection);

    it('performs the specified operations in the "operations" array', async () => {
      const testOperations = [
        {
          deleteMany: {
            filter: {},
          },
        },
        {
          insertOne: {
            document: { name: 'Test User #1' },
          },
        },
        {
          insertOne: {
            document: { name: 'Test User #2' },
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

      const bulkRes = await bulkWrite({
        collection: 'users',
        db: MONGO_URL,
        operations: testOperations,
      });

      const { deletedCount, insertedCount, matchedCount, modifiedCount } = bulkRes;

      expect(deletedCount).toEqual(5000);
      expect(insertedCount).toEqual(2);
      expect(matchedCount).toEqual(1);
      expect(modifiedCount).toEqual(1);

      const allUsers = await userCollection.find({}, { sort: { _id: 1 } });

      expect(allUsers.length).toEqual(2);

      const firstUser = allUsers.find(u => u.name === 'Test User #1');
      const secondUser = allUsers.find(u => u.name === 'Test User #2');
      const updatedUsers = allUsers.filter(u => u.age === 31);

      expect(firstUser).toExist();
      expect(secondUser).toExist();
      expect(updatedUsers.length).toEqual(1);
    });
  });
});
