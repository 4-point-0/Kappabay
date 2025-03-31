import NodeCache from 'node-cache';

// Initialize NodeCache with desired options (e.g., TTL of 1 hour)
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 120 });

export const cacheManager = {
  set: (key: string, value: Buffer) => {
    // Store Buffer as Base64 string
    cache.set(key, value.toString('base64'));
  },
  get: (key: string): Buffer | null => {
    const cachedData = cache.get<string>(key);
    return cachedData ? Buffer.from(cachedData, 'base64') : null;
  },
  del: (key: string) => {
    cache.del(key);
  },
};
