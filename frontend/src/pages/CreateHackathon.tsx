import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import {
  Loader2,
  ArrowLeft,
  Calendar,
  Users,
  Globe,
  MapPin,
  FileText,
  Image,
} from "lucide-react"
import { AppLayout } from "@/components/layouts/AppLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { hackathonService } from "@/services/hackathons"
import { ApiError } from "@/services/api"

const createHackathonSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(50, "Slug is too long")
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  description: z.string().optional(),
  rules: z.string().optional(),
  bannerUrl: z.string().optional(),
  logoUrl: z.string().optional(),
  location: z.string().optional(),
  isVirtual: z.boolean(),
  publishImmediately: z.boolean(),
  timezone: z.string(),
  startsAt: z.string().min(1, "Start date is required"),
  endsAt: z.string().min(1, "End date is required"),
  registrationOpensAt: z.string().optional(),
  registrationClosesAt: z.string().optional(),
  maxTeamSize: z.number().min(1).max(20),
  minTeamSize: z.number().min(1).max(10),
  maxParticipants: z.string().optional(),
}).refine((data) => {
  const start = new Date(data.startsAt)
  const end = new Date(data.endsAt)
  return end > start
}, {
  message: "End date must be after start date",
  path: ["endsAt"],
})

type CreateHackathonFormData = z.infer<typeof createHackathonSchema>

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50)
}

export function CreateHackathonPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateHackathonFormData>({
    resolver: zodResolver(createHackathonSchema),
    defaultValues: {
      isVirtual: false,
      publishImmediately: true,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      maxTeamSize: 5,
      minTeamSize: 1,
    },
  })

  const isVirtual = watch("isVirtual")
  const publishImmediately = watch("publishImmediately")

  const createMutation = useMutation({
    mutationFn: hackathonService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hackathons"] })
      navigate("/")
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Failed to create hackathon. Please try again.")
      }
    },
  })

  const toISOString = (dateStr: string | undefined): string | undefined => {
    if (!dateStr) return undefined
    return new Date(dateStr).toISOString()
  }

  const onSubmit = (data: CreateHackathonFormData) => {
    setError(null)

    const { publishImmediately: shouldPublish, ...rest } = data

    const payload = {
      ...rest,
      status: shouldPublish ? "registration_open" as const : undefined,
      bannerUrl: data.bannerUrl || undefined,
      logoUrl: data.logoUrl || undefined,
      registrationOpensAt: toISOString(data.registrationOpensAt),
      registrationClosesAt: toISOString(data.registrationClosesAt),
      maxParticipants: data.maxParticipants ? Number(data.maxParticipants) : undefined,
      startsAt: new Date(data.startsAt).toISOString(),
      endsAt: new Date(data.endsAt).toISOString(),
    }

    createMutation.mutate(payload)
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value
    setValue("name", newName)
    setValue("slug", generateSlug(newName))
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Create Hackathon</h1>
              <p className="text-muted-foreground">
                Set up a new hackathon for participants to join
              </p>
            </div>
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

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Basic Information
                </CardTitle>
                <CardDescription>
                  The essentials for your hackathon
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Hackathon Name *</Label>
                    <Input
                      id="name"
                      placeholder="My Awesome Hackathon"
                      {...register("name")}
                      onChange={handleNameChange}
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">{errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="slug">URL Slug *</Label>
                    <Input
                      id="slug"
                      placeholder="my-awesome-hackathon"
                      {...register("slug")}
                    />
                    {errors.slug && (
                      <p className="text-sm text-destructive">{errors.slug.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what your hackathon is about, the theme, goals, and what participants can expect..."
                    {...register("description")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rules">Rules & Guidelines</Label>
                  <Textarea
                    id="rules"
                    placeholder="List the rules, judging criteria, and any important guidelines for participants..."
                    {...register("rules")}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div className="space-y-0.5">
                    <Label>Open Registration Immediately</Label>
                    <p className="text-sm text-muted-foreground">
                      {publishImmediately
                        ? "Participants can register as soon as you create this hackathon"
                        : "The hackathon will be saved as a draft"}
                    </p>
                  </div>
                  <Switch
                    checked={publishImmediately}
                    onCheckedChange={(checked) => setValue("publishImmediately", checked)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Date & Time */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Date & Time
                </CardTitle>
                <CardDescription>
                  When does the hackathon take place?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="startsAt">Start Date & Time *</Label>
                    <Input
                      id="startsAt"
                      type="datetime-local"
                      {...register("startsAt")}
                    />
                    {errors.startsAt && (
                      <p className="text-sm text-destructive">{errors.startsAt.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endsAt">End Date & Time *</Label>
                    <Input
                      id="endsAt"
                      type="datetime-local"
                      {...register("endsAt")}
                    />
                    {errors.endsAt && (
                      <p className="text-sm text-destructive">{errors.endsAt.message}</p>
                    )}
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
                  <Input
                    id="timezone"
                    placeholder="UTC"
                    {...register("timezone")}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Location */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Location
                </CardTitle>
                <CardDescription>
                  Where will the hackathon take place?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
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
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    <Label htmlFor="location">Venue Address</Label>
                    <Input
                      id="location"
                      placeholder="123 Innovation Way, San Francisco, CA"
                      {...register("location")}
                    />
                  </motion.div>
                )}

                {isVirtual && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 text-sm text-muted-foreground bg-muted p-3 rounded-lg"
                  >
                    <Globe className="h-4 w-4" />
                    <span>This hackathon will be accessible online from anywhere</span>
                  </motion.div>
                )}
              </CardContent>
            </Card>

            {/* Team Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Settings
                </CardTitle>
                <CardDescription>
                  Configure team size limits and participant caps
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                <CardTitle className="flex items-center gap-2">
                  <Image className="h-5 w-5" />
                  Branding
                </CardTitle>
                <CardDescription>
                  Add visual elements to make your hackathon stand out
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="logoUrl">Logo URL</Label>
                    <Input
                      id="logoUrl"
                      type="url"
                      placeholder="https://example.com/logo.png"
                      {...register("logoUrl")}
                    />
                    {errors.logoUrl && (
                      <p className="text-sm text-destructive">{errors.logoUrl.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bannerUrl">Banner URL</Label>
                    <Input
                      id="bannerUrl"
                      type="url"
                      placeholder="https://example.com/banner.png"
                      {...register("bannerUrl")}
                    />
                    {errors.bannerUrl && (
                      <p className="text-sm text-destructive">{errors.bannerUrl.message}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
              >
                Cancel
              </Button>
              <Button type="submit" size="lg" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Hackathon"
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AppLayout>
  )
}
