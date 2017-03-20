import Chance from 'chance';
import { times } from 'lodash';
import monk from 'monk';

const chance = new Chance();
const { MONGO_URL } = process.env;

export async function seedCollection({ collection, count = 1, dbUrl, seed = {}, seeds }) {
  const seedDocs = seeds || times(count, () =>
    (typeof seed === 'function' ? seed() : { ...seed })
  );
  return monk(dbUrl).get(collection).insert(seedDocs);
}

export async function dropCollection({ collection, dbUrl }) {
  return monk(dbUrl).get(collection).remove({});
}

export async function dropAndSeedCollection({ collection, count, dbUrl, seed, seeds }) {
  await dropCollection({ collection, dbUrl });
  return seedCollection({ collection, count, dbUrl, seed, seeds });
}

export function dropUserCollection() {
  return dropCollection({ collection: 'users', dbUrl: MONGO_URL });
}

export function reseedUserCollection(options = {}) {
  return dropAndSeedCollection({
    collection: 'users',
    count: 2000,
    dbUrl: MONGO_URL,
    seed: () => ({
      age: chance.age({ type: 'all' }),
      gender: chance.gender(),
      name: chance.name(),
    }),
    ...options,
  });
}
