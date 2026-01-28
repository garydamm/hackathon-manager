import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, X, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { scheduleService } from "@/services/schedule"
import { ApiError } from "@/services/api"
import type { ScheduleEvent } from "@/types"

interface AttendanceModalProps {
  isOpen: boolean
  onClose: () => void
  event: ScheduleEvent | null
}

export function AttendanceModal({
  isOpen,
  onClose,
  event,
}: AttendanceModalProps) {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())

  // Fetch attendees when modal opens
  const { data: attendees = [], isLoading } = useQuery({
    queryKey: ["eventAttendees", event?.id],
    queryFn: () => scheduleService.getEventAttendees(event!.id),
    enabled: isOpen && !!event,
    staleTime: 0, // Always fetch fresh data
  })

  // Reset selection when modal closes or data changes
  useEffect(() => {
    if (!isOpen) {
      setSelectedUserIds(new Set())
      setError(null)
    }
  }, [isOpen])

  const markAttendanceMutation = useMutation({
    mutationFn: ({ userId, attended }: { userId: string; attended: boolean }) =>
      scheduleService.markAttendance(event!.id, { userId, attended }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventAttendees", event?.id] })
      queryClient.invalidateQueries({ queryKey: ["schedule"] })
      setError(null)
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Failed to mark attendance. Please try again.")
      }
    },
  })

  const bulkMarkAttendanceMutation = useMutation({
    mutationFn: ({ userIds, attended }: { userIds: string[]; attended: boolean }) =>
      scheduleService.bulkMarkAttendance(event!.id, { userIds, attended }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventAttendees", event?.id] })
      queryClient.invalidateQueries({ queryKey: ["schedule"] })
      setSelectedUserIds(new Set())
      setError(null)
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Failed to mark attendance. Please try again.")
      }
    },
  })

  const handleToggleAttendee = (userId: string) => {
    const newSelected = new Set(selectedUserIds)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedUserIds(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedUserIds.size === attendees.length) {
      setSelectedUserIds(new Set())
    } else {
      setSelectedUserIds(new Set(attendees.map((a) => a.userId)))
    }
  }

  const handleMarkPresent = (userId: string) => {
    setError(null)
    markAttendanceMutation.mutate({ userId, attended: true })
  }

  const handleMarkAbsent = (userId: string) => {
    setError(null)
    markAttendanceMutation.mutate({ userId, attended: false })
  }

  const handleBulkMarkPresent = () => {
    setError(null)
    bulkMarkAttendanceMutation.mutate({
      userIds: Array.from(selectedUserIds),
      attended: true,
    })
  }

  const handleBulkMarkAbsent = () => {
    setError(null)
    bulkMarkAttendanceMutation.mutate({
      userIds: Array.from(selectedUserIds),
      attended: false,
    })
  }

  const handleClose = () => {
    setError(null)
    setSelectedUserIds(new Set())
    onClose()
  }

  if (!event) return null

  const presentCount = attendees.filter((a) => a.attended).length
  const allSelected = selectedUserIds.size === attendees.length && attendees.length > 0
  const someSelected = selectedUserIds.size > 0

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
              className="bg-background rounded-xl shadow-xl w-full max-w-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">Event Attendance</h2>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Event name and count */}
              <div className="space-y-2">
                <p className="text-muted-foreground">
                  <span className="font-semibold text-foreground">{event.name}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {presentCount} / {attendees.length} present
                </p>
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

              {/* Bulk actions */}
              {someSelected && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground flex-1">
                    {selectedUserIds.size} selected
                  </p>
                  <Button
                    size="sm"
                    onClick={handleBulkMarkPresent}
                    disabled={bulkMarkAttendanceMutation.isPending}
                  >
                    {bulkMarkAttendanceMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Mark Present"
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBulkMarkAbsent}
                    disabled={bulkMarkAttendanceMutation.isPending}
                  >
                    {bulkMarkAttendanceMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Mark Absent"
                    )}
                  </Button>
                </div>
              )}

              {/* Attendee list */}
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : attendees.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    No attendees have RSVP'd to this event yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Select All */}
                  <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={handleSelectAll}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="font-medium text-sm">Select All</span>
                  </div>

                  {/* Attendee rows */}
                  {attendees.map((attendee) => (
                    <div
                      key={attendee.id}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedUserIds.has(attendee.userId)}
                        onChange={() => handleToggleAttendee(attendee.userId)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <div className="flex-1">
                        <p className="font-medium">
                          {attendee.firstName} {attendee.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {attendee.email}
                        </p>
                      </div>
                      {attendee.rsvpStatus && (
                        <Badge
                          className={
                            attendee.rsvpStatus === "attending"
                              ? "bg-green-100 text-green-700 border-green-200"
                              : attendee.rsvpStatus === "maybe"
                              ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                              : "bg-gray-100 text-gray-700 border-gray-200"
                          }
                        >
                          {attendee.rsvpStatus === "attending"
                            ? "Attending"
                            : attendee.rsvpStatus === "maybe"
                            ? "Maybe"
                            : "Not Attending"}
                        </Badge>
                      )}
                      {attendee.attended ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkAbsent(attendee.userId)}
                          disabled={markAttendanceMutation.isPending}
                          className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                        >
                          Present
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkPresent(attendee.userId)}
                          disabled={markAttendanceMutation.isPending}
                        >
                          Absent
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end pt-2">
                <Button variant="outline" onClick={handleClose}>
                  Close
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
