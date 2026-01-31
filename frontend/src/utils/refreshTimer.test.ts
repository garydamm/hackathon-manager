import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { refreshTimer } from './refreshTimer';

describe('TokenRefreshTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    refreshTimer.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    refreshTimer.clear();
  });

  // Helper to create a token that expires in X milliseconds
  const createTokenExpiringIn = (ms: number): string => {
    const now = Date.now();
    const expSeconds = Math.floor((now + ms) / 1000);
    const payload = {
      sub: 'user123',
      email: 'test@example.com',
      exp: expSeconds,
      iat: Math.floor(now / 1000),
    };
    const encodedPayload = btoa(JSON.stringify(payload))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    return `header.${encodedPayload}.signature`;
  };

  describe('start', () => {
    it('should schedule refresh 5 minutes before expiration', () => {
      const token = createTokenExpiringIn(10 * 60 * 1000); // 10 minutes
      const onRefresh = vi.fn();

      refreshTimer.start(token, onRefresh);

      expect(refreshTimer.isRunning()).toBe(true);

      // Should not call immediately
      expect(onRefresh).not.toHaveBeenCalled();

      // Advance to 4 minutes (not yet time)
      vi.advanceTimersByTime(4 * 60 * 1000);
      expect(onRefresh).not.toHaveBeenCalled();

      // Advance to 5 minutes (refresh should trigger)
      vi.advanceTimersByTime(1 * 60 * 1000);
      expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    it('should refresh immediately if token expires in less than 5 minutes', async () => {
      const token = createTokenExpiringIn(3 * 60 * 1000); // 3 minutes
      const onRefresh = vi.fn().mockResolvedValue(undefined);

      refreshTimer.start(token, onRefresh);

      // Should call immediately (async)
      await vi.runAllTimersAsync();
      expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    it('should clear existing timer when starting new one', () => {
      const token1 = createTokenExpiringIn(10 * 60 * 1000);
      const token2 = createTokenExpiringIn(15 * 60 * 1000);
      const onRefresh1 = vi.fn();
      const onRefresh2 = vi.fn();

      refreshTimer.start(token1, onRefresh1);
      expect(refreshTimer.isRunning()).toBe(true);

      // Start new timer
      refreshTimer.start(token2, onRefresh2);
      expect(refreshTimer.isRunning()).toBe(true);

      // Advance to when first timer would have triggered
      vi.advanceTimersByTime(5 * 60 * 1000);
      expect(onRefresh1).not.toHaveBeenCalled();
      expect(onRefresh2).not.toHaveBeenCalled();

      // Advance to when second timer should trigger
      vi.advanceTimersByTime(5 * 60 * 1000);
      expect(onRefresh1).not.toHaveBeenCalled();
      expect(onRefresh2).toHaveBeenCalledTimes(1);
    });

    it('should handle invalid token gracefully', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const onRefresh = vi.fn();

      refreshTimer.start('invalid-token', onRefresh);

      expect(refreshTimer.isRunning()).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[RefreshTimer] Invalid token, cannot start timer'
      );
      expect(onRefresh).not.toHaveBeenCalled();
    });

    it('should log when scheduling refresh', () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const token = createTokenExpiringIn(10 * 60 * 1000);
      const onRefresh = vi.fn();

      refreshTimer.start(token, onRefresh);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[RefreshTimer] Scheduling proactive refresh in')
      );
    });

    it('should log when refresh is triggered', () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const token = createTokenExpiringIn(10 * 60 * 1000);
      const onRefresh = vi.fn();

      refreshTimer.start(token, onRefresh);

      // Advance to trigger refresh
      vi.advanceTimersByTime(5 * 60 * 1000);

      expect(consoleLogSpy).toHaveBeenCalledWith('[RefreshTimer] Proactive refresh triggered');
    });
  });

  describe('clear', () => {
    it('should clear the timer', () => {
      const token = createTokenExpiringIn(10 * 60 * 1000);
      const onRefresh = vi.fn();

      refreshTimer.start(token, onRefresh);
      expect(refreshTimer.isRunning()).toBe(true);

      refreshTimer.clear();
      expect(refreshTimer.isRunning()).toBe(false);

      // Advance time - callback should not be called
      vi.advanceTimersByTime(10 * 60 * 1000);
      expect(onRefresh).not.toHaveBeenCalled();
    });

    it('should be safe to call when no timer is running', () => {
      expect(() => refreshTimer.clear()).not.toThrow();
      expect(refreshTimer.isRunning()).toBe(false);
    });
  });

  describe('isRunning', () => {
    it('should return false initially', () => {
      expect(refreshTimer.isRunning()).toBe(false);
    });

    it('should return true after starting timer', () => {
      const token = createTokenExpiringIn(10 * 60 * 1000);
      const onRefresh = vi.fn();

      refreshTimer.start(token, onRefresh);
      expect(refreshTimer.isRunning()).toBe(true);
    });

    it('should return false after timer executes', async () => {
      const token = createTokenExpiringIn(10 * 60 * 1000);
      const onRefresh = vi.fn().mockResolvedValue(undefined);

      refreshTimer.start(token, onRefresh);

      // Advance to trigger refresh
      vi.advanceTimersByTime(5 * 60 * 1000);
      await vi.runAllTimersAsync();

      // Timer should be cleared after execution
      expect(refreshTimer.isRunning()).toBe(false);
    });

    it('should return false after clearing', () => {
      const token = createTokenExpiringIn(10 * 60 * 1000);
      const onRefresh = vi.fn();

      refreshTimer.start(token, onRefresh);
      refreshTimer.clear();

      expect(refreshTimer.isRunning()).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should catch and log errors from refresh callback', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const token = createTokenExpiringIn(10 * 60 * 1000);
      const error = new Error('Refresh failed');
      const onRefresh = vi.fn().mockRejectedValue(error);

      refreshTimer.start(token, onRefresh);

      // Advance to trigger refresh
      vi.advanceTimersByTime(5 * 60 * 1000);
      await vi.runAllTimersAsync();

      expect(onRefresh).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[RefreshTimer] Failed to refresh token:',
        error
      );
    });

    it('should not throw when refresh callback throws', async () => {
      const token = createTokenExpiringIn(10 * 60 * 1000);
      const onRefresh = vi.fn().mockRejectedValue(new Error('Refresh failed'));

      refreshTimer.start(token, onRefresh);

      // Should not throw
      expect(() => {
        vi.advanceTimersByTime(5 * 60 * 1000);
      }).not.toThrow();

      // Wait for async callback to complete
      await vi.runAllTimersAsync();
    });
  });

  describe('refresh timing', () => {
    it('should calculate correct refresh time for 24-hour token', () => {
      const token = createTokenExpiringIn(24 * 60 * 60 * 1000); // 24 hours
      const onRefresh = vi.fn();

      refreshTimer.start(token, onRefresh);

      // Should schedule for 23 hours 55 minutes
      const expectedTime = (23 * 60 + 55) * 60 * 1000;
      vi.advanceTimersByTime(expectedTime - 1000); // Just before
      expect(onRefresh).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1000); // At the time
      expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    it('should calculate correct refresh time for 7-day token', () => {
      const token = createTokenExpiringIn(7 * 24 * 60 * 60 * 1000); // 7 days
      const onRefresh = vi.fn();

      refreshTimer.start(token, onRefresh);

      // Should schedule for 7 days - 5 minutes
      const expectedTime = (7 * 24 * 60 * 60 - 5 * 60) * 1000;
      vi.advanceTimersByTime(expectedTime - 1000); // Just before
      expect(onRefresh).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1000); // At the time
      expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    it('should handle token expiring in exactly 5 minutes', async () => {
      const token = createTokenExpiringIn(5 * 60 * 1000); // Exactly 5 minutes
      const onRefresh = vi.fn().mockResolvedValue(undefined);

      refreshTimer.start(token, onRefresh);

      // Should refresh immediately (expires in buffer time)
      await vi.runAllTimersAsync();
      expect(onRefresh).toHaveBeenCalledTimes(1);
    });
  });
});
