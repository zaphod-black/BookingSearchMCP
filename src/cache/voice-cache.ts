import { CachedResult, AvailabilityQuery } from '../types';
import { logger } from '../utils/logger';
import { MockSearchAdapter } from '../adapters/mock-search-adapter';

export class VoiceOptimizedCache {
  private memoryCache = new Map<string, CachedResult>();
  private readonly CACHE_TTL: number;
  
  constructor() {
    this.CACHE_TTL = (parseInt(process.env.CACHE_TTL_SECONDS || '600') * 1000);
    
    // Start cache cleanup interval
    setInterval(() => this.cleanupExpiredEntries(), 60 * 1000); // Every minute
  }
  
  async get(key: string): Promise<any | null> {
    const cached = this.memoryCache.get(key);
    
    if (!cached) {
      return null;
    }
    
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.memoryCache.delete(key);
      return null;
    }
    
    logger.debug('Cache hit', { key, age: Date.now() - cached.timestamp });
    return cached.data;
  }
  
  async set(key: string, data: any): Promise<void> {
    this.memoryCache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    logger.debug('Cache set', { key });
  }
  
  async delete(key: string): Promise<void> {
    this.memoryCache.delete(key);
  }
  
  async clear(): Promise<void> {
    this.memoryCache.clear();
    logger.info('Cache cleared');
  }
  
  getSize(): number {
    return this.memoryCache.size;
  }
  
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    let removed = 0;
    
    for (const [key, value] of this.memoryCache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.memoryCache.delete(key);
        removed++;
      }
    }
    
    if (removed > 0) {
      logger.debug('Cache cleanup', { removed, remaining: this.memoryCache.size });
    }
  }
  
  async preloadCommonSearches(): Promise<void> {
    logger.info('Pre-warming cache with common searches...');
    
    const commonQueries: Partial<AvailabilityQuery>[] = [
      { activityType: 'whale watching', partySize: 2 },
      { activityType: 'kayaking', partySize: 4 },
      { activityType: 'fishing', partySize: 6 },
      { activityType: 'boat tour', partySize: 2 },
      { activityType: 'snorkeling', partySize: 4 }
    ];
    
    const mockAdapter = new MockSearchAdapter();
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    for (const baseQuery of commonQueries) {
      const query: AvailabilityQuery = {
        startDate: today.toISOString().split('T')[0],
        endDate: nextWeek.toISOString().split('T')[0],
        partySize: baseQuery.partySize || 2,
        activityType: baseQuery.activityType,
        platform: 'mock',
        startTime: performance.now()
      };
      
      try {
        const result = await mockAdapter.searchAvailability(query);
        const cacheKey = this.generateCacheKey(query);
        await this.set(cacheKey, result);
      } catch (error) {
        logger.error('Failed to pre-warm cache entry', { query, error });
      }
    }
    
    logger.info('Cache pre-warming complete', { entries: this.getSize() });
  }
  
  private generateCacheKey(query: AvailabilityQuery): string {
    return `search:${query.platform}:${query.startDate}:${query.endDate}:${query.partySize}:${query.activityType || 'any'}`;
  }
  
  // Performance metrics
  getCacheStats(): { hits: number; misses: number; size: number; hitRate: number } {
    // This is a simplified version - in production, you'd track actual hits/misses
    const size = this.getSize();
    return {
      hits: 0,
      misses: 0,
      size,
      hitRate: 0
    };
  }
}