import { useState } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { motion } from "framer-motion"
import {
  Loader2,
  ArrowLeft,
  Calendar,
  Users,
  Globe,
  MapPin,
  Clock,
  Edit,
  Save,
  X,
  UsersRound,
  CheckCircle,
} from "lucide-react"
import { AppLayout } from "@/components/layouts/AppLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RegisterModal } from "@/components/RegisterModal"
import { UnregisterModal } from "@/components/UnregisterModal"
import { hackathonService } from "@/services/hackathons"
import { teamService } from "@/services/teams"
import { ApiError } from "@/services/api"
import type { Hackathon, HackathonStatus } from "@/types"

const updateHackathonSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  rules: z.string().optional(),
  status: z.string(),
  bannerUrl: z.string().optional(),
  logoUrl: z.string().optional(),
  location: z.string().optional(),
  isVirtual: z.boolean(),
  timezone: z.string(),
  startsAt: z.string().min(1, "Start date is required"),
  endsAt: z.string().min(1, "End date is required"),
  registrationOpensAt: z.string().optional(),
  registrationClosesAt: z.string().optional(),
  maxTeamSize: z.number().min(1).max(20),
  minTeamSize: z.number().min(1).max(10),
  maxParticipants: z.string().optional(),
})

type UpdateFormData = z.infer<typeof updateHackathonSchema>

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatDateForInput(dateString: string | null | undefined): string {
  if (!dateString) return ""
  const date = new Date(dateString)
  return date.toISOString().slice(0, 16)
}

function formatStatus(status: HackathonStatus): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function getStatusColor(status: HackathonStatus): string {
  const colors: Record<HackathonStatus, string> = {
    draft: "bg-gray-100 text-gray-700",
    registration_open: "bg-green-100 text-green-700",
    registration_closed: "bg-yellow-100 text-yellow-700",
    in_progress: "bg-blue-100 text-blue-700",
    judging: "bg-purple-100 text-purple-700",
    completed: "bg-gray-100 text-gray-700",
    cancelled: "bg-red-100 text-red-700",
  }
  return colors[status]
}

const STATUS_OPTIONS: { value: HackathonStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "registration_open", label: "Registration Open" },
  { value: "registration_closed", label: "Registration Closed" },
  { value: "in_progress", label: "In Progress" },
  { value: "judging", label: "Judging" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
]

