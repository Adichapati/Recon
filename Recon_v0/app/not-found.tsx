import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <p className="font-retro mb-4 text-xs uppercase tracking-wider text-primary">// ERROR_404</p>
      <h1 className="font-retro mb-2 text-6xl font-bold tabular-nums text-foreground">404</h1>
      <h2 className="font-retro mb-4 text-lg uppercase tracking-wider text-foreground">Page Not Found</h2>
      <p className="font-retro mb-8 max-w-md text-center text-sm text-muted-foreground">
        Target page could not be located. The resource may have been removed or the path is invalid.
      </p>
      <Link href="/">
        <Button>
          <span className="font-retro text-xs uppercase tracking-wider">RETURN HOME</span>
        </Button>
      </Link>
    </div>
  )
}
