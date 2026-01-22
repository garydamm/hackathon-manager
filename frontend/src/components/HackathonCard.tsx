import { useState } from "react"
import { motion } from "framer-motion"
import { Calendar, MapPin, Users, Globe, Clock, CheckCircle } from "lucide-react"
import { Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RegisterModal } from "@/components/RegisterModal"
import type { Hackathon, HackathonStatus } from "@/types"

interface HackathonCardProps {
  hackathon: Hackathon
  index: number
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

function formatStatus(status: HackathonStatus): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function getTimeUntil(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = date.getTime() - now.getTime()

  if (diff < 0) return "Started"

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days > 30) {
    const months = Math.floor(days / 30)
    return `in ${months} month${months > 1 ? "s" : ""}`
  }
  if (days > 0) return `in ${days} day${days > 1 ? "s" : ""}`

  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours > 0) return `in ${hours} hour${hours > 1 ? "s" : ""}`

  const minutes = Math.floor(diff / (1000 * 60))
  return `in ${minutes} minute${minutes > 1 ? "s" : ""}`
}

export function HackathonCard({ hackathon, index }: HackathonCardProps) {
  const [showRegisterModal, setShowRegisterModal] = useState(false)

  const isRegistered = hackathon.userRole === "participant"
  const isRegistrationOpen = hackathon.status === "registration_open"
  const isFull = hackathon.maxParticipants != null && (hackathon.participantCount ?? 0) >= hackathon.maxParticipants

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
    >
      <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
        {/* Banner/Image */}
        <div className="relative h-40 bg-gradient-to-br from-primary/20 via-primary/10 to-background overflow-hidden">
          {hackathon.bannerUrl ? (
            <img
              src={hackathon.bannerUrl}
              alt={hackathon.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                {hackathon.logoUrl ? (
                  <img
                    src={hackathon.logoUrl}
                    alt={hackathon.name}
                    className="w-12 h-12 object-contain"
                  />
                ) : (
                  <span className="text-3xl font-bold text-primary">
                    {hackathon.name.charAt(0)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Status badges */}
          <div className="absolute top-3 right-3 flex items-center gap-2">
            {isRegistered && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                <CheckCircle className="h-3 w-3" />
                Registered
              </span>
            )}
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                hackathon.status
              )}`}
            >
              {formatStatus(hackathon.status)}
            </span>
          </div>
        </div>

        <CardHeader className="pb-2">
          <CardTitle className="text-xl group-hover:text-primary transition-colors">
            {hackathon.name}
          </CardTitle>
          {hackathon.description && (
            <CardDescription className="line-clamp-2">
              {hackathon.description}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(hackathon.startsAt)}</span>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{getTimeUntil(hackathon.startsAt)}</span>
            </div>

            <div className="flex items-center gap-2">
              {hackathon.isVirtual ? (
                <>
                  <Globe className="h-4 w-4" />
                  <span>Virtual</span>
                </>
              ) : (
                <>
                  <MapPin className="h-4 w-4" />
                  <span className="truncate">{hackathon.location || "TBA"}</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>
                {hackathon.participantCount ?? 0}
                {hackathon.maxParticipants && ` / ${hackathon.maxParticipants}`}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button className="flex-1" variant="outline" asChild>
              <Link to={`/hackathons/${hackathon.slug}`}>View Details</Link>
            </Button>
            {isRegistrationOpen && !isRegistered && (
              <Button
                className="flex-1"
                disabled={isFull}
                title={isFull ? "This hackathon is at maximum capacity" : undefined}
                onClick={(e) => {
                  e.preventDefault()
                  setShowRegisterModal(true)
                }}
              >
                {isFull ? "Full" : "Register"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <RegisterModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        hackathon={hackathon}
      />
    </motion.div>
  )
}
