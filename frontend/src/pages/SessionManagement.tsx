import { motion } from "framer-motion"
import { Monitor, Loader2 } from "lucide-react"
import { AppLayout } from "@/components/layouts/AppLayout"
import { SessionCard } from "@/components/SessionCard"
import { useEffect, useState } from "react"
import { authService } from "@/services/auth"
import type { SessionResponse } from "@/types"

export function SessionManagementPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [sessions, setSessions] = useState<SessionResponse[]>([])

  useEffect(() => {
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

    loadSessions()
  }, [])

  return (
    <AppLayout>
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
              <SessionCard key={session.id} session={session} />
            ))}
          </motion.div>
        )}
      </div>
    </AppLayout>
  )
}
