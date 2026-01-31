import { useEffect, useState } from "react"
import { Clock, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { authService } from "@/services/auth"
import { getTimeUntilExpiration } from "@/utils/jwt"

const SHOW_NOTIFICATION_THRESHOLD_MS = 5 * 60 * 1000 // 5 minutes

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}m ${seconds}s`
}

export function SessionTimeoutNotification() {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [isExtending, setIsExtending] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    const updateTimeRemaining = () => {
      const accessToken = authService.getAccessToken()
      if (!accessToken) {
        setTimeRemaining(null)
        return
      }

      const remaining = getTimeUntilExpiration(accessToken)
      if (remaining === null || remaining <= 0) {
        setTimeRemaining(null)
        return
      }

      // Only show notification if < 5 minutes remain
      if (remaining < SHOW_NOTIFICATION_THRESHOLD_MS) {
        setTimeRemaining(remaining)
      } else {
        setTimeRemaining(null)
      }
    }

    // Check immediately
    updateTimeRemaining()

    // Update every second
    const interval = setInterval(updateTimeRemaining, 1000)

    return () => clearInterval(interval)
  }, [])

  const handleExtendSession = async () => {
    setIsExtending(true)
    try {
      await authService.refreshToken()
      // After successful refresh, notification will hide automatically
      // because timeRemaining will be updated to > 5 minutes
      setIsDismissed(false) // Reset dismissed state for future notifications
    } catch (error) {
      console.error("Failed to extend session:", error)
    } finally {
      setIsExtending(false)
    }
  }

  const handleDismiss = () => {
    setIsDismissed(true)
  }

  // Don't show if dismissed or no time remaining or time remaining is null
  const shouldShow = !isDismissed && timeRemaining !== null && timeRemaining > 0

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -100 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed top-16 left-0 right-0 z-50 bg-yellow-500 text-yellow-950 shadow-lg"
          role="alert"
          aria-live="polite"
        >
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <Clock className="h-5 w-5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-sm sm:text-base">
                    Session expiring soon
                  </p>
                  <p className="text-sm opacity-90">
                    Your session expires in {formatTime(timeRemaining!)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleExtendSession}
                  disabled={isExtending}
                  variant="secondary"
                  size="sm"
                  className="bg-yellow-950 text-yellow-50 hover:bg-yellow-900"
                >
                  {isExtending ? "Extending..." : "Extend Session"}
                </Button>
                <Button
                  onClick={handleDismiss}
                  variant="ghost"
                  size="sm"
                  className="hover:bg-yellow-600/20"
                  aria-label="Dismiss notification"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
