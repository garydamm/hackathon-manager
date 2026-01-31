import { motion, AnimatePresence } from "framer-motion"
import { Monitor, Loader2, CheckCircle2, XCircle, X } from "lucide-react"
import { AppLayout } from "@/components/layouts/AppLayout"
import { SessionCard } from "@/components/SessionCard"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { authService } from "@/services/auth"
import type { SessionResponse } from "@/types"

type NotificationType = "success" | "error"

interface Notification {
  type: NotificationType
  message: string
}

export function SessionManagementPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [sessions, setSessions] = useState<SessionResponse[]>([])
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null)
  const [notification, setNotification] = useState<Notification | null>(null)

  useEffect(() => {
    loadSessions()
  }, [])

  async function loadSessions() {
    try {
      const sessionData = await authService.listSessions()
      setSessions(sessionData)
    } catch (error) {
      console.error("Failed to load sessions:", error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleRevoke(sessionId: string) {
    setRevokingSessionId(sessionId)
    try {
      await authService.revokeSession(sessionId)
      // Remove session from list
      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
      // Show success notification
      setNotification({
        type: "success",
        message: "Session revoked successfully",
      })
      // Auto-dismiss after 5 seconds
      setTimeout(() => setNotification(null), 5000)
    } catch (error) {
      console.error("Failed to revoke session:", error)
      // Show error notification
      setNotification({
        type: "error",
        message: "Failed to revoke session. Please try again.",
      })
      // Auto-dismiss after 5 seconds
      setTimeout(() => setNotification(null), 5000)
    } finally {
      setRevokingSessionId(null)
    }
  }

  function handleDismissNotification() {
    setNotification(null)
  }

  return (
    <AppLayout>
      {/* Notification banner */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -100 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`fixed top-16 left-0 right-0 z-50 shadow-lg ${
              notification.type === "success"
                ? "bg-green-500 text-green-950"
                : "bg-red-500 text-red-950"
            }`}
            role="alert"
            aria-live="polite"
          >
            <div className="container mx-auto px-4 py-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {notification.type === "success" ? (
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 flex-shrink-0" />
                  )}
                  <p className="font-semibold text-sm sm:text-base">
                    {notification.message}
                  </p>
                </div>
                <Button
                  onClick={handleDismissNotification}
                  variant="ghost"
                  size="sm"
                  className={
                    notification.type === "success"
                      ? "hover:bg-green-600/20"
                      : "hover:bg-red-600/20"
                  }
                  aria-label="Dismiss notification"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <h1 className="text-3xl font-bold">Active Sessions</h1>
          <p className="text-muted-foreground text-lg">
            Manage your active sessions across devices
          </p>
        </motion.div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && sessions.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 px-4 rounded-xl border border-dashed border-border"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Monitor className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No active sessions</h3>
            <p className="text-muted-foreground">
              You'll see your active sessions here once you log in from multiple devices.
            </p>
          </motion.div>
        )}

        {/* Sessions list */}
        {!isLoading && sessions.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onRevoke={handleRevoke}
                isRevoking={revokingSessionId === session.id}
              />
            ))}
          </motion.div>
        )}
      </div>
    </AppLayout>
  )
}
