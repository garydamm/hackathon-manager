import { Link, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { Zap, LogOut, User, Monitor, ChevronDown } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs"

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const segments = useBreadcrumbs()

  const handleLogout = async () => {
    await logout()
    navigate("/login")
  }

  const HACKATHON_NAME_MAX_LENGTH = 30

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <span className="text-xl font-bold">HackathonHub</span>
            </Link>

            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <User className="h-4 w-4" />
                    <span>
                      {user?.firstName} {user?.lastName}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link to="/settings/sessions" className="cursor-pointer">
                      <Monitor className="h-4 w-4 mr-2" />
                      Sessions
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        {segments.length >= 2 && (
          <div className="border-t border-border">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-2">
              <Breadcrumb>
                <BreadcrumbList>
                  {segments.map((segment, index) => {
                    const isLast = index === segments.length - 1
                    const isHackathonName =
                      segment.label !== "Dashboard" &&
                      segment.label !== "New Hackathon" &&
                      segment.label !== "Schedule" &&
                      segment.label !== "Teams" &&
                      segment.label !== "Judging" &&
                      segment.label !== "Settings" &&
                      segment.label !== "Sessions"
                    const maxLen = isHackathonName
                      ? HACKATHON_NAME_MAX_LENGTH
                      : undefined

                    return (
                      <BreadcrumbItem key={segment.href ?? segment.label}>
                        {index > 0 && <BreadcrumbSeparator />}
                        {isLast ? (
                          <BreadcrumbPage maxLength={maxLen}>
                            {segment.label}
                          </BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink
                            to={segment.href!}
                            maxLength={maxLen}
                          >
                            {segment.label}
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                    )
                  })}
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </div>
        )}
      </nav>

      {/* Main content */}
      <main>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  )
}
