import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { scheduleService } from "@/services/schedule"
import { ApiError } from "@/services/api"
import type { ScheduleEvent } from "@/types"

const eventSchema = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name is too long"),
  description: z.string().optional(),
  eventType: z.enum(["workshop", "presentation", "meal", "deadline", "ceremony", "networking", "other"]),
  location: z.string().optional(),
  virtualLink: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  startsAt: z.string().min(1, "Start time is required"),
  endsAt: z.string().min(1, "End time is required"),
  isMandatory: z.boolean(),
})

type EventFormData = z.infer<typeof eventSchema>

interface EventFormModalProps {
  isOpen: boolean
  onClose: () => void
  hackathonId: string
  event?: ScheduleEvent | null
}

export function EventFormModal({
  isOpen,
  onClose,
  hackathonId,
  event,
}: EventFormModalProps) {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const isEditing = !!event

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      name: "",
      description: "",
      eventType: "workshop",
      location: "",
      virtualLink: "",
      startsAt: "",
      endsAt: "",
      isMandatory: false,
    },
  })

  const isMandatory = watch("isMandatory")

  useEffect(() => {
    if (isOpen) {
      if (event) {
        // Convert ISO timestamps to datetime-local format (YYYY-MM-DDTHH:mm)
        const startsAtLocal = new Date(event.startsAt).toISOString().slice(0, 16)
        const endsAtLocal = new Date(event.endsAt).toISOString().slice(0, 16)

        reset({
          name: event.name,
          description: event.description || "",
          eventType: event.eventType,
          location: event.location || "",
          virtualLink: event.virtualLink || "",
          startsAt: startsAtLocal,
          endsAt: endsAtLocal,
          isMandatory: event.isMandatory,
        })
      } else {
        reset({
          name: "",
          description: "",
          eventType: "workshop",
          location: "",
          virtualLink: "",
          startsAt: "",
          endsAt: "",
          isMandatory: false,
        })
      }
    }
  }, [isOpen, event, reset])

  const createMutation = useMutation({
    mutationFn: (data: EventFormData) =>
      scheduleService.createEvent({
        hackathonId,
        name: data.name,
        description: data.description || undefined,
        eventType: data.eventType,
        location: data.location || undefined,
        virtualLink: data.virtualLink || undefined,
        startsAt: new Date(data.startsAt).toISOString(),
        endsAt: new Date(data.endsAt).toISOString(),
        isMandatory: data.isMandatory,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule"] })
      reset()
      setError(null)
      onClose()
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Failed to create event. Please try again.")
      }
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: EventFormData) =>
      scheduleService.updateEvent(event!.id, {
        name: data.name,
        description: data.description || undefined,
        eventType: data.eventType,
        location: data.location || undefined,
        virtualLink: data.virtualLink || undefined,
        startsAt: new Date(data.startsAt).toISOString(),
        endsAt: new Date(data.endsAt).toISOString(),
        isMandatory: data.isMandatory,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule"] })
      reset()
      setError(null)
      onClose()
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Failed to update event. Please try again.")
      }
    },
  })

  const onSubmit = (data: EventFormData) => {
    setError(null)
    if (isEditing) {
      updateMutation.mutate(data)
    } else {
      createMutation.mutate(data)
    }
  }

  const handleClose = () => {
    reset()
    setError(null)
    onClose()
  }

  const isPending = createMutation.isPending || updateMutation.isPending

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
                <h2 className="text-xl font-semibold">
                  {isEditing ? "Edit Event" : "Add Event"}
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

              {/* Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="event-name">Name *</Label>
                  <Input
                    id="event-name"
                    placeholder="e.g., Opening Ceremony"
                    {...register("name")}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="event-description">Description</Label>
                  <Textarea
                    id="event-description"
                    placeholder="Describe the event..."
                    {...register("description")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="event-type">Event Type *</Label>
                  <select
                    id="event-type"
                    {...register("eventType")}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="workshop">Workshop</option>
                    <option value="presentation">Presentation</option>
                    <option value="meal">Meal</option>
                    <option value="deadline">Deadline</option>
                    <option value="ceremony">Ceremony</option>
                    <option value="networking">Networking</option>
                    <option value="other">Other</option>
                  </select>
                  {errors.eventType && (
                    <p className="text-sm text-destructive">{errors.eventType.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="event-startsAt">Start Time *</Label>
                    <Input
                      id="event-startsAt"
                      type="datetime-local"
                      {...register("startsAt")}
                    />
                    {errors.startsAt && (
                      <p className="text-sm text-destructive">{errors.startsAt.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="event-endsAt">End Time *</Label>
                    <Input
                      id="event-endsAt"
                      type="datetime-local"
                      {...register("endsAt")}
                    />
                    {errors.endsAt && (
                      <p className="text-sm text-destructive">{errors.endsAt.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="event-location">Location</Label>
                  <Input
                    id="event-location"
                    placeholder="e.g., Main Auditorium"
                    {...register("location")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="event-virtualLink">Virtual Link</Label>
                  <Input
                    id="event-virtualLink"
                    type="url"
                    placeholder="https://zoom.us/j/123456789"
                    {...register("virtualLink")}
                  />
                  {errors.virtualLink && (
                    <p className="text-sm text-destructive">{errors.virtualLink.message}</p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="event-isMandatory"
                    checked={isMandatory}
                    onCheckedChange={(checked) => setValue("isMandatory", checked)}
                  />
                  <Label htmlFor="event-isMandatory" className="cursor-pointer">
                    Mandatory Event
                  </Label>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {isEditing ? "Saving..." : "Creating..."}
                      </>
                    ) : isEditing ? (
                      "Save Changes"
                    ) : (
                      "Add Event"
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
