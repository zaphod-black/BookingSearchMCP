import { VoiceOptimizedCache } from '../../src/cache/voice-cache';
import { AvailabilityResponse } from '../../src/types';

describe('VoiceOptimizedCache', () => {
  let cache: VoiceOptimizedCache;
  
  beforeEach(() => {
    cache = new VoiceOptimizedCache();
  });
  
  describe('basic operations', () => {
    test('should store and retrieve data', async () => {
      const key = 'test-key';
      const data = { test: 'value' };
      
      await cache.set(key, data);
      const result = await cache.get(key);
      
      expect(result).toEqual(data);
    });
    
    test('should return null for non-existent key', async () => {
      const result = await cache.get('non-existent');
      expect(result).toBeNull();
    });
    
    test('should clear cache', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      
      expect(cache.getSize()).toBe(2);
      
      await cache.clear();
      
      expect(cache.getSize()).toBe(0);
      expect(await cache.get('key1')).toBeNull();
    });
  });
  
  describe('TTL functionality', () => {
    test('should respect TTL and expire entries', async () => {
      // Mock a short TTL for testing
      const shortTtlCache = new (class extends VoiceOptimizedCache {
        constructor() {
          super();
          // Override TTL to 10ms for testing
          (this as any).CACHE_TTL = 10;
        }
      })();
      
      await shortTtlCache.set('test-key', 'test-value');
      
      // Should be available immediately
      expect(await shortTtlCache.get('test-key')).toBe('test-value');
      
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Should be null after TTL
      expect(await shortTtlCache.get('test-key')).toBeNull();
    });
  });
  
  describe('size tracking', () => {
    test('should track cache size correctly', async () => {
      expect(cache.getSize()).toBe(0);
      
      await cache.set('key1', 'value1');
      expect(cache.getSize()).toBe(1);
      
      await cache.set('key2', 'value2');
      expect(cache.getSize()).toBe(2);
      
      await cache.delete('key1');
      expect(cache.getSize()).toBe(1);
    });
  });
});