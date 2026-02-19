// Skeleton loader for movie details page
// Shows placeholder UI while movie information loads

import { Skeleton } from "@/components/ui/skeleton"

export function MovieDetailsSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-[300px,1fr]">
        {/* Poster skeleton */}
        <div className="mx-auto w-full max-w-[300px]">
          <div className="overflow-hidden border border-border">
            <Skeleton className="aspect-[2/3] w-full" />
          </div>
        </div>

        {/* Details skeleton */}
        <div className="space-y-6">
          <div>
            <Skeleton className="mb-2 h-10 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
          </div>

          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
          </div>

          <div className="border-t border-border/20" />

          <div className="space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>

          <div className="border-t border-border/20" />

          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </div>

      {/* Recommendations skeleton */}
      <div className="mt-12">
        <Skeleton className="mb-6 h-8 w-48" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="overflow-hidden border border-border">
              <Skeleton className="aspect-[2/3] w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
