import expect from 'expect';

import { BulkWrite } from '../../src/bulkWrite';

describe('shouldExecuteInChunks', () => {
  const baseOptions = {
    collection: { bulkWrite: () => {} },
    document: {},
  };

  it('returns true for insert operations', () => {
    const shouldChunk = new BulkWrite({
      ...baseOptions,
      type: 'insert',
    }).shouldExecuteInChunks();

    expect(shouldChunk).toBe(true);
  });

  it('returns false for delete operations', () => {
    const shouldChunk = new BulkWrite({
      ...baseOptions,
      type: 'delete',
    }).shouldExecuteInChunks();

    expect(shouldChunk).toBe(false);
  });

  it('returns true for update operations with a function "document"', () => {
    const shouldChunk = new BulkWrite({
      ...baseOptions,
      document: () => {},
      type: 'update',
    }).shouldExecuteInChunks();

    expect(shouldChunk).toBe(true);
  });

  it('returns false for update operations with a POJO "document"', () => {
    const shouldChunk = new BulkWrite({
      ...baseOptions,
      document: {},
      type: 'update',
    }).shouldExecuteInChunks();

    expect(shouldChunk).toBe(false);
  });

  it('returns true for replace operations with a function "document"', () => {
    const shouldChunk = new BulkWrite({
      ...baseOptions,
      document: () => {},
      type: 'replace',
    }).shouldExecuteInChunks();

    expect(shouldChunk).toBe(true);
  });

  it('returns false for update operations with a POJO "document"', () => {
    const shouldChunk = new BulkWrite({
      ...baseOptions,
      document: {},
      type: 'replace',
    }).shouldExecuteInChunks();

    expect(shouldChunk).toBe(false);
  });
});
