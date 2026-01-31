import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  decodeToken,
  getTokenExpiration,
  isTokenExpired,
  getTimeUntilExpiration,
} from './jwt';

describe('JWT Utility', () => {
  // Helper to create a valid JWT token for testing
  function createTestToken(payload: Record<string, any>): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = btoa(JSON.stringify(header))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    const encodedPayload = btoa(JSON.stringify(payload))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    // For testing purposes, signature doesn't matter
    const signature = 'test-signature';

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  describe('decodeToken', () => {
    it('should decode a valid JWT token', () => {
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        sub: 'user123',
        email: 'test@example.com',
        exp: now + 3600,
        iat: now,
      };

      const token = createTestToken(payload);
      const decoded = decodeToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.sub).toBe('user123');
      expect(decoded?.email).toBe('test@example.com');
      expect(decoded?.exp).toBe(payload.exp);
      expect(decoded?.iat).toBe(payload.iat);
    });

    it('should decode token with rememberMe flag', () => {
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        sub: 'user123',
        email: 'test@example.com',
        exp: now + 3600,
        iat: now,
        rememberMe: true,
      };

      const token = createTestToken(payload);
      const decoded = decodeToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.rememberMe).toBe(true);
    });

    it('should return null for invalid token format', () => {
      expect(decodeToken('invalid')).toBeNull();
      expect(decodeToken('invalid.token')).toBeNull();
      expect(decodeToken('')).toBeNull();
    });

    it('should return null for token with invalid base64', () => {
      const token = 'header.!!!invalid-base64!!!.signature';
      expect(decodeToken(token)).toBeNull();
    });

    it('should return null for token with invalid JSON', () => {
      const invalidPayload = btoa('not-json-data');
      const token = `header.${invalidPayload}.signature`;
      expect(decodeToken(token)).toBeNull();
    });

    it('should return null for token missing required fields', () => {
      const payload = {
        sub: 'user123',
        // Missing exp and iat
      };

      const token = createTestToken(payload);
      expect(decodeToken(token)).toBeNull();
    });

    it('should return null for token with non-numeric exp/iat', () => {
      const payload = {
        sub: 'user123',
        exp: 'not-a-number',
        iat: 'not-a-number',
      };

      const token = createTestToken(payload);
      expect(decodeToken(token)).toBeNull();
    });

    it('should handle URL-safe base64 encoding correctly', () => {
      const now = Math.floor(Date.now() / 1000);
      // Create payload that will result in URL-safe characters (- and _)
      const payload = {
        sub: 'user123',
        email: 'test@example.com',
        exp: now + 3600,
        iat: now,
        data: '>>>???', // Characters that create + and / in base64
      };

      const token = createTestToken(payload);
      const decoded = decodeToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.sub).toBe('user123');
    });
  });

  describe('getTokenExpiration', () => {
    it('should return expiration timestamp in milliseconds', () => {
      const expSeconds = Math.floor(Date.now() / 1000) + 3600;
      const payload = {
        sub: 'user123',
        exp: expSeconds,
        iat: Math.floor(Date.now() / 1000),
      };

      const token = createTestToken(payload);
      const expiration = getTokenExpiration(token);

      expect(expiration).toBe(expSeconds * 1000);
    });

    it('should return null for invalid token', () => {
      expect(getTokenExpiration('invalid')).toBeNull();
    });
  });

  describe('isTokenExpired', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('should return false for valid non-expired token', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const expSeconds = Math.floor(now / 1000) + 3600; // Expires in 1 hour
      const payload = {
        sub: 'user123',
        exp: expSeconds,
        iat: Math.floor(now / 1000),
      };

      const token = createTestToken(payload);
      expect(isTokenExpired(token)).toBe(false);
    });

    it('should return true for expired token', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const expSeconds = Math.floor(now / 1000) - 3600; // Expired 1 hour ago
      const payload = {
        sub: 'user123',
        exp: expSeconds,
        iat: Math.floor(now / 1000) - 7200,
      };

      const token = createTestToken(payload);
      expect(isTokenExpired(token)).toBe(true);
    });

    it('should return true for token expiring at exact current time', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const expSeconds = Math.floor(now / 1000);
      const payload = {
        sub: 'user123',
        exp: expSeconds,
        iat: Math.floor(now / 1000) - 3600,
      };

      const token = createTestToken(payload);
      expect(isTokenExpired(token)).toBe(true);
    });

    it('should return null for invalid token', () => {
      expect(isTokenExpired('invalid')).toBeNull();
    });
  });

  describe('getTimeUntilExpiration', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('should return correct time remaining in milliseconds', () => {
      // Use a clean timestamp to avoid rounding issues
      const now = 1000000000000; // Use a fixed timestamp
      vi.setSystemTime(now);

      const expSeconds = Math.floor(now / 1000) + 3600; // Expires in 1 hour
      const payload = {
        sub: 'user123',
        exp: expSeconds,
        iat: Math.floor(now / 1000),
      };

      const token = createTestToken(payload);
      const timeRemaining = getTimeUntilExpiration(token);

      expect(timeRemaining).toBe(3600 * 1000); // 1 hour in ms
    });

    it('should return 0 for expired token', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const expSeconds = Math.floor(now / 1000) - 3600; // Expired 1 hour ago
      const payload = {
        sub: 'user123',
        exp: expSeconds,
        iat: Math.floor(now / 1000) - 7200,
      };

      const token = createTestToken(payload);
      const timeRemaining = getTimeUntilExpiration(token);

      expect(timeRemaining).toBe(0);
    });

    it('should return null for invalid token', () => {
      expect(getTimeUntilExpiration('invalid')).toBeNull();
    });

    it('should return decreasing value as time passes', () => {
      // Use a clean timestamp to avoid rounding issues
      const now = 1000000000000; // Use a fixed timestamp
      vi.setSystemTime(now);

      const expSeconds = Math.floor(now / 1000) + 3600; // Expires in 1 hour
      const payload = {
        sub: 'user123',
        exp: expSeconds,
        iat: Math.floor(now / 1000),
      };

      const token = createTestToken(payload);

      const time1 = getTimeUntilExpiration(token);
      expect(time1).toBe(3600 * 1000);

      // Advance time by 30 minutes
      vi.advanceTimersByTime(30 * 60 * 1000);

      const time2 = getTimeUntilExpiration(token);
      expect(time2).toBe(30 * 60 * 1000);
    });
  });
});
