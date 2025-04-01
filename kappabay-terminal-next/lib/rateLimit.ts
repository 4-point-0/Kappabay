import { NextResponse } from 'next/server';
import RateLimit from 'next-rate-limit';

// Initialize the rate limiter
const limiter = RateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500, // Max 500 unique IPs per minute
});

export default async function rateLimitMiddleware(req: Request) {
  try {
    // Limit each IP to 10 requests per minute
    await limiter.check(new Headers(req.headers), 10, 'CACHE_TOKEN');
  } catch {
    throw new Error('Rate limit exceeded');
  }
}
