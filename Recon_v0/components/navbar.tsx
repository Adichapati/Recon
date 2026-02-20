"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { Film, Search, User, Menu, LogOut, Heart, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useSession, signOut } from "next-auth/react"
import { clearWatchlistCache } from "@/lib/watchlist"

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const [searchQuery, setSearchQuery] = useState("")

  const isAuthenticated = !!session
  const user = session?.user

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const navLinks = isAuthenticated
    ? [
        { href: "/home", label: "Home" },
        { href: "/search", label: "Search" },
        { href: "/watchlist", label: "Watchlist" },
        { href: "/completed", label: "Completed" },
      ]
    : []

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        {/* Brand + nav links */}
        <div className="flex items-center gap-6">
          <Link
            href={isAuthenticated ? "/home" : "/"}
            className="group flex items-center gap-2 font-retro text-sm tracking-widest text-primary transition-colors"
          >
            <Film className="size-5 text-primary" />
            <span className="uppercase">Recon</span>
          </Link>

          {isAuthenticated && (
            <div className="hidden items-center gap-px md:flex">
              {navLinks.map((link) => {
                const isActive = pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-1.5 font-retro text-xs uppercase tracking-wider transition-colors ${
                      isActive
                        ? "border-b border-primary text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Centered search bar */}
        {isAuthenticated && (
          <form onSubmit={handleSearch} className="hidden flex-1 justify-center md:flex">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input
                type="text"
                placeholder="SEARCH TITLES..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-sm border border-border bg-card py-1.5 pl-9 pr-3 font-retro text-xs tracking-wider placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
              />
            </div>
          </form>
        )}

        {/* Right-side actions */}
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-sm">
                    <Avatar className="size-7 rounded-sm">
                      <AvatarImage src={user?.image ?? "/placeholder.svg"} />
                      <AvatarFallback className="rounded-sm bg-card font-retro text-xs text-muted-foreground">
                        {user?.name?.[0] ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-56 rounded-sm border-border">
                  <div className="p-2">
                    <p className="font-retro text-xs uppercase tracking-wider">{user?.name}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="font-retro text-xs uppercase tracking-wider">
                      <User className="mr-2 size-3.5" /> Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/watchlist" className="font-retro text-xs uppercase tracking-wider">
                      <Heart className="mr-2 size-3.5" /> Watchlist
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/completed" className="font-retro text-xs uppercase tracking-wider">
                      <CheckCircle className="mr-2 size-3.5" /> Completed
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      clearWatchlistCache()
                      signOut()
                    }}
                    className="font-retro text-xs uppercase tracking-wider"
                  >
                    <LogOut className="mr-2 size-3.5" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-sm md:hidden">
                    <Menu className="size-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="border-border bg-background">
                  <SheetHeader>
                    <SheetTitle className="font-retro text-sm uppercase tracking-widest text-primary">
                      Menu
                    </SheetTitle>
                  </SheetHeader>
                  <nav className="mt-6 flex flex-col gap-1">
                    {navLinks.map((link) => (
                      <Link key={link.href} href={link.href}>
                        <Button variant="ghost" className="w-full justify-start rounded-sm font-retro text-xs uppercase tracking-wider">
                          {link.label}
                        </Button>
                      </Link>
                    ))}
                  </nav>
                </SheetContent>
              </Sheet>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" className="font-retro text-xs uppercase tracking-wider">
                  Login
                </Button>
              </Link>
              <Link href="/signup">
                <Button className="font-retro text-xs uppercase tracking-wider">
                  Sign Up
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
