import { getTimeUntilExpiration } from './jwt';

/**
 * Time before expiration to trigger proactive refresh (5 minutes in milliseconds)
 */
const REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

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
   */
  start(token: string, onRefresh: RefreshCallback): void {
    // Clear any existing timer
    this.clear();

    this.refreshCallback = onRefresh;

    // Calculate time until expiration
    const timeUntilExpiration = getTimeUntilExpiration(token);

    if (timeUntilExpiration === null) {
      console.error('[RefreshTimer] Invalid token, cannot start timer');
      return;
    }

    // Calculate when to refresh (5 minutes before expiration)
    const timeUntilRefresh = timeUntilExpiration - REFRESH_BUFFER_MS;

    if (timeUntilRefresh <= 0) {
      // Token expires in less than 5 minutes, refresh immediately
      console.log('[RefreshTimer] Token expires soon, refreshing immediately');
      void this.executeRefresh();
      return;
    }

    // Schedule the refresh
    console.log(
      `[RefreshTimer] Scheduling proactive refresh in ${Math.round(timeUntilRefresh / 1000)}s`
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
}

// Export a singleton instance
export const refreshTimer = new TokenRefreshTimer();
