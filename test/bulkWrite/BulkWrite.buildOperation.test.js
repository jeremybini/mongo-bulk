import expect from 'expect';
import { MongoClient } from 'mongodb';

import { BulkWrite } from '../../src/bulkWrite';

import { dropUserCollection } from '../seed';

const { MONGO_URL } = process.env;

describe('buildOperation', () => {
  let connectedDb;
  let mongoUserCollection;

  before(async () => {
    connectedDb = await MongoClient.connect(MONGO_URL);
    mongoUserCollection = connectedDb.collection('users');
  });

  after(dropUserCollection);

  const baseOptions = {
    document: { name: 'Jeremy' },
    filter: { _id: '1' },
  };

  function buildOperation(allOptions) {
    const { many, type, upsert } = allOptions;

    const options = {
      ...baseOptions,
      many,
    };

    const bulkOptions = {
      collection: mongoUserCollection,
      document: {},
      type,
      upsert,
    };

    return new BulkWrite(bulkOptions).buildOperation(options);
  }

  function expectOperationToBeBuilt(
    allOptions,
    {
      docField,
      operationType,
      shouldAddUpsert = false
    }
  ) {
    const { upsert } = allOptions;
    const { document, filter } = baseOptions;

    const operation = buildOperation(allOptions);

    expect(operation).toExist();

    const op = operation[operationType];

    expect(op).toExist();
    expect(op.filter).toEqual(filter);
    expect(op[docField]).toEqual(document);

    if (shouldAddUpsert) {
      expect(op.upsert).toEqual(upsert);
    } else {
      expect(op.upsert).toNotExist();
    }
  }

  it('correctly builds a deleteOne operation', () => {
    expectOperationToBeBuilt(
      { type: 'delete' },
      { operationType: 'deleteOne' },
    );
  });

  it('correctly builds a insertOne operation', () => {
    expectOperationToBeBuilt(
      {
        type: 'insert'
      },
      {
        docField: 'document',
        operationType: 'insertOne',
      },
    );
  });

  it('correctly builds a replaceOne operation', () => {
    expectOperationToBeBuilt(
      {
        type: 'replace'
      },
      {
        docField: 'replacement',
        operationType: 'replaceOne',
      },
    );
  });

  it('correctly builds a updateOne operation', () => {
    expectOperationToBeBuilt(
      {
        type: 'update'
      },
      {
        docField: 'update',
        operationType: 'updateOne',
      },
    );
  });


  it('correctly builds a deleteMany operation', () => {
    expectOperationToBeBuilt(
      {
        many: true,
        type: 'delete'
      },
      {
        operationType: 'deleteMany'
      },
    );
  });

  it('correctly builds a replaceMany operation', () => {
    expectOperationToBeBuilt(
      {
        many: true,
        type: 'replace'
      },
      {
        docField: 'replacement',
        operationType: 'replaceMany',
      },
    );
  });

  it('correctly builds a updateMany operation', () => {
    expectOperationToBeBuilt(
      {
        many: true,
        type: 'update'
      },
      {
        docField: 'update',
        operationType: 'updateMany',
      },
    );
  });

  it('adds upsert if the type is valid', () => {
    expectOperationToBeBuilt(
      {
        many: true,
        type: 'update'
      },
      {
        docField: 'update',
        operationType: 'updateMany',
        shouldAddUpsert: true,
      },
    );
  });

  it('does not add upsert if the type does not use the upsert options', () => {
    expectOperationToBeBuilt(
      {
        many: true,
        type: 'delete'
      },
      {
        operationType: 'deleteMany',
        shouldAddUpsert: false,
      },
    );
  });
});
