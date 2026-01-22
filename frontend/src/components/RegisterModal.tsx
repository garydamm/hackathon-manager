import { useState } from "react"
import { Link } from "react-router-dom"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, X, Calendar, Users, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { hackathonService } from "@/services/hackathons"
import { ApiError } from "@/services/api"
import type { Hackathon } from "@/types"

interface RegisterModalProps {
  isOpen: boolean
  onClose: () => void
  hackathon: Hackathon
}

type ModalState = "confirm" | "success" | "error"

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function RegisterModal({ isOpen, onClose, hackathon }: RegisterModalProps) {
  const queryClient = useQueryClient()
  const [modalState, setModalState] = useState<ModalState>("confirm")
  const [error, setError] = useState<string | null>(null)

  const registerMutation = useMutation({
    mutationFn: () => hackathonService.register(hackathon.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hackathon", hackathon.slug] })
      queryClient.invalidateQueries({ queryKey: ["hackathons"] })
      setModalState("success")
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Failed to register. Please try again.")
      }
      setModalState("error")
    },
  })

  const handleConfirm = () => {
    setError(null)
    registerMutation.mutate()
  }

  const handleClose = () => {
    setModalState("confirm")
    setError(null)
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 space-y-6"
              onClick={(e) => e.stopPropagation()}
            >
              {modalState === "confirm" && (
                <>
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Register for {hackathon.name}?</h2>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleClose}
                      className="shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Hackathon Info */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {formatDate(hackathon.startsAt)} - {formatDate(hackathon.endsAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>
                        {hackathon.participantCount ?? 0} participants
                        {hackathon.maxParticipants && ` / ${hackathon.maxParticipants} max`}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={handleClose}>
                      Cancel
                    </Button>
                    <Button onClick={handleConfirm} disabled={registerMutation.isPending}>
                      {registerMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Registering...
                        </>
                      ) : (
                        "Confirm Registration"
                      )}
                    </Button>
                  </div>
                </>
              )}

              {modalState === "success" && (
                <>
                  {/* Success Header */}
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">You're registered!</h2>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleClose}
                      className="shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Success Content */}
                  <div className="flex flex-col items-center text-center space-y-4 py-4">
                    <div className="rounded-full bg-green-100 p-3">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <p className="text-muted-foreground">
                      You can now create or join a team.
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-center gap-3 pt-2">
                    <Button variant="outline" asChild>
                      <Link to={`/hackathons/${hackathon.slug}/teams`}>Browse Teams</Link>
                    </Button>
                    <Button asChild>
                      <Link to={`/hackathons/${hackathon.slug}/teams?create=true`}>
                        Create Team
                      </Link>
                    </Button>
                  </div>
                </>
              )}

              {modalState === "error" && (
                <>
                  {/* Error Header */}
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Registration Failed</h2>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleClose}
                      className="shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Error Content */}
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm"
                  >
                    {error}
                  </motion.div>

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-2">
                    <Button variant="outline" onClick={handleClose}>
                      Close
                    </Button>
                    <Button onClick={() => setModalState("confirm")}>Try Again</Button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
