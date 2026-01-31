import { useEffect, useState } from "react"
import { Clock } from "lucide-react"
import { getTimeUntilExpiration } from "@/utils/jwt"
import { authService } from "@/services/auth"

/**
 * Formats milliseconds into a human-readable time string
 * @param ms - Time in milliseconds
 * @returns Formatted string like "4m 32s" or "23h 45m"
 */
function formatTimeRemaining(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m ${seconds}s`
}

/**
 * SessionCountdown Component
 * Displays remaining session time in a fixed position
 * - Shows when < 10 minutes remain
 * - Warning styling when < 5 minutes remain
 * - Updates every second
 */
export function SessionCountdown() {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)

  useEffect(() => {
    // Function to update countdown
    const updateCountdown = () => {
      const accessToken = authService.getAccessToken()
      if (!accessToken) {
        setTimeRemaining(null)
        return
      }

      const remaining = getTimeUntilExpiration(accessToken)
      if (remaining === null) {
        setTimeRemaining(null)
        return
      }

      // Adjust visibility threshold based on remember me
      const isRememberMe = authService.getRememberMe()
      // Show when < 10 min for regular, < 60 min for remember me
      const visibilityThreshold = isRememberMe ? 60 * 60 * 1000 : 10 * 60 * 1000

      if (remaining > visibilityThreshold) {
        setTimeRemaining(null)
        return
      }

      setTimeRemaining(remaining)
    }

    // Update immediately
    updateCountdown()

    // Update every second
    const intervalId = setInterval(updateCountdown, 1000)

    return () => clearInterval(intervalId)
  }, [])

  // Don't render if no time remaining
  if (timeRemaining === null) {
    return null
  }

  // Determine if warning styling should be applied
  // < 5 min for regular sessions, < 30 min for remember me sessions
  const isRememberMe = authService.getRememberMe()
  const warningThreshold = isRememberMe ? 30 * 60 * 1000 : 5 * 60 * 1000
  const isWarning = timeRemaining < warningThreshold

  return (
    <div
      className={`fixed top-16 right-4 z-40 px-4 py-2 rounded-lg shadow-lg ${
        isWarning
          ? "bg-yellow-100 text-yellow-900 border border-yellow-300"
          : "bg-blue-100 text-blue-900 border border-blue-300"
      }`}
      role="status"
      aria-live="polite"
      data-testid="session-countdown"
    >
      <div className="flex items-center gap-2">
        <Clock className={`h-4 w-4 ${isWarning ? "text-yellow-600" : "text-blue-600"}`} />
        <span className="text-sm font-medium">
          Session expires in {formatTimeRemaining(timeRemaining)}
        </span>
      </div>
    </div>
  )
}
