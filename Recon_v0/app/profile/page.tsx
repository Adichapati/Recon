"use client"

import { ProtectedLayout } from "@/components/protected-layout"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Mail, Calendar, Film } from "lucide-react"
import { useSession, signOut } from "next-auth/react"

export default function ProfilePage() {
  const { data: session, status } = useSession()

  if (status === "loading") return null
  if (!session) return null

  const user = session.user

  return (
    <ProtectedLayout>
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="size-20">
                    <AvatarImage src={user?.image ?? "/placeholder.svg"} alt={user?.name ?? "User"} />
                    <AvatarFallback className="bg-primary text-2xl text-primary-foreground">
                      {user?.name?.[0] ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-2xl">{user?.name}</CardTitle>
                    <CardDescription className="mt-1">{user?.email}</CardDescription>
                  </div>
                </div>
                <Button variant="outline" onClick={() => signOut()}>
                  Logout
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-lg border p-4">
                  <Mail className="size-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{user?.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border p-4">
                  <Calendar className="size-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Member Since</p>
                    <p className="font-medium">2025</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border p-4">
                  <Film className="size-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Movies Watched</p>
                    <p className="font-medium">42</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border p-4">
                  <Film className="size-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Watchlist</p>
                    <p className="font-medium">18</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="mb-4 text-lg font-semibold">Recent Activity</h3>
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
                      <div className="size-12 rounded bg-primary/10" />
                      <div>
                        <p className="font-medium">Added movie to watchlist</p>
                        <p className="text-sm text-muted-foreground">2 days ago</p>
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
