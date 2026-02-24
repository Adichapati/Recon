import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Providers } from "./providers"
import { Toaster } from "@/components/ui/toaster"
import { ScanlineOverlay } from "@/components/retro"
import { AmbientParticlesLoader } from "@/components/retro/ambient-particles-loader"
import { CrtTransition } from "@/components/retro/crt-transition"
import "./globals.css"

const geistSans = Geist({ subsets: ["latin"], variable: "--font-sans" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
  title: "Recon - Your Movie Companion",
  description: "Discover, track, and enjoy your favorite movies with personalized recommendations",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <Providers>
          <AmbientParticlesLoader />
          <CrtTransition />
          <ScanlineOverlay opacity={0.025} noise />
          {children}
          <Toaster />
        </Providers>
        <Analytics />
      </body>
    </html>
  )
}
