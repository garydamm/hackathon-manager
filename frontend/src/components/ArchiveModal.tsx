import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, X, Archive, CheckCircle, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { hackathonService } from "@/services/hackathons"
import { ApiError } from "@/services/api"
import type { Hackathon } from "@/types"

interface ArchiveModalProps {
  isOpen: boolean
  onClose: () => void
  hackathon: Hackathon
  mode: "archive" | "unarchive"
}

type ModalState = "confirm" | "success" | "error"

export function ArchiveModal({ isOpen, onClose, hackathon, mode }: ArchiveModalProps) {
  const queryClient = useQueryClient()
  const [modalState, setModalState] = useState<ModalState>("confirm")
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => {
      return mode === "archive"
        ? hackathonService.archive(hackathon.id)
        : hackathonService.unarchive(hackathon.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hackathon", hackathon.slug] })
      queryClient.invalidateQueries({ queryKey: ["hackathons"] })
      setModalState("success")
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        // Handle authentication errors specifically
        if (err.status === 401) {
          setError("Your session has expired. Please log in again to continue.")
        } else {
          setError(err.message)
        }
      } else {
        setError(`Failed to ${mode} hackathon. Please try again.`)
      }
      setModalState("error")
    },
  })

  const handleConfirm = () => {
    setError(null)
    mutation.mutate()
  }

  const handleClose = () => {
    setModalState("confirm")
    setError(null)
    onClose()
  }

  const isArchive = mode === "archive"

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
                    <h2 className="text-xl font-semibold">
                      {isArchive ? "Archive" : "Unarchive"} {hackathon.name}?
                    </h2>
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
                  <div className={`flex items-start gap-3 p-4 rounded-lg ${isArchive ? "bg-amber-50 border border-amber-200" : "bg-blue-50 border border-blue-200"}`}>
                    {isArchive ? (
                      <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    ) : (
                      <Archive className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-2 text-sm">
                      {isArchive ? (
                        <>
                          <p className="font-medium text-amber-900">
                            This will hide the hackathon from the dashboard
                          </p>
                          <ul className="list-disc list-inside space-y-1 text-amber-700">
                            <li>The hackathon will be removed from the public dashboard</li>
                            <li>It will still be accessible via direct URL for authenticated users</li>
                            <li>No new registrations or submissions will be allowed</li>
                            <li>All existing data will be preserved</li>
                          </ul>
                        </>
                      ) : (
                        <>
                          <p className="font-medium text-blue-900">
                            This will restore the hackathon to the dashboard
                          </p>
                          <ul className="list-disc list-inside space-y-1 text-blue-700">
                            <li>The hackathon will reappear on the public dashboard</li>
                            <li>Registrations and submissions will be allowed again</li>
                            <li>All existing data will remain intact</li>
                          </ul>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={handleClose}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleConfirm}
                      disabled={mutation.isPending}
                      variant={isArchive ? "destructive" : "default"}
                    >
                      {mutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {isArchive ? "Archiving..." : "Unarchiving..."}
                        </>
                      ) : (
                        <>
                          {isArchive ? "Archive Hackathon" : "Unarchive Hackathon"}
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}

              {modalState === "success" && (
                <>
                  {/* Success Header */}
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">
                      {isArchive ? "Hackathon Archived" : "Hackathon Unarchived"}
                    </h2>
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
                      {isArchive
                        ? "The hackathon has been successfully archived and removed from the dashboard."
                        : "The hackathon has been successfully unarchived and restored to the dashboard."}
                    </p>
                  </div>

                  {/* Action Button */}
                  <div className="flex justify-center pt-2">
                    <Button onClick={handleClose}>Close</Button>
                  </div>
                </>
              )}

              {modalState === "error" && (
                <>
                  {/* Error Header */}
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">
                      {isArchive ? "Archive" : "Unarchive"} Failed
                    </h2>
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
