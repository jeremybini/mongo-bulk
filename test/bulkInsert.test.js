import expect from 'expect';
import monk from 'monk';

import bulkInsert from '../src/bulkInsert';
import BulkResults from '../src/BulkResults';

import { buildUser, dropUserCollection } from './seed';

const { MONGO_URL } = process.env;

const userCollection = monk(MONGO_URL).get('users');

function executeBulkInsert(options) {
  const bulkOptions = {
    collection: 'users',
    db: MONGO_URL,
    document: {},
    ...options,
  };

  return bulkInsert(bulkOptions);
}

describe('bulkInsert', () => {
  beforeEach(dropUserCollection);

  beforeEach(() => {
    expect.restoreSpies();
  });

  after(dropUserCollection);

  it('inserts the specified number of documents', async () => {
    const newDoc = buildUser();

    const bulkRes = await executeBulkInsert({
      count: 1234,
      document: newDoc,
    });

    const allDocs = await userCollection.find();

    expect(bulkRes.nInserted)
      .toEqual(bulkRes.insertedCount)
      .toEqual(allDocs.length)
      .toEqual(1234);

    allDocs.forEach((doc) => {
      const { _id, age, gender, name } = doc;

      expect(_id).toBeAn('object');

      expect({
        age,
        gender,
        name,
      }).toEqual(newDoc);
    });
  });

  it('calls the "document" function with the document index for each insert operation', async () => {
    const bulkRes = await executeBulkInsert({
      count: 1234,
      document: index => buildUser({ age: index }),
    });

    const allDocs = await userCollection.find();

    expect(bulkRes.nInserted)
      .toEqual(bulkRes.insertedCount)
      .toEqual(allDocs.length)
      .toEqual(1234);

    allDocs.forEach((doc, index) => {
      const { _id, age, gender, name } = doc;

      expect(_id).toBeAn('object');
      expect(gender).toBeA('string');
      expect(name).toBeA('string');

      expect(age)
        .toBeA('number')
        .toEqual(index);
    });
  });

  it('returns a bulk response if no documents were inserted', async () => {
    const bulkRes = await executeBulkInsert({
      count: 0,
      document: index => buildUser({ age: index }),
    });

    const allDocs = await userCollection.find();

    expect(bulkRes.nInserted).toEqual(allDocs.length).toEqual(0);

    expect(bulkRes instanceof BulkResults).toBe(true);
  });
});
