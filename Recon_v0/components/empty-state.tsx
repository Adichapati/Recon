"use client"

// Reusable empty state component for various scenarios
// Use when lists, searches, or data collections return no results

import type React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex min-h-[400px] items-center justify-center p-8", className)}>
      <div className="flex max-w-md flex-col items-center text-center">
        {icon && (
          <div
            className="mb-4 flex size-12 items-center justify-center border border-border text-muted-foreground"
            aria-hidden="true"
          >
            {icon}
          </div>
        )}
        <h3 className="font-retro mb-2 text-sm font-semibold uppercase tracking-wider text-foreground">{title}</h3>
        {description && <p className="font-retro mb-6 text-xs text-muted-foreground">{description}</p>}
        {action && (
          <Button onClick={action.onClick} variant="default">
            <span className="font-retro text-xs uppercase tracking-wider">{action.label}</span>
          </Button>
        )}
      </div>
    </div>
  )
}
