import { times } from 'lodash';
import monk from 'monk';

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
