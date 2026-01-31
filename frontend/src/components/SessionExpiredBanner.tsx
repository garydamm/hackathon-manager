import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { AlertCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { motion, AnimatePresence } from "framer-motion"

export function SessionExpiredBanner() {
  const { sessionExpired, clearSessionExpiredFlag } = useAuth()
  const navigate = useNavigate()

  // Auto-redirect to login after a delay if user doesn't dismiss
  useEffect(() => {
    if (sessionExpired) {
      const timer = setTimeout(() => {
        navigate("/login", { state: { sessionExpired: true } })
      }, 10000) // 10 seconds

      return () => clearTimeout(timer)
    }
  }, [sessionExpired, navigate])

  const handleLoginClick = () => {
    clearSessionExpiredFlag()
    navigate("/login", { state: { sessionExpired: true } })
  }

  const handleDismiss = () => {
    clearSessionExpiredFlag()
  }

  return (
    <AnimatePresence>
      {sessionExpired && (
        <motion.div
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -100 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-50 bg-destructive text-destructive-foreground shadow-lg"
          role="alert"
          aria-live="assertive"
        >
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-sm sm:text-base">
                    Your session has expired
                  </p>
                  <p className="text-sm opacity-90 hidden sm:block">
                    Please log in again to continue using the application
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleLoginClick}
                  variant="secondary"
                  size="sm"
                  className="bg-white text-destructive hover:bg-gray-100"
                >
                  Log In
                </Button>
                <Button
                  onClick={handleDismiss}
                  variant="ghost"
                  size="sm"
                  className="hover:bg-white/10"
                  aria-label="Dismiss"
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
