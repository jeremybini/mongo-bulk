import { BulkWrite } from './bulkWrite';

export class BulkReplace extends BulkWrite {
  constructor(options) {
    super({
      ...options,
      type: 'replace',
    });
  }
}

export default async function bulkReplace(options) {
  return new BulkReplace(options).execute();
}
