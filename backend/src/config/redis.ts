import { createClient } from 'redis';
import { logger } from './logger';

const redis = createClient({ url: process.env.REDIS_URL });

redis.on('error', (err) => logger.error('Redis error', { error: err.message }));
redis.on('connect', () => logger.info('Redis connected'));

export async function connectRedis(): Promise<void> {
  await redis.connect();
}

export async function getCache<T>(key: string): Promise<T | null> {
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
}

export async function setCache(
  key: string,
  value: any,
  ttlSeconds = 300
): Promise<void> {
  await redis.setEx(key, ttlSeconds, JSON.stringify(value));
}

export async function deleteCache(key: string): Promise<void> {
  await redis.del(key);
}

export async function deleteCachePattern(pattern: string): Promise<void> {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) await redis.del(keys);
}

export default redis;
