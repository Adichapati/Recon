"use client"

import { useRef, useMemo, useEffect, useState } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import * as THREE from "three"

/* ── Config ─────────────────────────────────────────── */
const PARTICLE_COUNT = 80
const TEAL = new THREE.Color("#4abfad")
const AMBER = new THREE.Color("#c8a832")

/**
 * InstancedMesh particle system — sets per-instance colors,
 * drifts upward with twinkle.
 */
function FloatingDots() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const particles = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      pos: new THREE.Vector3(
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 6 - 2
      ),
      speed: 0.08 + Math.random() * 0.15,
      phase: Math.random() * Math.PI * 2,
      drift: (Math.random() - 0.5) * 0.3,
      size: 0.01 + Math.random() * 0.025,
      isTeal: i % 3 !== 0,
    }))
  }, [])

  /* Set per-instance color once on mount */
  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    const color = new THREE.Color()
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      color.copy(particles[i].isTeal ? TEAL : AMBER)
      mesh.setColorAt(i, color)
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [particles])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const mesh = meshRef.current
    if (!mesh) return

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = particles[i]

      // Slow upward drift with horizontal sine wave
      p.pos.y += p.speed * 0.012
      p.pos.x += Math.sin(t * 0.4 + p.phase) * 0.003 + p.drift * 0.002

      // Wrap when out of bounds
      if (p.pos.y > 5.5) {
        p.pos.y = -5.5
        p.pos.x = (Math.random() - 0.5) * 14
      }
      if (p.pos.x > 7.5) p.pos.x = -7.5
      if (p.pos.x < -7.5) p.pos.x = 7.5

      // Twinkle
      const twinkle = 0.5 + Math.sin(t * 2.5 + p.phase) * 0.5
      const s = p.size * (0.4 + twinkle * 0.6)

      dummy.position.copy(p.pos)
      dummy.scale.setScalar(s)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial toneMapped={false} transparent opacity={0.6} />
    </instancedMesh>
  )
}

/**
 * Full-viewport ambient floating particles.
 * Sits behind all page content with pointer-events: none.
 */
export function AmbientParticles() {
  const [visible, setVisible] = useState(false)

  // Defer mount so it doesn't block first paint
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  if (!visible) return null

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0"
      aria-hidden="true"
      style={{ opacity: 0.7 }}
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: true }}
        style={{ background: "transparent" }}
      >
        <FloatingDots />
      </Canvas>
    </div>
  )
}
