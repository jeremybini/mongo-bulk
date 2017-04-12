import { BulkWrite } from './bulkWrite';

export class BulkUpdate extends BulkWrite {
  constructor(options) {
    super({
      ...options,
      type: 'update',
    });
  }
}

export default async function bulkUpdate(options) {
  return new BulkUpdate(options).execute();
}
