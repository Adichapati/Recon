"use client"

import dynamic from "next/dynamic"

const AmbientParticles = dynamic(
  () => import("./ambient-particles").then((m) => m.AmbientParticles),
  { ssr: false }
)

export function AmbientParticlesLoader() {
  return <AmbientParticles />
}
