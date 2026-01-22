import { motion } from "framer-motion"
import { Users } from "lucide-react"
import { Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import type { Team } from "@/types"

interface TeamCardProps {
  team: Team
  hackathonSlug: string
  maxTeamSize: number
  index: number
}

function truncateDescription(description: string | null | undefined, maxLength: number = 100): string {
  if (!description) return ""
  if (description.length <= maxLength) return description
  return description.slice(0, maxLength).trim() + "..."
}

export function TeamCard({ team, hackathonSlug, maxTeamSize, index }: TeamCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
    >
      <Link to={`/hackathons/${hackathonSlug}/teams/${team.id}`}>
        <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer">
          {/* Header with team initial */}
          <div className="relative h-24 bg-gradient-to-br from-primary/20 via-primary/10 to-background overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl font-bold text-primary">
                  {team.name.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>

            {/* Open/Closed badge */}
            <div className="absolute top-3 right-3">
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  team.isOpen
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {team.isOpen ? "Open" : "Closed"}
              </span>
            </div>
          </div>

          <CardHeader className="pb-2">
            <CardTitle className="text-lg group-hover:text-primary transition-colors">
              {team.name}
            </CardTitle>
            {team.description && (
              <CardDescription className="line-clamp-2">
                {truncateDescription(team.description)}
              </CardDescription>
            )}
          </CardHeader>

          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{team.memberCount} / {maxTeamSize} members</span>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  )
}
