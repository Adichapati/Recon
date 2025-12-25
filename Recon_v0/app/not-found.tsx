import Link from "next/link"
import { Film, Home } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <Film className="mb-6 size-20 text-primary" />
      <h1 className="mb-2 text-6xl font-bold text-foreground">404</h1>
      <h2 className="mb-4 text-2xl font-semibold text-foreground">Page Not Found</h2>
      <p className="mb-8 max-w-md text-center text-muted-foreground">
        Sorry, we couldn't find the page you're looking for. The movie might have been removed or the URL might be
        incorrect.
      </p>
      <Link href="/">
        <Button>
          <Home className="mr-2 size-4" />
          Back to Home
        </Button>
      </Link>
    </div>
  )
}
