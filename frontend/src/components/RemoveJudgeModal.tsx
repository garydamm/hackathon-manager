import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, X, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { judgingService } from "@/services/judging"
import { ApiError } from "@/services/api"
import type { JudgeInfo } from "@/types"

interface RemoveJudgeModalProps {
  isOpen: boolean
  onClose: () => void
  judge: JudgeInfo | null
  hackathonId: string
}

export function RemoveJudgeModal({
  isOpen,
  onClose,
  judge,
  hackathonId,
}: RemoveJudgeModalProps) {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const removeMutation = useMutation({
    mutationFn: () => judgingService.removeJudge(hackathonId, judge!.userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["judges", hackathonId] })
      setError(null)
      onClose()
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Failed to remove judge. Please try again.")
      }
    },
  })

  const handleConfirm = () => {
    setError(null)
    removeMutation.mutate()
  }

  const handleClose = () => {
    setError(null)
    onClose()
  }

  if (!judge) return null

  const judgeName = judge.displayName || `${judge.firstName} ${judge.lastName}`

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
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Remove Judge</h2>
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
                <div className="text-sm">
                  <p className="font-medium">
                    Are you sure you want to remove {judgeName} as a judge?
                  </p>
                  <p className="mt-1">
                    This will remove their judge role from this hackathon. Any scores they have
                    submitted will be preserved.
                  </p>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm"
                >
                  {error}
                </motion.div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleConfirm}
                  disabled={removeMutation.isPending}
                >
                  {removeMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Removing...
                    </>
                  ) : (
                    "Remove Judge"
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
