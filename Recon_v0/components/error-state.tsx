"use client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
  retryLabel?: string
  className?: string
}

export function ErrorState({
  title = "Something went wrong",
  description = "An error occurred while loading this content. Please try again.",
  onRetry,
  retryLabel = "RETRY",
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn("flex min-h-[400px] items-center justify-center p-8", className)}
      role="alert"
      aria-live="polite"
    >
      <div className="flex max-w-md flex-col items-center text-center">
        <p className="font-retro mb-3 text-2xl font-bold text-destructive">[ERR]</p>
        <h3 className="font-retro mb-2 text-sm font-semibold uppercase tracking-wider text-foreground">{title}</h3>
        <p className="font-retro mb-6 text-xs text-muted-foreground">{description}</p>
        {onRetry && (
          <Button onClick={onRetry} variant="default">
            <span className="font-retro text-xs uppercase tracking-wider">{retryLabel}</span>
          </Button>
        )}
      </div>
    </div>
  )
}
