import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, X, AlertTriangle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { hackathonService } from "@/services/hackathons"
import { ApiError } from "@/services/api"
import type { Hackathon } from "@/types"

interface UnregisterModalProps {
  isOpen: boolean
  onClose: () => void
  hackathon: Hackathon
}

type ModalState = "confirm" | "success" | "error"

export function UnregisterModal({ isOpen, onClose, hackathon }: UnregisterModalProps) {
  const queryClient = useQueryClient()
  const [modalState, setModalState] = useState<ModalState>("confirm")
  const [error, setError] = useState<string | null>(null)

  const unregisterMutation = useMutation({
    mutationFn: () => hackathonService.unregister(hackathon.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hackathon", hackathon.slug] })
      queryClient.invalidateQueries({ queryKey: ["hackathons"] })
      setModalState("success")
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Failed to unregister. Please try again.")
      }
      setModalState("error")
    },
  })

  const handleConfirm = () => {
    setError(null)
    unregisterMutation.mutate()
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
                    <h2 className="text-xl font-semibold">Unregister from {hackathon.name}?</h2>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleClose}
                      className="shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Warning */}
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
                    <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                    <p className="text-sm">
                      You will be removed from any team you've joined.
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={handleClose}>
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleConfirm}
                      disabled={unregisterMutation.isPending}
                    >
                      {unregisterMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Unregistering...
                        </>
                      ) : (
                        "Confirm Unregister"
                      )}
                    </Button>
                  </div>
                </>
              )}

              {modalState === "success" && (
                <>
                  {/* Success Header */}
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Unregistered</h2>
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
                      You have been unregistered from this hackathon.
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-center pt-2">
                    <Button onClick={handleClose}>Close</Button>
                  </div>
                </>
              )}

              {modalState === "error" && (
                <>
                  {/* Error Header */}
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Unregister Failed</h2>
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
