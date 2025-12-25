"use client"

import { ProtectedLayout } from "@/components/protected-layout"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/lib/auth-context"
import { Mail, Calendar, Film } from "lucide-react"

export default function ProfilePage() {
  const { user, logout } = useAuth()

  return (
    <ProtectedLayout>
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="size-20">
                    <AvatarImage src={user?.avatar || "/placeholder.svg"} alt={user?.name} />
                    <AvatarFallback className="bg-primary text-2xl text-primary-foreground">
                      {user?.name?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-2xl">{user?.name}</CardTitle>
                    <CardDescription className="mt-1">{user?.email}</CardDescription>
                  </div>
                </div>
                <Button variant="outline" onClick={logout}>
                  Logout
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                    <Mail className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium text-foreground">{user?.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                    <Calendar className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Member Since</p>
                    <p className="font-medium text-foreground">January 2025</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                    <Film className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Movies Watched</p>
                    <p className="font-medium text-foreground">{"42"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                    <Film className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Watchlist</p>
                    <p className="font-medium text-foreground">{"18"}</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="mb-4 text-lg font-semibold text-foreground">Recent Activity</h3>
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
                      <div className="size-12 shrink-0 rounded bg-primary/10" />
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{"Added movie to watchlist"}</p>
                        <p className="text-sm text-muted-foreground">{"2 days ago"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedLayout>
  )
}
