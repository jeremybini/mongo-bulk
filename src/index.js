import bulkDelete from './bulkDelete';
import bulkInsert from './bulkInsert';
import bulkReplace from './bulkReplace';
import bulkUpdate from './bulkUpdate';
import bulkWrite from './bulkWrite';

const bulk = module.exports = bulkWrite;

Object.assign(bulk, {
  bulkDelete,
  bulkInsert,
  bulkReplace,
  bulkUpdate,
});
