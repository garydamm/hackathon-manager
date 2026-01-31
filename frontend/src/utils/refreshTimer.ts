import { getTimeUntilExpiration } from './jwt';

/**
 * Time before expiration to trigger proactive refresh
 * 5 minutes for regular sessions, 30 minutes for remember me sessions
 */
const REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes
const REFRESH_BUFFER_REMEMBER_ME_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Callback function type for token refresh
 */
type RefreshCallback = () => Promise<void>;

/**
 * Token Refresh Timer
 * Manages automatic token refresh before expiration
 */
class TokenRefreshTimer {
  private timerId: number | null = null;
  private refreshCallback: RefreshCallback | null = null;

  /**
   * Starts the refresh timer for the given token
   * @param token - The JWT access token
   * @param onRefresh - Callback function to execute when refresh is needed
   * @param isRememberMe - Whether this is a remember me session (uses longer buffer)
   */
  start(token: string, onRefresh: RefreshCallback, isRememberMe = false): void {
    // Clear any existing timer
    this.clear();

    this.refreshCallback = onRefresh;

    // Calculate time until expiration
    const timeUntilExpiration = getTimeUntilExpiration(token);

    if (timeUntilExpiration === null) {
      console.error('[RefreshTimer] Invalid token, cannot start timer');
      return;
    }

    // Use longer buffer for remember me sessions (30 min vs 5 min)
    const bufferMs = isRememberMe ? REFRESH_BUFFER_REMEMBER_ME_MS : REFRESH_BUFFER_MS;
    const bufferMinutes = isRememberMe ? 30 : 5;

    // Calculate when to refresh
    const timeUntilRefresh = timeUntilExpiration - bufferMs;

    if (timeUntilRefresh <= 0) {
      // Token expires soon, refresh immediately
      console.log(`[RefreshTimer] Token expires soon (< ${bufferMinutes} min), refreshing immediately`);
      void this.executeRefresh();
      return;
    }

    // Schedule the refresh
    console.log(
      `[RefreshTimer] Scheduling proactive refresh in ${Math.round(timeUntilRefresh / 1000)}s (buffer: ${bufferMinutes} min)`
    );

    this.timerId = window.setTimeout(() => {
      console.log('[RefreshTimer] Proactive refresh triggered');
      void this.executeRefresh();
    }, timeUntilRefresh);
  }

  /**
   * Executes the refresh callback and handles any errors
   */
  private async executeRefresh(): Promise<void> {
    if (!this.refreshCallback) {
      return;
    }

    try {
      await this.refreshCallback();
    } catch (error) {
      console.error('[RefreshTimer] Failed to refresh token:', error);
    } finally {
      // Clear timer state after execution
      this.timerId = null;
    }
  }

  /**
   * Clears the current timer
   */
  clear(): void {
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.refreshCallback = null;
  }

  /**
   * Checks if timer is currently running
   */
  isRunning(): boolean {
    return this.timerId !== null;
  }

  /**
   * Gets the appropriate refresh buffer time in milliseconds
   * @param isRememberMe - Whether this is a remember me session
   * @returns Buffer time in milliseconds
   */
  getRefreshBuffer(isRememberMe = false): number {
    return isRememberMe ? REFRESH_BUFFER_REMEMBER_ME_MS : REFRESH_BUFFER_MS;
  }
}

// Export a singleton instance
export const refreshTimer = new TokenRefreshTimer();
