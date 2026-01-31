import { Monitor, Smartphone, Tablet, Laptop, Chrome, Cpu } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import type { SessionResponse } from "@/types"

interface SessionCardProps {
  session: SessionResponse
}

/**
 * Parse device info string to extract browser and OS information
 * Example: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
 */
function parseDeviceInfo(deviceInfo: string | null): { browser: string; os: string; icon: typeof Monitor } {
  if (!deviceInfo) {
    return { browser: "Unknown Browser", os: "Unknown OS", icon: Monitor }
  }

  // Extract browser (order matters - check more specific patterns first)
  let browser = "Unknown Browser"
  if (deviceInfo.includes("Edge")) browser = "Edge"
  else if (deviceInfo.includes("Chrome")) browser = "Chrome"
  else if (deviceInfo.includes("Firefox")) browser = "Firefox"
  else if (deviceInfo.includes("Safari")) browser = "Safari"

  // Extract OS (check mobile first, then desktop)
  let os = "Unknown OS"
  if (deviceInfo.includes("iPhone") || deviceInfo.includes("iPad")) os = "iOS"
  else if (deviceInfo.includes("Android")) os = "Android"
  else if (deviceInfo.includes("Macintosh") || deviceInfo.includes("Mac OS")) os = "macOS"
  else if (deviceInfo.includes("Windows")) os = "Windows"
  else if (deviceInfo.includes("Linux")) os = "Linux"

  // Choose icon based on device type
  let icon: typeof Monitor = Monitor
  if (deviceInfo.includes("iPhone")) icon = Smartphone
  else if (deviceInfo.includes("iPad") || deviceInfo.includes("Android")) icon = Tablet
  else if (deviceInfo.includes("Macintosh") || deviceInfo.includes("Windows") || deviceInfo.includes("Linux")) icon = Laptop

  return { browser, os, icon }
}

/**
 * Mask IP address for privacy
 * Example: 192.168.1.1 → 192.168.*.*
 */
function maskIpAddress(ipAddress: string | null): string {
  if (!ipAddress) return "Unknown IP"

  const parts = ipAddress.split(".")
  if (parts.length !== 4) return ipAddress // Not an IPv4 address, return as-is

  return `${parts[0]}.${parts[1]}.*.*`
}

export function SessionCard({ session }: SessionCardProps) {
  const { browser, os, icon: DeviceIcon } = parseDeviceInfo(session.deviceInfo)
  const maskedIp = maskIpAddress(session.ipAddress)

  // Format timestamps
  const lastActivity = formatDistanceToNow(new Date(session.lastActivityAt), { addSuffix: true })
  const createdDate = new Date(session.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })

  return (
    <div
      className={`rounded-lg border p-6 ${
        session.isCurrent
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border bg-card"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          {/* Device icon */}
          <div className="rounded-full bg-muted p-3">
            <DeviceIcon className="h-5 w-5 text-muted-foreground" />
          </div>

          {/* Session details */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">
                {browser} on {os}
              </h3>
              {session.isCurrent && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                  Current Session
                </span>
              )}
            </div>

            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Chrome className="h-3.5 w-3.5" />
                <span>IP Address: {maskedIp}</span>
              </div>
              <div className="flex items-center gap-1">
                <Cpu className="h-3.5 w-3.5" />
                <span>Last activity: {lastActivity}</span>
              </div>
              <div>
                <span>Created: {createdDate}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
