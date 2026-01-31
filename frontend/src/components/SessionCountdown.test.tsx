import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { SessionCountdown } from './SessionCountdown';
import { authService } from '@/services/auth';
import * as jwtUtils from '@/utils/jwt';

// Mock the authService
vi.mock('@/services/auth', () => ({
  authService: {
    getAccessToken: vi.fn(),
    getRememberMe: vi.fn(() => false), // Default to false (regular session)
  },
}));

// Mock the jwt utils
vi.mock('@/utils/jwt', () => ({
  getTimeUntilExpiration: vi.fn(),
}));

describe('SessionCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Visibility Logic', () => {
    it('should not render when no access token exists', () => {
      vi.mocked(authService.getAccessToken).mockReturnValue(null);

      const { container } = render(<SessionCountdown />);
      expect(container).toBeEmptyDOMElement();
    });

    it('should not render when token expiration cannot be determined', () => {
      vi.mocked(authService.getAccessToken).mockReturnValue('invalid-token');
      vi.mocked(jwtUtils.getTimeUntilExpiration).mockReturnValue(null);

      const { container } = render(<SessionCountdown />);
      expect(container).toBeEmptyDOMElement();
    });

    it('should not render when more than 10 minutes remain', () => {
      const ELEVEN_MINUTES_MS = 11 * 60 * 1000;

      vi.mocked(authService.getAccessToken).mockReturnValue('valid-token');
      vi.mocked(jwtUtils.getTimeUntilExpiration).mockReturnValue(ELEVEN_MINUTES_MS);

      const { container } = render(<SessionCountdown />);
      expect(container).toBeEmptyDOMElement();
    });

    it('should render when exactly 10 minutes remain', () => {
      const TEN_MINUTES_MS = 10 * 60 * 1000;

      vi.mocked(authService.getAccessToken).mockReturnValue('valid-token');
      vi.mocked(jwtUtils.getTimeUntilExpiration).mockReturnValue(TEN_MINUTES_MS);

      render(<SessionCountdown />);
      expect(screen.getByTestId('session-countdown')).toBeInTheDocument();
    });

    it('should render when less than 10 minutes remain', () => {
      const NINE_MINUTES_MS = 9 * 60 * 1000;

      vi.mocked(authService.getAccessToken).mockReturnValue('valid-token');
      vi.mocked(jwtUtils.getTimeUntilExpiration).mockReturnValue(NINE_MINUTES_MS);

      render(<SessionCountdown />);
      expect(screen.getByTestId('session-countdown')).toBeInTheDocument();
    });
  });

  describe('Time Formatting', () => {
    it('should not display when more than 10 minutes remain (even if hours)', () => {
      const TWO_HOURS_MS = 2 * 60 * 60 * 1000 + 15 * 60 * 1000; // 2h 15m (> 10 minutes)

      vi.mocked(authService.getAccessToken).mockReturnValue('valid-token');
      vi.mocked(jwtUtils.getTimeUntilExpiration).mockReturnValue(TWO_HOURS_MS);

      const { container } = render(<SessionCountdown />);
      expect(container).toBeEmptyDOMElement();
    });

    it('should display minutes and seconds when less than 1 hour remains', () => {
      const FOUR_MINUTES_MS = 4 * 60 * 1000 + 32 * 1000; // 4m 32s

      vi.mocked(authService.getAccessToken).mockReturnValue('valid-token');
      vi.mocked(jwtUtils.getTimeUntilExpiration).mockReturnValue(FOUR_MINUTES_MS);

      render(<SessionCountdown />);
      expect(screen.getByText(/Session expires in 4m 32s/)).toBeInTheDocument();
    });

    it('should display 0m 0s when time has expired', () => {
      vi.mocked(authService.getAccessToken).mockReturnValue('valid-token');
      vi.mocked(jwtUtils.getTimeUntilExpiration).mockReturnValue(0);

      render(<SessionCountdown />);
      expect(screen.getByText(/Session expires in 0m 0s/)).toBeInTheDocument();
    });

    it('should display 9m 59s for exactly 9 minutes 59 seconds', () => {
      const NINE_MIN_59_SEC_MS = 9 * 60 * 1000 + 59 * 1000;

      vi.mocked(authService.getAccessToken).mockReturnValue('valid-token');
      vi.mocked(jwtUtils.getTimeUntilExpiration).mockReturnValue(NINE_MIN_59_SEC_MS);

      render(<SessionCountdown />);
      expect(screen.getByText(/Session expires in 9m 59s/)).toBeInTheDocument();
    });
  });

  describe('Warning Styling', () => {
    it('should use normal styling when more than 5 minutes remain', () => {
      const SIX_MINUTES_MS = 6 * 60 * 1000;

      vi.mocked(authService.getAccessToken).mockReturnValue('valid-token');
      vi.mocked(jwtUtils.getTimeUntilExpiration).mockReturnValue(SIX_MINUTES_MS);

      render(<SessionCountdown />);
      const countdown = screen.getByTestId('session-countdown');
      expect(countdown).toHaveClass('bg-blue-100', 'text-blue-900', 'border-blue-300');
      expect(countdown).not.toHaveClass('bg-yellow-100');
    });

    it('should use warning styling when exactly 5 minutes remain', () => {
      const FIVE_MINUTES_MS = 5 * 60 * 1000;

      vi.mocked(authService.getAccessToken).mockReturnValue('valid-token');
      vi.mocked(jwtUtils.getTimeUntilExpiration).mockReturnValue(FIVE_MINUTES_MS);

      render(<SessionCountdown />);
      const countdown = screen.getByTestId('session-countdown');
      expect(countdown).toHaveClass('bg-blue-100', 'text-blue-900');
      expect(countdown).not.toHaveClass('bg-yellow-100');
    });

    it('should use warning styling when less than 5 minutes remain', () => {
      const FOUR_MINUTES_MS = 4 * 60 * 1000;

      vi.mocked(authService.getAccessToken).mockReturnValue('valid-token');
      vi.mocked(jwtUtils.getTimeUntilExpiration).mockReturnValue(FOUR_MINUTES_MS);

      render(<SessionCountdown />);
      const countdown = screen.getByTestId('session-countdown');
      expect(countdown).toHaveClass('bg-yellow-100', 'text-yellow-900', 'border-yellow-300');
      expect(countdown).not.toHaveClass('bg-blue-100');
    });
  });

  describe('Real-time Updates', () => {
    it('should update countdown every second', () => {
      const INITIAL_TIME_MS = 4 * 60 * 1000 + 32 * 1000; // 4m 32s

      let currentTime = INITIAL_TIME_MS;
      vi.mocked(authService.getAccessToken).mockReturnValue('valid-token');
      vi.mocked(jwtUtils.getTimeUntilExpiration).mockImplementation(() => currentTime);

      render(<SessionCountdown />);

      // Initial state
      expect(screen.getByText(/Session expires in 4m 32s/)).toBeInTheDocument();

      // Advance 1 second
      currentTime = INITIAL_TIME_MS - 1000;
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.getByText(/Session expires in 4m 31s/)).toBeInTheDocument();

      // Advance another second
      currentTime = INITIAL_TIME_MS - 2000;
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.getByText(/Session expires in 4m 30s/)).toBeInTheDocument();
    });

    it('should transition from normal to warning styling when crossing 5 minute threshold', () => {
      const INITIAL_TIME_MS = 5 * 60 * 1000 + 1000; // 5m 1s (normal)

      let currentTime = INITIAL_TIME_MS;
      vi.mocked(authService.getAccessToken).mockReturnValue('valid-token');
      vi.mocked(jwtUtils.getTimeUntilExpiration).mockImplementation(() => currentTime);

      render(<SessionCountdown />);

      // Initially normal styling (> 5 minutes)
      let countdown = screen.getByTestId('session-countdown');
      expect(countdown).toHaveClass('bg-blue-100');

      // Advance 2 seconds to cross the 5 minute threshold
      currentTime = INITIAL_TIME_MS - 2000; // Now 4m 59s (warning)
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      countdown = screen.getByTestId('session-countdown');
      expect(countdown).toHaveClass('bg-yellow-100');
      expect(countdown).not.toHaveClass('bg-blue-100');
    });

    it('should hide when time crosses 10 minute threshold', () => {
      const INITIAL_TIME_MS = 9 * 60 * 1000; // 9m (visible)

      let currentTime = INITIAL_TIME_MS;
      vi.mocked(authService.getAccessToken).mockReturnValue('valid-token');
      vi.mocked(jwtUtils.getTimeUntilExpiration).mockImplementation(() => currentTime);

      const { container } = render(<SessionCountdown />);

      // Initially visible
      expect(screen.getByTestId('session-countdown')).toBeInTheDocument();

      // Simulate token refresh - now 11 minutes remain
      currentTime = 11 * 60 * 1000; // 11m (should hide)
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Should be hidden now
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('Cleanup', () => {
    it('should clear interval on unmount', () => {
      const FOUR_MINUTES_MS = 4 * 60 * 1000;

      vi.mocked(authService.getAccessToken).mockReturnValue('valid-token');
      vi.mocked(jwtUtils.getTimeUntilExpiration).mockReturnValue(FOUR_MINUTES_MS);

      const { unmount } = render(<SessionCountdown />);

      // Spy on clearInterval
      const clearIntervalSpy = vi.spyOn(window, 'clearInterval');

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const FOUR_MINUTES_MS = 4 * 60 * 1000;

      vi.mocked(authService.getAccessToken).mockReturnValue('valid-token');
      vi.mocked(jwtUtils.getTimeUntilExpiration).mockReturnValue(FOUR_MINUTES_MS);

      render(<SessionCountdown />);
      const countdown = screen.getByTestId('session-countdown');

      expect(countdown).toHaveAttribute('role', 'status');
      expect(countdown).toHaveAttribute('aria-live', 'polite');
    });

    it('should have proper positioning classes', () => {
      const FOUR_MINUTES_MS = 4 * 60 * 1000;

      vi.mocked(authService.getAccessToken).mockReturnValue('valid-token');
      vi.mocked(jwtUtils.getTimeUntilExpiration).mockReturnValue(FOUR_MINUTES_MS);

      render(<SessionCountdown />);
      const countdown = screen.getByTestId('session-countdown');

      // Check for fixed position and top-right placement
      expect(countdown).toHaveClass('fixed', 'top-16', 'right-4', 'z-40');
    });
  });
});
