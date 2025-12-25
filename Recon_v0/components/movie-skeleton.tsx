import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import { AspectRatio } from "@/components/ui/aspect-ratio"

export function MovieSkeleton() {
  return (
    <Card className="overflow-hidden border-0 bg-card">
      <AspectRatio ratio={2 / 3}>
        <Skeleton className="h-full w-full" />
      </AspectRatio>
    </Card>
  )
}

export function MovieGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <MovieSkeleton key={i} />
      ))}
    </div>
  )
}
