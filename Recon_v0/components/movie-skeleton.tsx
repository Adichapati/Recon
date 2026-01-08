import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"

export function MovieSkeleton({ variant = "default" }: { variant?: "default" | "large" }) {
  return (
    <Card className={`overflow-hidden border-0 bg-neutral-900/50 ${variant === "large" ? "rounded-2xl" : "rounded-xl"}`}>
      <div className="relative w-full aspect-[2/3]">
        <Skeleton className="absolute inset-0 rounded-xl" />
      </div>
    </Card>
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
