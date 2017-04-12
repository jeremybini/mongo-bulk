import expect from 'expect';
import monk from 'monk';

import bulkDelete from '../src/bulkDelete';
import BulkResults from '../src/BulkResults';

import { dropUserCollection, reseedUserCollection } from './seed';

const { MONGO_URL } = process.env;

const userCollection = monk(MONGO_URL).get('users');

function executeBulkDelete(options) {
  const bulkOptions = {
    collection: 'users',
    db: MONGO_URL,
    document: {},
    ...options,
  };

  return bulkDelete(bulkOptions);
}

describe('bulkDelete', () => {
  beforeEach(reseedUserCollection);

  beforeEach(() => {
    expect.restoreSpies();
  });

  after(dropUserCollection);

  it('deletes all matching documents', async () => {
    const ageQuery = {
      age: {
        $gt: 40,
      },
    };

    const olderUsers = await userCollection.find(ageQuery);

    const bulkRes = await executeBulkDelete({
      filter: ageQuery,
    });

    const remainingUsers = await userCollection.find();
    const removedCount = bulkRes.nRemoved;
    const usersThatShouldHaveBeenRemoved = await userCollection.find({
      _id: { $in: olderUsers.map(u => u._id) },
    });

    expect(removedCount).toEqual(olderUsers.length);
    expect(remainingUsers.length).toEqual(5000 - removedCount);
    expect(usersThatShouldHaveBeenRemoved.length).toEqual(0);
  });

  it('returns a bulk response if no matching documents were found', async () => {
    const bulkRes = await executeBulkDelete({
      filter: { age: null },
    });

    const remainingUsers = await userCollection.find();
    const removedCount = bulkRes.nRemoved;

    expect(removedCount).toEqual(0);
    expect(remainingUsers.length).toEqual(5000);
    expect(bulkRes instanceof BulkResults).toBe(true);
  });
});
