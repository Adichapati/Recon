"use client"

import dynamic from "next/dynamic"

const GenreRadarCanvas = dynamic(
  () => import("./genre-radar-canvas").then((m) => m.GenreRadarCanvas),
  { ssr: false }
)

interface GenreRadarLoaderProps {
  genres: { name: string; count: number }[]
}

export function GenreRadarLoader({ genres }: GenreRadarLoaderProps) {
  return <GenreRadarCanvas genres={genres} />
}
