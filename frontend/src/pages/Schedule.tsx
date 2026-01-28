import { Link, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Calendar, MapPin, Clock, Video, AlertCircle, Users } from "lucide-react"
import { AppLayout } from "@/components/layouts/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RsvpButton } from "@/components/RsvpButton"
import { hackathonService } from "@/services/hackathons"
import { scheduleService } from "@/services/schedule"
import type { ScheduleEvent, EventType } from "@/types"

interface GroupedEvents {
  [date: string]: ScheduleEvent[]
}

function groupEventsByDay(events: ScheduleEvent[]): GroupedEvents {
  return events.reduce((acc, event) => {
    const date = new Date(event.startsAt).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(event)
    return acc
  }, {} as GroupedEvents)
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })
}

function getEventTypeBadgeColor(eventType: EventType): string {
  const colors: Record<EventType, string> = {
    workshop: "bg-purple-100 text-purple-700 border-purple-200",
    presentation: "bg-blue-100 text-blue-700 border-blue-200",
    meal: "bg-orange-100 text-orange-700 border-orange-200",
    deadline: "bg-red-100 text-red-700 border-red-200",
    ceremony: "bg-yellow-100 text-yellow-700 border-yellow-200",
    networking: "bg-green-100 text-green-700 border-green-200",
    other: "bg-gray-100 text-gray-700 border-gray-200",
  }
  return colors[eventType] || colors.other
}

function formatEventType(eventType: EventType): string {
  return eventType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

interface EventCardProps {
  event: ScheduleEvent
}

function EventCard({ event }: EventCardProps) {
  const totalRsvps = event.attendingCount + event.maybeCount + event.notAttendingCount

  return (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-xl">{event.name}</CardTitle>
              {event.isMandatory && (
                <Badge className="bg-red-100 text-red-700 border-red-200 border gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Required
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`border ${getEventTypeBadgeColor(event.eventType)}`}>
                {formatEventType(event.eventType)}
              </Badge>
            </div>
          </div>
          <RsvpButton eventId={event.id} userRsvpStatus={event.userRsvpStatus} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {event.description && (
          <p className="text-gray-600 text-sm">{event.description}</p>
        )}

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="h-4 w-4" />
            <span>
              {formatTime(event.startsAt)} - {formatTime(event.endsAt)}
            </span>
          </div>

          {event.location && (
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin className="h-4 w-4" />
              <span>{event.location}</span>
            </div>
          )}

          {event.virtualLink && (
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-blue-600" />
              <a
                href={event.virtualLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Join Virtual Meeting
              </a>
            </div>
          )}

          {totalRsvps > 0 && (
            <div className="flex items-center gap-2 text-gray-600">
              <Users className="h-4 w-4" />
              <span>
                {event.attendingCount} attending
                {event.maybeCount > 0 && `, ${event.maybeCount} maybe`}
                {event.notAttendingCount > 0 && `, ${event.notAttendingCount} not attending`}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function SchedulePage() {
  const { slug } = useParams<{ slug: string }>()

  const { data: hackathon, isLoading: hackathonLoading } = useQuery({
    queryKey: ["hackathon", slug],
    queryFn: () => hackathonService.getBySlug(slug!),
    enabled: !!slug,
  })

  const { data: events = [], isLoading: scheduleLoading } = useQuery({
    queryKey: ["schedule", hackathon?.id],
    queryFn: () => scheduleService.getSchedule(hackathon!.id),
    enabled: !!hackathon?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const isLoading = hackathonLoading || scheduleLoading
  const groupedEvents = groupEventsByDay(events)
  const hasEvents = events.length > 0

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link to={`/hackathons/${slug}`} className="inline-flex items-center text-blue-600 hover:underline mb-4">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Hackathon
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold">Schedule</h1>
          </div>
          {hackathon && (
            <p className="text-gray-600">{hackathon.name}</p>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading schedule...</p>
          </div>
        ) : !hasEvents ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No events scheduled yet</p>
              <p className="text-gray-400 text-sm mt-2">
                Check back later for the hackathon schedule
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedEvents).map(([date, dayEvents]) => (
              <div key={date}>
                <h2 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">
                  {date}
                </h2>
                <div>
                  {dayEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
