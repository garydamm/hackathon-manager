import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Loader2, Plus, Pencil, Trash2, Calendar, Users, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EventFormModal } from "@/components/EventFormModal"
import { DeleteEventModal } from "@/components/DeleteEventModal"
import { AttendanceModal } from "@/components/AttendanceModal"
import { scheduleService } from "@/services/schedule"
import type { ScheduleEvent } from "@/types"

interface ScheduleManagementSectionProps {
  hackathonId: string
}

export function ScheduleManagementSection({ hackathonId }: ScheduleManagementSectionProps) {
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null)

  const { data: events, isLoading } = useQuery({
    queryKey: ["schedule", hackathonId],
    queryFn: () => scheduleService.getSchedule(hackathonId),
  })

  const handleAddClick = () => {
    setSelectedEvent(null)
    setIsFormModalOpen(true)
  }

  const handleEditClick = (item: ScheduleEvent) => {
    setSelectedEvent(item)
    setIsFormModalOpen(true)
  }

  const handleDeleteClick = (item: ScheduleEvent) => {
    setSelectedEvent(item)
    setIsDeleteModalOpen(true)
  }

  const handleAttendanceClick = (item: ScheduleEvent) => {
    setSelectedEvent(item)
    setIsAttendanceModalOpen(true)
  }

  const handleFormModalClose = () => {
    setIsFormModalOpen(false)
    setSelectedEvent(null)
  }

  const handleDeleteModalClose = () => {
    setIsDeleteModalOpen(false)
    setSelectedEvent(null)
  }

  const handleAttendanceModalClose = () => {
    setIsAttendanceModalOpen(false)
    setSelectedEvent(null)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule & Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const eventsList = events ?? []

  const eventTypeBadgeColors: Record<string, string> = {
    workshop: "bg-purple-100 text-purple-700 border-purple-200",
    presentation: "bg-blue-100 text-blue-700 border-blue-200",
    meal: "bg-orange-100 text-orange-700 border-orange-200",
    deadline: "bg-red-100 text-red-700 border-red-200",
    ceremony: "bg-yellow-100 text-yellow-700 border-yellow-200",
    networking: "bg-green-100 text-green-700 border-green-200",
    other: "bg-gray-100 text-gray-700 border-gray-200",
  }

  const formatEventTime = (startsAt: string, endsAt: string) => {
    const start = new Date(startsAt)
    const end = new Date(endsAt)
    const startTime = start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    const endTime = end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    const date = start.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    return `${date}, ${startTime} - ${endTime}`
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Schedule & Events
            </CardTitle>
            <Button size="sm" onClick={handleAddClick}>
              <Plus className="h-4 w-4 mr-2" />
              Add Event
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {eventsList.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No events scheduled yet. Add events to create the hackathon agenda.
            </p>
          ) : (
            <div className="space-y-3">
              {eventsList.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between p-4 rounded-lg border border-border"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium">{item.name}</h4>
                      <Badge className={eventTypeBadgeColors[item.eventType] || eventTypeBadgeColors.other}>
                        {item.eventType}
                      </Badge>
                      {item.isMandatory && (
                        <Badge className="bg-red-100 text-red-700 border-red-200">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Required
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatEventTime(item.startsAt, item.endsAt)}
                    </p>
                    {item.location && (
                      <p className="text-sm text-muted-foreground">
                        Location: {item.location}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      RSVPs: {item.attendingCount} attending
                      {item.maybeCount > 0 && `, ${item.maybeCount} maybe`}
                      {item.notAttendingCount > 0 && `, ${item.notAttendingCount} not attending`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleAttendanceClick(item)}
                      title="Track attendance"
                    >
                      <Users className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditClick(item)}
                      title="Edit event"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(item)}
                      title="Delete event"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Event Modal */}
      <EventFormModal
        isOpen={isFormModalOpen}
        onClose={handleFormModalClose}
        hackathonId={hackathonId}
        event={selectedEvent}
      />

      {/* Delete Confirmation Modal */}
      <DeleteEventModal
        isOpen={isDeleteModalOpen}
        onClose={handleDeleteModalClose}
        event={selectedEvent}
      />

      {/* Attendance Tracking Modal */}
      <AttendanceModal
        isOpen={isAttendanceModalOpen}
        onClose={handleAttendanceModalClose}
        event={selectedEvent}
      />
    </>
  )
}
