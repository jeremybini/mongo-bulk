import { BulkWrite } from './bulkWrite';

export class BulkDelete extends BulkWrite {
  constructor(options) {
    super({
      ...options,
      type: 'delete',
    });
  }
}

export default async function bulkDelete(options) {
  return new BulkDelete(options).execute();
}
