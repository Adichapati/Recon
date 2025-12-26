"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Film,
  Search,
  User,
  Menu,
  LogOut,
  Heart,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/lib/auth-context"

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading, logout } = useAuth()

  const isAuthenticated = !!user
  const isGuest = user?.role === "guest"

  const navLinks = isAuthenticated
    ? [
        { href: "/home", label: "Home" },
        { href: "/search", label: "Search" },
        ...(isGuest ? [] : [{ href: "/watchlist", label: "Watchlist" }]),
      ]
    : []

  const handleLogout = async () => {
    await logout()
    router.push("/login")
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Left */}
        <div className="flex items-center gap-6">
          <Link
            href={isAuthenticated ? "/home" : "/"}
            className="flex items-center gap-2"
          >
            <Film className="size-8 text-primary" />
            <span className="text-xl font-bold">Recon</span>
          </Link>

          {!loading && isAuthenticated && (
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  <Button
                    variant={pathname === link.href ? "secondary" : "ghost"}
                    size="sm"
                  >
                    {link.label}
                  </Button>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          {loading ? null : isAuthenticated ? (
            <>
              <Link href="/search" className="hidden md:block">
                <Button variant="ghost" size="icon">
                  <Search className="size-5" />
                </Button>
              </Link>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="size-8">
                      <AvatarImage
                        src={user?.picture || "/placeholder.svg"}
                        alt={user?.name}
                      />
                      <AvatarFallback>
                        {user?.name?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-56">
                  <div className="flex items-center gap-2 p-2">
                    <Avatar className="size-10">
                      <AvatarImage
                        src={user?.picture || "/placeholder.svg"}
                        alt={user?.name}
                      />
                      <AvatarFallback>
                        {user?.name?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex flex-col gap-0.5">
                      <p className="text-sm font-medium">{user?.name}</p>
                      {user?.email && (
                        <p className="text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      )}
                      {isGuest && (
                        <span className="mt-1 w-fit rounded-full bg-yellow-400 px-2 py-0.5 text-xs font-semibold text-black">
                          Guest
                        </span>
                      )}
                    </div>
                  </div>

                  <DropdownMenuSeparator />

                  {!isGuest && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/profile">
                          <User className="mr-2 size-4" />
                          Profile
                        </Link>
                      </DropdownMenuItem>

                      <DropdownMenuItem asChild>
                        <Link href="/watchlist">
                          <Heart className="mr-2 size-4" />
                          Watchlist
                        </Link>
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />
                    </>
                  )}

                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 size-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile Menu */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="size-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px]">
                  <SheetHeader>
                    <SheetTitle>Menu</SheetTitle>
                  </SheetHeader>

                  <nav className="mt-6 flex flex-col gap-2">
                    {navLinks.map((link) => (
                      <Link key={link.href} href={link.href}>
                        <Button
                          variant={pathname === link.href ? "secondary" : "ghost"}
                          className="w-full justify-start"
                        >
                          {link.label}
                        </Button>
                      </Link>
                    ))}

                    <Button
                      variant="destructive"
                      className="mt-4"
                      onClick={handleLogout}
                    >
                      Logout
                    </Button>
                  </nav>
                </SheetContent>
              </Sheet>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost">Login</Button>
              </Link>
              <Link href="/signup">
                <Button>Sign Up</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
