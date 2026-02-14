import { motion } from "framer-motion"
import { Users } from "lucide-react"
import { Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import type { Team } from "@/types"

interface TeamThumbnailProps {
  team: Team
  hackathonSlug: string
  maxTeamSize?: number
  index: number
  variant: "detailed" | "compact"
}

function getInitial(name: string): string {
  return name.charAt(0).toUpperCase()
}

function getMemberInitial(member: Team["members"] extends (infer T)[] | null | undefined ? T : never): string {
  if (!member) return "?"
  const user = member.user
  if (user.displayName) return user.displayName.charAt(0).toUpperCase()
  if (user.firstName) return user.firstName.charAt(0).toUpperCase()
  return "?"
}

export function TeamThumbnail({ team, hackathonSlug, maxTeamSize, index, variant }: TeamThumbnailProps) {
  if (variant === "compact") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.1 }}
      >
        <Link to={`/hackathons/${hackathonSlug}/teams/${team.id}`}>
          <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer">
            <div className="flex items-center gap-3 p-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0">
                <span className="text-lg font-bold text-primary">
                  {getInitial(team.name)}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                  {team.name}
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span>{team.memberCount} members</span>
                </div>
              </div>
            </div>
          </Card>
        </Link>
      </motion.div>
    )
  }

  // Detailed variant
  const members = team.members ?? []
  const visibleMembers = members.slice(0, 5)
  const overflowCount = members.length - 5

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
                  {getInitial(team.name)}
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
                {team.description}
              </CardDescription>
            )}
          </CardHeader>

          <CardContent className="space-y-3">
            {/* Member count */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>
                {maxTeamSize
                  ? `${team.memberCount} / ${maxTeamSize} members`
                  : `${team.memberCount} members`}
              </span>
            </div>

            {/* Member avatars */}
            {visibleMembers.length > 0 && (
              <div className="flex items-center -space-x-2">
                {visibleMembers.map((member) => (
                  <div
                    key={member.id}
                    className="w-7 h-7 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center"
                    title={member.user.displayName ?? `${member.user.firstName} ${member.user.lastName}`}
                  >
                    {member.user.avatarUrl ? (
                      <img
                        src={member.user.avatarUrl}
                        alt={member.user.displayName ?? member.user.firstName}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-medium text-primary">
                        {getMemberInitial(member)}
                      </span>
                    )}
                  </div>
                ))}
                {overflowCount > 0 && (
                  <div className="w-7 h-7 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                    <span className="text-xs font-medium text-muted-foreground">
                      +{overflowCount}
                    </span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  )
}
