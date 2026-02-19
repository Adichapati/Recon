import { cn } from '@/lib/utils'

/**
 * Retro skeleton — slow opacity pulse instead of shimmer.
 * Feels like a machine waiting, not decorating.
 */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        'rounded-sm bg-border/40',
        'animate-pulse [animation-duration:2s] [animation-timing-function:steps(4)]',
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
