import expect from 'expect';
import monk from 'monk';

import bulkReplace from '../src/bulkReplace';
import BulkResults from '../src/BulkResults';

import { dropUserCollection, reseedUserCollection } from './seed';

const { MONGO_URL } = process.env;

const userCollection = monk(MONGO_URL).get('users');

const DOC_REPLACEMENT = {
  replacementField: 'replaced',
};

function executeBulkReplace(options) {
  const bulkOptions = {
    collection: 'users',
    db: MONGO_URL,
    document: {},
    filter: {},
    ...options,
  };

  return bulkReplace(bulkOptions);
}

describe('bulkReplace', () => {
  beforeEach(reseedUserCollection);

  beforeEach(() => {
    expect.restoreSpies();
  });

  after(dropUserCollection);

  describe('replaceOne', () => {
    it('replaces all matching documents via the "document" function if no "filter" query is supplied', async () => {
      const bulkRes = await executeBulkReplace({
        document: () => DOC_REPLACEMENT,
      });

      const allDocs = await userCollection.find();

      expect(bulkRes.nModified).toEqual(allDocs.length);

      allDocs.forEach((doc) => {
        const { age, gender, name, replacementField } = doc;
        expect(age).toNotExist();
        expect(gender).toNotExist();
        expect(name).toNotExist();
        expect(replacementField).toEqual(DOC_REPLACEMENT.replacementField);
      });
    });

    it('only replaces documents that match the "filter" query', async () => {
      const bulkRes = await executeBulkReplace({
        document: doc => ({
          age: doc.age,
          ...DOC_REPLACEMENT,
        }),
        filter: { age: { $gt: 65 } },
      });

      const allDocs = await userCollection.find();

      const replaceCount = allDocs.reduce((total, doc) => (total + !!doc.replacementField), 0);

      expect(bulkRes.nModified).toEqual(replaceCount);

      allDocs.forEach((doc) => {
        const { age, gender, name, replacementField } = doc;

        if (replacementField) {
          expect(age).toBeGreaterThan(65);
          expect(gender).toNotExist();
          expect(name).toNotExist();
          expect(replacementField).toEqual(DOC_REPLACEMENT.replacementField);
        } else {
          expect(replacementField).toNotExist();
          expect(age).toBeLessThanOrEqualTo(65);
          expect(gender).toBeA('string');
          expect(name).toBeA('string');
        }
      });
    });

    it('returns a bulk response if no matching documents were found', async () => {
      const bulkRes = await executeBulkReplace({
        document: () => DOC_REPLACEMENT,
        filter: { age: null },
      });

      expect(bulkRes.nModified).toEqual(0);
      expect(bulkRes instanceof BulkResults).toBe(true);
    });
  });

  // TODO: Functionality not currently supported by mongo driver?? Investigate.
  xdescribe('replaceMany', () => {
    it('replaces all matching documents via the "update" object if no "filter" query is supplied', async () => {
      const bulkRes = await executeBulkReplace({
        document: DOC_REPLACEMENT,
      });

      const allDocs = await userCollection.find();

      expect(bulkRes.nModified).toEqual(allDocs.length);

      allDocs.forEach((doc) => {
        expect(doc).toEqual(DOC_REPLACEMENT);
      });
    });

    it('only replaces documents that match the "filter" query', async () => {
      const bulkRes = await executeBulkReplace({
        document: DOC_REPLACEMENT,
        filter: { age: { $lt: 18 } },
      });

      const allDocs = await userCollection.find();

      const replaceCount = allDocs.reduce((total, doc) => (total + !!doc.details), 0);

      expect(bulkRes.nModified).toEqual(replaceCount);

      const docsWithAge = allDocs.filter(d => d.age);
      const replacedDocs = allDocs.filter(d => !d.age);

      expect(docsWithAge.length).toBeGreaterThan(0);
      expect(replacedDocs.length).toBeGreaterThan(0);

      allDocs.forEach((doc) => {
        const { age, gender, name, replacementField } = doc;

        if (age) {
          expect(replacementField).toNotExist();
          expect(age).toBeGreaterThan(18);
          expect(gender).toBeA('string');
          expect(name).toBeA('string');
        } else {
          expect(doc).toEqual(DOC_REPLACEMENT);
        }
      });
    });

    it('returns a bulk response if no matching documents were found', async () => {
      const bulkRes = await executeBulkReplace({
        document: DOC_REPLACEMENT,
        filter: { age: null },
      });

      expect(bulkRes.nModified).toEqual(0);
      expect(bulkRes instanceof BulkResults).toBe(true);
    });
  });
});
