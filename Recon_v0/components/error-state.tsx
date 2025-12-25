"use client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

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
  retryLabel = "Try Again",
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn("flex min-h-[400px] items-center justify-center p-8", className)}
      role="alert"
      aria-live="polite"
    >
      <div className="flex max-w-md flex-col items-center text-center">
        <div
          className="mb-4 flex size-16 items-center justify-center rounded-full bg-destructive/10 text-destructive"
          aria-hidden="true"
        >
          <AlertCircle className="size-8" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-foreground">{title}</h3>
        <p className="mb-6 text-sm text-muted-foreground">{description}</p>
        {onRetry && (
          <Button onClick={onRetry} variant="default">
            {retryLabel}
          </Button>
        )}
      </div>
    </div>
  )
}
