import { Redis } from "@upstash/redis";

// Singleton Redis client
export const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

/**
 * Simple sliding window rate limiter using Upstash Redis
 * Returns { success: true, remaining } if allowed, { success: false, retryAfter } if rate limited
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ success: true; remaining: number } | { success: false; retryAfter: number }> {
  if (!redis) {
    // No Redis configured, allow all requests
    return { success: true, remaining: limit };
  }

  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const windowStart = now - windowMs;

  // Use a sorted set for sliding window
  const redisKey = `ratelimit:${key}`;

  // Remove old entries and add new one in a pipeline
  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(redisKey, 0, windowStart);
  pipeline.zadd(redisKey, { score: now, member: `${now}-${Math.random()}` });
  pipeline.zcard(redisKey);
  pipeline.expire(redisKey, windowSeconds + 1);

  const results = await pipeline.exec();
  const count = results[2] as number;

  if (count > limit) {
    // Get the oldest entry to calculate retry time
    const oldest = await redis.zrange<string[]>(redisKey, 0, 0, { withScores: true });
    const oldestTime = oldest.length >= 2 ? parseInt(oldest[1]) : now;
    const retryAfter = Math.ceil((oldestTime + windowMs - now) / 1000);

    return { success: false, retryAfter: Math.max(1, retryAfter) };
  }

  return { success: true, remaining: limit - count };
}

/**
 * AI generation rate limiter
 * Default: 30 generations per hour per user
 */
export async function checkAIRateLimit(
  userId: string,
  limit = 30,
  windowSeconds = 3600
): Promise<{ success: true; remaining: number } | { success: false; retryAfter: number }> {
  return checkRateLimit(`ai:${userId}`, limit, windowSeconds);
}

/**
 * Batch AI generation rate limiter (stricter)
 * Default: 5 batch generations per hour per user
 */
export async function checkAIBatchRateLimit(
  userId: string,
  limit = 5,
  windowSeconds = 3600
): Promise<{ success: true; remaining: number } | { success: false; retryAfter: number }> {
  return checkRateLimit(`ai-batch:${userId}`, limit, windowSeconds);
}
