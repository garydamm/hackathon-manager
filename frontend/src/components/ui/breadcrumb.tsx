import * as React from "react"
import { Link } from "react-router-dom"
import { ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

const Breadcrumb = React.forwardRef<
  HTMLElement,
  React.ComponentPropsWithoutRef<"nav">
>(({ className, ...props }, ref) => (
  <nav
    ref={ref}
    aria-label="breadcrumb"
    className={cn("", className)}
    {...props}
  />
))
Breadcrumb.displayName = "Breadcrumb"

const BreadcrumbList = React.forwardRef<
  HTMLOListElement,
  React.ComponentPropsWithoutRef<"ol">
>(({ className, ...props }, ref) => (
  <ol
    ref={ref}
    className={cn(
      "flex items-center gap-1.5 text-sm text-muted-foreground",
      className
    )}
    {...props}
  />
))
BreadcrumbList.displayName = "BreadcrumbList"

const BreadcrumbItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentPropsWithoutRef<"li">
>(({ className, ...props }, ref) => (
  <li
    ref={ref}
    className={cn("inline-flex items-center gap-1.5", className)}
    {...props}
  />
))
BreadcrumbItem.displayName = "BreadcrumbItem"

interface BreadcrumbLinkProps
  extends React.ComponentPropsWithoutRef<typeof Link> {
  maxLength?: number
}

const BreadcrumbLink = React.forwardRef<HTMLAnchorElement, BreadcrumbLinkProps>(
  ({ className, maxLength, children, style, ...props }, ref) => (
    <Link
      ref={ref}
      className={cn(
        "text-muted-foreground hover:text-foreground transition-colors",
        className
      )}
      style={
        maxLength
          ? {
              maxWidth: `${maxLength}ch`,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              display: "inline-block",
              verticalAlign: "bottom",
              ...style,
            }
          : style
      }
      {...props}
    >
      {children}
    </Link>
  )
)
BreadcrumbLink.displayName = "BreadcrumbLink"

const BreadcrumbSeparator = React.forwardRef<
  HTMLLIElement,
  React.ComponentPropsWithoutRef<"li">
>(({ className, children, ...props }, ref) => (
  <li
    ref={ref}
    role="presentation"
    aria-hidden="true"
    className={cn("text-muted-foreground", className)}
    {...props}
  >
    {children ?? <ChevronRight className="h-3.5 w-3.5" />}
  </li>
))
BreadcrumbSeparator.displayName = "BreadcrumbSeparator"

interface BreadcrumbPageProps
  extends React.ComponentPropsWithoutRef<"span"> {
  maxLength?: number
}

const BreadcrumbPage = React.forwardRef<HTMLSpanElement, BreadcrumbPageProps>(
  ({ className, maxLength, children, style, ...props }, ref) => (
    <span
      ref={ref}
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn("text-foreground font-medium", className)}
      style={
        maxLength
          ? {
              maxWidth: `${maxLength}ch`,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              display: "inline-block",
              verticalAlign: "bottom",
              ...style,
            }
          : style
      }
      {...props}
    >
      {children}
    </span>
  )
)
BreadcrumbPage.displayName = "BreadcrumbPage"

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
}
