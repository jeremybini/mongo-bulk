import { BulkWrite } from './bulkWrite';

export class BulkInsert extends BulkWrite {
  constructor(options) {
    super({
      ...options,
      type: 'insert',
    });
  }
}

export default async function bulkInsert(options) {
  return new BulkInsert(options).execute();
}
