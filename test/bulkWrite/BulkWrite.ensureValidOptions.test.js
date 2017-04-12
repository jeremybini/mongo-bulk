import expect from 'expect';
import { Collection, MongoClient } from 'mongodb';

import { BulkWrite } from '../../src/bulkWrite';

import { dropUserCollection } from '../seed';
import { expectAsyncError } from '../utils';

const { MONGO_URL } = process.env;

async function expectCollectionToBeValid(options) {
  const collection = await new BulkWrite(options).getCollection();
  expect(collection).toExist();
  expect(collection instanceof Collection).toBe(true);
}

async function expectOptionsToBeOk(options) {
  const bulk = new BulkWrite(options);
  expect(bulk).toExist();
}

function expectOptionsToThrow(options, errorField) {
  const errorFields = Array.isArray(errorField) ? errorField : [errorField];

  errorFields.forEach((field) => {
    const regex = new RegExp(`Unable to perform bulk operation:[-\\s\\w"]+"${field}"`);
    expect(() => new BulkWrite(options)).toThrow(regex);
  });
}

describe('ensureValidOptions', () => {
  let connectedDb;
  let mongoUserCollection;

  before(async () => {
    connectedDb = await MongoClient.connect(MONGO_URL);
    mongoUserCollection = connectedDb.collection('users');
  });

  after(dropUserCollection);

  describe('"collection"', () => {
    it('throws an error if a "collection" option is not supplied', () => {
      expectOptionsToThrow({
        db: MONGO_URL,
        document: {},
        type: 'insert',
      }, 'collection');
    });

    it('throws an error for an invalid "collection" option', () => {
      expectOptionsToThrow({
        collection: {},
        document: {},
        type: 'insert',
      }, 'collection');
    });

    it('allows a "collection" option that is a mongodb Collection instance', async () =>
      expectCollectionToBeValid({
        collection: mongoUserCollection,
        document: {},
        type: 'insert',
      })
    );

    describe('with type string', () => {
      it('throws an error if a "db" option is not supplied', () => {
        expectOptionsToThrow({
          collection: 'users',
          document: {},
          type: 'insert',
        }, 'db');
      });

      it('throws an error if the "db" option does not have a "collection" method', () => {
        expectOptionsToThrow({
          collection: 'users',
          db: {},
          document: {},
          type: 'insert',
        }, 'db');
      });

      it('throws an error for unsupported types', () => {
        expectOptionsToThrow({
          collection: 'users',
          db: {},
          document: {},
          type: 'invalidType',
        }, 'type');
      });

      it('"getCollection" returns a collection when supplied with string options for "collection" and "db"', async () =>
        expectCollectionToBeValid({
          collection: 'users',
          db: MONGO_URL,
          document: {},
          type: 'insert',
        })
      );

      it('"getCollection" returns a collection when supplied with a mongodb instance', async () =>
        expectCollectionToBeValid({
          collection: 'users',
          db: connectedDb,
          document: {},
          type: 'insert',
        })
      );
    });
  });

  describe('"db"', () => {
    it('surfaces the mongo connection error if an invalid url is supplied', () => {
      const bulkOp = new BulkWrite({
        collection: 'users',
        db: 'mongo://badHost:00000/mongo-bulk',
        document: {},
        type: 'insert',
      });

      return expectAsyncError(bulkOp.getDb());
    });
  });

  describe('document', () => {
    it('throws an error if a "document" option is not supplied', () =>
      expectOptionsToThrow({
        collection: 'users',
        db: MONGO_URL,
        type: 'update',
      }, 'document')
    );

    it('throws an error if an invalid "document" type is supplied', () =>
      expectOptionsToThrow({
        collection: 'users',
        db: MONGO_URL,
        document: [],
        type: 'update',
      }, 'document')
    );

    it('does not require a "document" if "operations" are supplied', () =>
      expectOptionsToBeOk({
        collection: 'users',
        db: MONGO_URL,
        operations: [],
      })
    );

    it('does not require a "document" if "type" is "delete"', () =>
      expectOptionsToBeOk({
        collection: 'users',
        db: MONGO_URL,
        type: 'delete',
      })
    );

    it('allows "document" to be a plain object', () =>
      expectOptionsToBeOk({
        collection: 'users',
        db: MONGO_URL,
        document: {},
        type: 'replace',
      })
    );

    it('allows "document" to be a function', () =>
      expectOptionsToBeOk({
        collection: 'users',
        db: MONGO_URL,
        document: () => {},
        type: 'insert',
      })
    );
  });

  describe('operations', () => {
    it('throws an error if an invalid "operations" type is supplied', () => {
      expectOptionsToThrow({
        collection: 'users',
        db: MONGO_URL,
        operations: {},
      }, 'operations');
    });

    it('throws an error if no "operations" or "type" are supplied', () => {
      expectOptionsToThrow({
        collection: 'users',
        db: MONGO_URL,
      }, ['operations', 'type']);
    });

    it('allows a prebuilt array of "operations"', () =>
      expectOptionsToBeOk({
        collection: 'users',
        db: MONGO_URL,
        operations: [
          { updateOne: {} },
          { removeOne: {} },
        ],
      })
    );
  });
});
