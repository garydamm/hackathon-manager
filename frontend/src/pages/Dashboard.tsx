import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import { Rocket, Calendar, Loader2, Plus, Sparkles, FileEdit } from "lucide-react"
import { AppLayout } from "@/components/layouts/AppLayout"
import { HackathonCard } from "@/components/HackathonCard"
import { Button } from "@/components/ui/button"
import { hackathonService } from "@/services/hackathons"
import { useAuth } from "@/contexts/AuthContext"
import type { Hackathon } from "@/types"

function categorizeHackathons(hackathons: Hackathon[]) {
  const now = new Date()

  // Open for registration - any hackathon accepting registrations
  const openForRegistration = hackathons.filter((h) =>
    h.status === "registration_open"
  )

  // Upcoming - registration closed but hasn't started yet
  const upcoming = hackathons.filter((h) => {
    const startDate = new Date(h.startsAt)
    return startDate > now && h.status === "registration_closed"
  })

  const ongoing = hackathons.filter((h) =>
    ["in_progress", "judging"].includes(h.status)
  )

  const recent = hackathons.filter((h) => {
    const endDate = new Date(h.endsAt)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    return h.status === "completed" && endDate > thirtyDaysAgo
  })

  return { openForRegistration, upcoming, ongoing, recent }
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12 px-4 rounded-xl border border-dashed border-border">
      <p className="text-muted-foreground">{message}</p>
    </div>
  )
}

function HackathonGrid({ hackathons }: { hackathons: Hackathon[] }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {hackathons.map((hackathon, index) => (
        <HackathonCard key={hackathon.id} hackathon={hackathon} index={index} />
      ))}
    </div>
  )
}

export function DashboardPage() {
  const { user } = useAuth()

  const {
    data: hackathons,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["hackathons"],
    queryFn: hackathonService.getAll,
  })

  const {
    data: myDrafts,
    isLoading: draftsLoading,
  } = useQuery({
    queryKey: ["hackathons", "my-drafts"],
    queryFn: hackathonService.getMyDrafts,
  })

  const { openForRegistration, upcoming, ongoing, recent } = hackathons
    ? categorizeHackathons(hackathons)
    : { openForRegistration: [], upcoming: [], ongoing: [], recent: [] }

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {/* Welcome section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">
              Welcome back, {user?.firstName}!
            </h1>
            <p className="text-muted-foreground text-lg">
              Discover hackathons and start building something amazing.
            </p>
          </div>
          <Button asChild size="lg" className="shrink-0">
            <Link to="/hackathons/new">
              <Plus className="h-5 w-5 mr-2" />
              Create Hackathon
            </Link>
          </Button>
        </motion.div>

        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <p className="text-destructive">
              Failed to load hackathons. Please try again later.
            </p>
          </div>
        )}

        {!isLoading && !error && (
          <>
            {/* Your Drafts */}
            {!draftsLoading && myDrafts && myDrafts.length > 0 && (
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <FileEdit className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold">Your Drafts</h2>
                    <p className="text-sm text-muted-foreground">
                      Unpublished hackathons you're organizing
                    </p>
                  </div>
                </div>
                <HackathonGrid hackathons={myDrafts} />
              </section>
            )}

            {/* Ongoing hackathons */}
            {ongoing.length > 0 && (
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Rocket className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold">Happening Now</h2>
                    <p className="text-sm text-muted-foreground">
                      Hackathons currently in progress
                    </p>
                  </div>
                </div>
                <HackathonGrid hackathons={ongoing} />
              </section>
            )}

            {/* Open for Registration */}
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Sparkles className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold">Open for Registration</h2>
                  <p className="text-sm text-muted-foreground">
                    Sign up now and secure your spot
                  </p>
                </div>
              </div>
              {openForRegistration.length > 0 ? (
                <HackathonGrid hackathons={openForRegistration} />
              ) : (
                <EmptyState message="No hackathons open for registration at the moment. Check back soon!" />
              )}
            </section>

            {/* Upcoming hackathons */}
            {upcoming.length > 0 && (
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Calendar className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold">Coming Soon</h2>
                    <p className="text-sm text-muted-foreground">
                      Registration closed, starting soon
                    </p>
                  </div>
                </div>
                <HackathonGrid hackathons={upcoming} />
              </section>
            )}

            {/* Recent hackathons */}
            {recent.length > 0 && (
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Calendar className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold">Recently Completed</h2>
                    <p className="text-sm text-muted-foreground">
                      Check out the results from past hackathons
                    </p>
                  </div>
                </div>
                <HackathonGrid hackathons={recent} />
              </section>
            )}
          </>
        )}
      </div>
    </AppLayout>
  )
}
