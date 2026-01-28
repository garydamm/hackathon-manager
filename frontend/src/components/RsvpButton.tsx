import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Check, HelpCircle, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { scheduleService } from "@/services/schedule"
import type { RsvpStatus } from "@/types"

interface RsvpButtonProps {
  eventId: string
  userRsvpStatus?: string | null
}

export function RsvpButton({ eventId, userRsvpStatus }: RsvpButtonProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const rsvpMutation = useMutation({
    mutationFn: ({ status }: { status: RsvpStatus }) =>
      userRsvpStatus
        ? scheduleService.updateRsvp(eventId, { rsvpStatus: status })
        : scheduleService.rsvpToEvent(eventId, { rsvpStatus: status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule"] })
      setOpen(false)
    },
  })

  const removeRsvpMutation = useMutation({
    mutationFn: () => scheduleService.removeRsvp(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule"] })
      setOpen(false)
    },
  })

  const handleRsvp = (status: RsvpStatus) => {
    rsvpMutation.mutate({ status })
  }

  const handleRemove = () => {
    removeRsvpMutation.mutate()
  }

  const isLoading = rsvpMutation.isPending || removeRsvpMutation.isPending

  const getRsvpBadge = () => {
    if (!userRsvpStatus) return null

    const configs: Record<string, { icon: typeof Check; color: string; label: string }> = {
      attending: {
        icon: Check,
        color: "bg-green-100 text-green-700 border-green-200",
        label: "Attending",
      },
      maybe: {
        icon: HelpCircle,
        color: "bg-yellow-100 text-yellow-700 border-yellow-200",
        label: "Maybe",
      },
      not_attending: {
        icon: X,
        color: "bg-gray-100 text-gray-700 border-gray-200",
        label: "Not Attending",
      },
    }

    const config = configs[userRsvpStatus]
    if (!config) return null

    const Icon = config.icon

    return (
      <Badge className={`${config.color} border gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant={userRsvpStatus ? "ghost" : "outline"}
          size="sm"
          disabled={isLoading}
          className="gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : userRsvpStatus ? (
            getRsvpBadge()
          ) : (
            "RSVP"
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={() => handleRsvp("attending")}
          disabled={isLoading}
          className="cursor-pointer gap-2"
        >
          <Check className="h-4 w-4 text-green-600" />
          <span>Attending</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleRsvp("maybe")}
          disabled={isLoading}
          className="cursor-pointer gap-2"
        >
          <HelpCircle className="h-4 w-4 text-yellow-600" />
          <span>Maybe</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleRsvp("not_attending")}
          disabled={isLoading}
          className="cursor-pointer gap-2"
        >
          <X className="h-4 w-4 text-gray-600" />
          <span>Not Attending</span>
        </DropdownMenuItem>
        {userRsvpStatus && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleRemove}
              disabled={isLoading}
              className="cursor-pointer text-red-600 focus:text-red-600"
            >
              Remove RSVP
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
