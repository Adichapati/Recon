import { Skeleton } from "@/components/ui/skeleton"

export function MovieSkeleton({ variant = "default" }: { variant?: "default" | "large" }) {
  return (
    <div className="overflow-hidden rounded-sm border border-border bg-card">
      <div className="relative w-full aspect-[2/3]">
        <Skeleton className="absolute inset-0 rounded-none" />
        {/* Retro line accents */}
        <div className="absolute inset-x-3 bottom-3 space-y-2">
          <Skeleton className="h-3 w-3/4 rounded-none" />
          <Skeleton className="h-2 w-1/2 rounded-none" />
        </div>
      </div>
    </div>
  )
}

export function MovieGridSkeleton({ count = 10, variant = "default" }: { count?: number; variant?: "default" | "large" }) {
  const gridClass = variant === "large" 
    ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4"
    : "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7"
    
  return (
    <div className={`grid gap-4 ${gridClass}`}>
      {Array.from({ length: count }).map((_, i) => (
        <MovieSkeleton key={i} variant={variant} />
      ))}
    </div>
  )
}
