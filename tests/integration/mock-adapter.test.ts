import { MockSearchAdapter } from '../../src/adapters/mock-search-adapter';
import { AvailabilityQuery } from '../../src/types';

describe('MockSearchAdapter Integration', () => {
  let adapter: MockSearchAdapter;
  
  beforeEach(() => {
    adapter = new MockSearchAdapter();
  });
  
  describe('searchAvailability', () => {
    test('should return voice-optimized availability results', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      const query: AvailabilityQuery = {
        startDate: tomorrow.toISOString().split('T')[0],
        endDate: nextWeek.toISOString().split('T')[0],
        partySize: 4,
        activityType: 'whale watching',
        sessionId: 'test-session',
        startTime: performance.now()
      };
      
      const result = await adapter.searchAvailability(query);
      
      expect(result.success).toBe(true);
      expect(result.spokenSummary).toBeDefined();
      expect(result.spokenSummary.length).toBeLessThan(300); // Voice-optimized length
      expect(result.availableSlots).toBeDefined();
      expect(result.totalOptions).toBeGreaterThanOrEqual(0);
      expect(result.responseTime).toBeGreaterThan(0);
      expect(result.conversationContext.platform).toBe('mock');
    });
    
    test('should handle whale watching searches specifically', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      const query: AvailabilityQuery = {
        startDate: tomorrow.toISOString().split('T')[0],
        endDate: nextWeek.toISOString().split('T')[0],
        partySize: 2,
        activityType: 'whale watching',
        startTime: performance.now()
      };
      
      const result = await adapter.searchAvailability(query);
      
      expect(result.success).toBe(true);
      expect(result.availableSlots.length).toBeGreaterThan(0);
      
      // Check that slots match activity type
      result.availableSlots.forEach(slot => {
        expect(slot.activityName.toLowerCase()).toContain('whale');
      });
    });
    
    test('should respect party size constraints', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      const query: AvailabilityQuery = {
        startDate: tomorrow.toISOString().split('T')[0],
        endDate: nextWeek.toISOString().split('T')[0],
        partySize: 15, // Large party
        startTime: performance.now()
      };
      
      const result = await adapter.searchAvailability(query);
      
      // All returned slots should accommodate the party size
      result.availableSlots.forEach(slot => {
        expect(slot.spotsAvailable).toBeGreaterThanOrEqual(query.partySize);
      });
    });
    
    test('should handle price filtering', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      const query: AvailabilityQuery = {
        startDate: tomorrow.toISOString().split('T')[0],
        endDate: nextWeek.toISOString().split('T')[0],
        partySize: 2,
        priceMin: 40,
        priceMax: 60,
        startTime: performance.now()
      };
      
      const result = await adapter.searchAvailability(query);
      
      result.availableSlots.forEach(slot => {
        expect(slot.pricePerPerson).toBeGreaterThanOrEqual(40);
        expect(slot.pricePerPerson).toBeLessThanOrEqual(60);
      });
    });
  });
  
  describe('validateAvailability', () => {
    test('should validate availability with high success rate', async () => {
      const availabilityId = 'mock-test-id';
      
      // Run multiple validations to test the 95% success rate
      const results = await Promise.all(
        Array.from({ length: 20 }, () => adapter.validateAvailability(availabilityId))
      );
      
      const successCount = results.filter(Boolean).length;
      const successRate = successCount / results.length;
      
      // Should have high success rate (allowing for randomness)
      expect(successRate).toBeGreaterThan(0.8);
    });
  });
  
  describe('performance requirements', () => {
    test('should respond within voice performance limits', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      const query: AvailabilityQuery = {
        startDate: tomorrow.toISOString().split('T')[0],
        endDate: nextWeek.toISOString().split('T')[0],
        partySize: 4,
        startTime: performance.now()
      };
      
      const startTime = performance.now();
      const result = await adapter.searchAvailability(query);
      const actualTime = performance.now() - startTime;
      
      // Should be reasonably fast for voice
      expect(actualTime).toBeLessThan(200); // 200ms max for mock
      expect(result.responseTime).toBeGreaterThan(0);
    });
  });
});