import { logger } from './logger';

let redisAvailable = false;
let redisClient: any = null;

export async function connectRedis(): Promise<void> {
  const url = process.env.REDIS_URL;
  if (!url || url === 'redis://localhost:6379') {
    logger.warn('Redis not configured, cache disabled');
    return;
  }
  try {
    const { createClient } = await import('redis');
    redisClient = createClient({ url });
    redisClient.on('error', (err: any) => logger.warn('Redis error', { error: err.message }));
    await redisClient.connect();
    redisAvailable = true;
    logger.info('Redis connected');
  } catch (err: any) {
    logger.warn('Redis unavailable, running without cache', { error: err.message });
  }
}

export async function getCache<T>(key: string): Promise<T | null> {
  if (!redisAvailable || !redisClient) return null;
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch { return null; }
}

export async function setCache(key: string, value: any, ttlSeconds = 300): Promise<void> {
  if (!redisAvailable || !redisClient) return;
  try { await redisClient.setEx(key, ttlSeconds, JSON.stringify(value)); } catch {}
}

export async function deleteCache(key: string): Promise<void> {
  if (!redisAvailable || !redisClient) return;
  try { await redisClient.del(key); } catch {}
}

export async function deleteCachePattern(pattern: string): Promise<void> {
  if (!redisAvailable || !redisClient) return;
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) await redisClient.del(keys);
  } catch {}
}

export default { get: getCache, set: setCache, del: deleteCache };