function TeamsSection({ hackathon }: { hackathon: Hackathon }) {
  const { data: teams, isLoading: teamsLoading } = useQuery({
    queryKey: ["teams", hackathon.id],
    queryFn: () => teamService.getTeamsByHackathon(hackathon.id),
  })

  const { data: myTeam, isLoading: myTeamLoading } = useQuery({
    queryKey: ["myTeam", hackathon.id],
    queryFn: () => teamService.getMyTeam(hackathon.id),
  })

  const isRegisteredParticipant = hackathon.userRole === "participant"
  const teamsCount = teams?.length ?? 0

  if (teamsLoading || myTeamLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersRound className="h-5 w-5" />
            Teams
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UsersRound className="h-5 w-5" />
          Teams
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">
          {teamsCount} {teamsCount === 1 ? "team" : "teams"} in this hackathon
        </p>

        {myTeam ? (
          <div className="p-4 rounded-lg bg-muted/50 space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">My Team</p>
              <p className="font-medium">{myTeam.name}</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to={`/hackathons/${hackathon.slug}/teams/${myTeam.id}`}>
                View Team
              </Link>
            </Button>
          </div>
        ) : isRegisteredParticipant ? (
          <Button asChild>
            <Link to={`/hackathons/${hackathon.slug}/teams?create=true`}>
              Create Team
            </Link>
          </Button>
        ) : null}

        <Button asChild variant="outline">
          <Link to={`/hackathons/${hackathon.slug}/teams`}>Browse Teams</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function ViewMode({
  hackathon,
  onRegisterClick,
  onUnregisterClick,
}: {
  hackathon: Hackathon
  onRegisterClick: () => void
  onUnregisterClick: () => void
}) {
  const showTeamsSection =
    hackathon.status === "registration_open" || hackathon.status === "in_progress"

  const isRegistered = hackathon.userRole === "participant"
  const isRegistrationOpen = hackathon.status === "registration_open"
  const isFull =
    hackathon.maxParticipants != null &&
    (hackathon.participantCount ?? 0) >= hackathon.maxParticipants

  const showRegisterButton = isRegistrationOpen && !isRegistered

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        {hackathon.bannerUrl && (
          <img
            src={hackathon.bannerUrl}
            alt={hackathon.name}
            className="w-full h-48 object-cover rounded-xl"
          />
        )}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              {hackathon.logoUrl && (
                <img
                  src={hackathon.logoUrl}
                  alt=""
                  className="w-12 h-12 rounded-lg object-contain"
                />
              )}
              <h1 className="text-3xl font-bold">{hackathon.name}</h1>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                  hackathon.status
                )}`}
              >
                {formatStatus(hackathon.status)}
              </span>
              {hackathon.userRole === "participant" && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                  <CheckCircle className="h-4 w-4" />
                  Registered
                </span>
              )}
            </div>
            {showRegisterButton && (
              <Button onClick={onRegisterClick} disabled={isFull} className="mt-2">
                {isFull ? "Registration Full" : "Register"}
              </Button>
            )}
            {isRegistered && (
              <Button variant="outline" onClick={onUnregisterClick} className="mt-2">
                Unregister
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Info */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Starts</p>
                <p className="font-medium">{formatDate(hackathon.startsAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Ends</p>
                <p className="font-medium">{formatDate(hackathon.endsAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              {hackathon.isVirtual ? (
                <Globe className="h-5 w-5 text-muted-foreground" />
              ) : (
                <MapPin className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-medium">
                  {hackathon.isVirtual ? "Virtual" : hackathon.location || "TBA"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Participants</p>
                <p className="font-medium">
                  {hackathon.participantCount ?? 0}
                  {hackathon.maxParticipants && ` / ${hackathon.maxParticipants}`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      {hackathon.description && (
        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{hackathon.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Rules */}
      {hackathon.rules && (
        <Card>
          <CardHeader>
            <CardTitle>Rules & Guidelines</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{hackathon.rules}</p>
          </CardContent>
        </Card>
      )}

      {/* Team Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Team Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Min Team Size</p>
              <p className="text-lg font-medium">{hackathon.minTeamSize}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Max Team Size</p>
              <p className="text-lg font-medium">{hackathon.maxTeamSize}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Timezone</p>
              <p className="text-lg font-medium">{hackathon.timezone}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Teams Section */}
      {showTeamsSection && <TeamsSection hackathon={hackathon} />}
    </div>
  )
}

function EditMode({
  hackathon,
  onSave,
  onCancel,
  isSaving,
}: {
  hackathon: Hackathon
  onSave: (data: UpdateFormData) => void
  onCancel: () => void
  isSaving: boolean
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UpdateFormData>({
    resolver: zodResolver(updateHackathonSchema),
    defaultValues: {
      name: hackathon.name,
      description: hackathon.description || "",
      rules: hackathon.rules || "",
      status: hackathon.status,
      bannerUrl: hackathon.bannerUrl || "",
      logoUrl: hackathon.logoUrl || "",
      location: hackathon.location || "",
      isVirtual: hackathon.isVirtual,
      timezone: hackathon.timezone,
      startsAt: formatDateForInput(hackathon.startsAt),
      endsAt: formatDateForInput(hackathon.endsAt),
      registrationOpensAt: formatDateForInput(hackathon.registrationOpensAt),
      registrationClosesAt: formatDateForInput(hackathon.registrationClosesAt),
      maxTeamSize: hackathon.maxTeamSize,
      minTeamSize: hackathon.minTeamSize,
      maxParticipants: hackathon.maxParticipants?.toString() || "",
    },
  })

  const isVirtual = watch("isVirtual")

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-8">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register("name")} />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              className="flex h-11 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm"
              {...register("status")}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register("description")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rules">Rules & Guidelines</Label>
            <Textarea id="rules" {...register("rules")} />
          </div>
        </CardContent>
      </Card>

      {/* Date & Time */}
      <Card>
        <CardHeader>
          <CardTitle>Date & Time</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startsAt">Start Date & Time</Label>
              <Input id="startsAt" type="datetime-local" {...register("startsAt")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endsAt">End Date & Time</Label>
              <Input id="endsAt" type="datetime-local" {...register("endsAt")} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="registrationOpensAt">Registration Opens</Label>
              <Input
                id="registrationOpensAt"
                type="datetime-local"
                {...register("registrationOpensAt")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="registrationClosesAt">Registration Closes</Label>
              <Input
                id="registrationClosesAt"
                type="datetime-local"
                {...register("registrationClosesAt")}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Input id="timezone" {...register("timezone")} />
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader>
          <CardTitle>Location</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Virtual Event</Label>
              <p className="text-sm text-muted-foreground">
                Is this an online-only hackathon?
              </p>
            </div>
            <Switch
              checked={isVirtual}
              onCheckedChange={(checked) => setValue("isVirtual", checked)}
            />
          </div>
          {!isVirtual && (
            <div className="space-y-2">
              <Label htmlFor="location">Venue Address</Label>
              <Input id="location" {...register("location")} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Team Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="minTeamSize">Min Team Size</Label>
              <Input
                id="minTeamSize"
                type="number"
                min={1}
                max={10}
                {...register("minTeamSize", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxTeamSize">Max Team Size</Label>
              <Input
                id="maxTeamSize"
                type="number"
                min={1}
                max={20}
                {...register("maxTeamSize", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxParticipants">Max Participants</Label>
              <Input
                id="maxParticipants"
                type="number"
                min={1}
                placeholder="Unlimited"
                {...register("maxParticipants")}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Branding */}
      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input id="logoUrl" type="url" {...register("logoUrl")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bannerUrl">Banner URL</Label>
              <Input id="bannerUrl" type="url" {...register("bannerUrl")} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

export function HackathonDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false)
  const [isUnregisterModalOpen, setIsUnregisterModalOpen] = useState(false)

  const {
    data: hackathon,
    isLoading,
    error: fetchError,
  } = useQuery({
    queryKey: ["hackathon", slug],
    queryFn: () => hackathonService.getBySlug(slug!),
    enabled: !!slug,
  })

  const updateMutation = useMutation({
    mutationFn: (data: UpdateFormData) => {
      const toISOString = (dateStr: string | undefined): string | undefined => {
        if (!dateStr) return undefined
        return new Date(dateStr).toISOString()
      }

      return hackathonService.update(hackathon!.id, {
        ...data,
        status: data.status as HackathonStatus,
        bannerUrl: data.bannerUrl || undefined,
        logoUrl: data.logoUrl || undefined,
        location: data.location || undefined,
        registrationOpensAt: toISOString(data.registrationOpensAt),
        registrationClosesAt: toISOString(data.registrationClosesAt),
        startsAt: toISOString(data.startsAt),
        endsAt: toISOString(data.endsAt),
        maxParticipants: data.maxParticipants ? Number(data.maxParticipants) : undefined,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hackathon", slug] })
      queryClient.invalidateQueries({ queryKey: ["hackathons"] })
      setIsEditing(false)
      setError(null)
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Failed to update hackathon. Please try again.")
      }
    },
  })

  const canEdit = hackathon?.userRole === "organizer" || hackathon?.userRole === "admin"

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    )
  }

  if (fetchError || !hackathon) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-4xl px-4 py-8">
          <div className="text-center py-12">
            <p className="text-destructive">
              {fetchError instanceof ApiError
                ? fetchError.message
                : "Failed to load hackathon."}
            </p>
            <Button className="mt-4" onClick={() => navigate("/")}>
              Go Back
            </Button>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Navigation & Actions */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            {canEdit && !isEditing && (
              <Button onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm"
            >
              {error}
            </motion.div>
          )}

          {isEditing ? (
            <EditMode
              hackathon={hackathon}
              onSave={(data) => updateMutation.mutate(data)}
              onCancel={() => setIsEditing(false)}
              isSaving={updateMutation.isPending}
            />
          ) : (
            <ViewMode
              hackathon={hackathon}
              onRegisterClick={() => setIsRegisterModalOpen(true)}
              onUnregisterClick={() => setIsUnregisterModalOpen(true)}
            />
          )}
        </motion.div>
      </div>

      {/* Register Modal */}
      <RegisterModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        hackathon={hackathon}
      />

      {/* Unregister Modal */}
      <UnregisterModal
        isOpen={isUnregisterModalOpen}
        onClose={() => setIsUnregisterModalOpen(false)}
        hackathon={hackathon}
      />
    </AppLayout>
  )
}
