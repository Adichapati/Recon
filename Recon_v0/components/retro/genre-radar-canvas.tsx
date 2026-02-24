"use client"

import { useRef, useMemo, useCallback } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import * as THREE from "three"

const TEAL = "#4abfad"
const AMBER = "#c8a832"
const GRID_COLOR = "#2a2a2a"

interface GenreRadarCanvasProps {
  genres: { name: string; count: number }[]
}

/** Shared ref so the HTML mouse handler can talk to the Three.js scene */
const mouseTarget = { x: 0, y: 0, hovering: false }

/**
 * 3D radar/spider chart with mouse-based tilt.
 * Amber data polygon on a teal wireframe grid with glowing vertices.
 */
function RadarChart({ genres }: { genres: { name: string; count: number }[] }) {
  const groupRef = useRef<THREE.Group>(null)
  const dataGroupRef = useRef<THREE.Group>(null)

  // Normalize counts to 0..1
  const maxCount = useMemo(() => Math.max(...genres.map((g) => g.count), 1), [genres])
  const normalizedValues = useMemo(
    () => genres.map((g) => 0.2 + (g.count / maxCount) * 0.8), // min 20%
    [genres, maxCount]
  )
  const n = genres.length

  // Grid ring radii (3 concentric polygons)
  const rings = [0.33, 0.66, 1.0]
  const radius = 1.8

  // Compute vertex positions for each ring
  const ringPoints = useMemo(() => {
    return rings.map((r) => {
      const pts: THREE.Vector3[] = []
      for (let i = 0; i < n; i++) {
        const angle = (i / n) * Math.PI * 2 - Math.PI / 2
        pts.push(new THREE.Vector3(Math.cos(angle) * r * radius, Math.sin(angle) * r * radius, 0))
      }
      return pts
    })
  }, [n, radius])

  // Data polygon points
  const dataPoints = useMemo(() => {
    const pts: THREE.Vector3[] = []
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2
      const r = normalizedValues[i] * radius
      pts.push(new THREE.Vector3(Math.cos(angle) * r, Math.sin(angle) * r, 0.01))
    }
    return pts
  }, [n, normalizedValues, radius])

  // Grid line geometries (rings)
  const ringGeometries = useMemo(() => {
    return ringPoints.map((pts) => {
      const geo = new THREE.BufferGeometry()
      const positions: number[] = []
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i]
        const b = pts[(i + 1) % pts.length]
        positions.push(a.x, a.y, a.z, b.x, b.y, b.z)
      }
      geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
      return geo
    })
  }, [ringPoints])

  // Axis lines (center to outer ring)
  const axisGeometry = useMemo(() => {
    const positions: number[] = []
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2
      positions.push(0, 0, 0)
      positions.push(Math.cos(angle) * radius, Math.sin(angle) * radius, 0)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
    return geo
  }, [n, radius])

  // Data polygon fill (triangle fan)
  const dataFillGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const positions: number[] = []
    const center = new THREE.Vector3(0, 0, 0.01)
    for (let i = 0; i < n; i++) {
      const a = dataPoints[i]
      const b = dataPoints[(i + 1) % n]
      positions.push(center.x, center.y, center.z)
      positions.push(a.x, a.y, a.z)
      positions.push(b.x, b.y, b.z)
    }
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
    return geo
  }, [dataPoints, n])

  // Data polygon outline
  const dataOutlineGeometry = useMemo(() => {
    const positions: number[] = []
    for (let i = 0; i < n; i++) {
      const a = dataPoints[i]
      const b = dataPoints[(i + 1) % n]
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
    return geo
  }, [dataPoints, n])

  // Smoothed tilt values (lerped each frame)
  const currentTilt = useRef({ x: 0.25, y: 0 })

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()

    if (groupRef.current) {
      const lerpSpeed = 0.07

      if (mouseTarget.hovering) {
        // Mouse-driven tilt: map mouse (-1..1) to rotation
        // x-axis tilt from vertical mouse (look up/down), y-axis tilt from horizontal
        const targetX = 0.25 + mouseTarget.y * 0.3 // base tilt + mouse vertical
        const targetY = mouseTarget.x * -0.35       // mouse horizontal → y rotation
        currentTilt.current.x += (targetX - currentTilt.current.x) * lerpSpeed
        currentTilt.current.y += (targetY - currentTilt.current.y) * lerpSpeed
      } else {
        // Idle: gentle breathing sway
        const idleX = 0.25 + Math.sin(t * 0.4) * 0.08
        const idleY = Math.sin(t * 0.25) * 0.06
        currentTilt.current.x += (idleX - currentTilt.current.x) * (lerpSpeed * 0.5)
        currentTilt.current.y += (idleY - currentTilt.current.y) * (lerpSpeed * 0.5)
      }

      groupRef.current.rotation.x = currentTilt.current.x
      groupRef.current.rotation.y = currentTilt.current.y
      groupRef.current.rotation.z = 0 // no z-spin so labels stay aligned
    }

    // Pulse data glow
    if (dataGroupRef.current) {
      const children = dataGroupRef.current.children
      for (let i = 0; i < children.length; i++) {
        const child = children[i] as THREE.Mesh
        if (child.material && "emissiveIntensity" in child.material) {
          ;(child.material as THREE.MeshStandardMaterial).emissiveIntensity =
            0.6 + Math.sin(t * 1.5 + i * 0.5) * 0.3
        }
      }
    }
  })

  return (
    <group ref={groupRef}>
      {/* Grid rings */}
      {ringGeometries.map((geo, i) => (
        <lineSegments key={`ring-${i}`} geometry={geo}>
          <lineBasicMaterial color={GRID_COLOR} transparent opacity={0.5 + i * 0.15} />
        </lineSegments>
      ))}

      {/* Axis lines */}
      <lineSegments geometry={axisGeometry}>
        <lineBasicMaterial color={GRID_COLOR} transparent opacity={0.3} />
      </lineSegments>

      {/* Data fill */}
      <group ref={dataGroupRef}>
        <mesh geometry={dataFillGeometry}>
          <meshStandardMaterial
            color={AMBER}
            emissive={AMBER}
            emissiveIntensity={0.6}
            transparent
            opacity={0.2}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>

        {/* Data outline */}
        <lineSegments geometry={dataOutlineGeometry}>
          <lineBasicMaterial color={AMBER} transparent opacity={0.9} linewidth={2} />
        </lineSegments>
      </group>

      {/* Data vertices (glowing dots) */}
      {dataPoints.map((pt, i) => (
        <mesh key={`dot-${i}`} position={[pt.x, pt.y, pt.z + 0.02]}>
          <circleGeometry args={[0.06, 12]} />
          <meshStandardMaterial
            color={TEAL}
            emissive={TEAL}
            emissiveIntensity={1.2}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* Outer ring vertex dots */}
      {ringPoints[2].map((pt, i) => (
        <mesh key={`ov-${i}`} position={[pt.x, pt.y, 0.01]}>
          <circleGeometry args={[0.03, 8]} />
          <meshStandardMaterial
            color={TEAL}
            emissive={TEAL}
            emissiveIntensity={0.4}
            transparent
            opacity={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  )
}

export function GenreRadarCanvas({ genres }: GenreRadarCanvasProps) {
  if (genres.length < 3) return null // Need at least 3 points for a radar

  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    // Normalize to -1..1 from center
    mouseTarget.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    mouseTarget.y = ((e.clientY - rect.top) / rect.height) * 2 - 1
    mouseTarget.hovering = true
  }, [])

  const handleMouseLeave = useCallback(() => {
    mouseTarget.hovering = false
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative h-48 w-full sm:h-56"
      style={{ maxWidth: 320 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Genre labels around the outside */}
      <div className="pointer-events-none absolute inset-0 z-10">
        {genres.map((g, i) => {
          const n = genres.length
          const angle = (i / n) * Math.PI * 2 - Math.PI / 2
          const labelRadius = 52 // percentage from center
          const x = 50 + Math.cos(angle) * labelRadius
          const y = 50 + Math.sin(angle) * (labelRadius * 0.85) // slight vertical compression
          return (
            <span
              key={g.name}
              className="font-retro absolute text-[9px] uppercase tracking-wider text-muted-foreground"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: "translate(-50%, -50%)",
                textShadow: "0 0 8px rgba(0,0,0,0.8)",
              }}
            >
              {g.name}
            </span>
          )
        })}
      </div>

      <Canvas
        camera={{ position: [0, 0, 5], fov: 40 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent", pointerEvents: "none" }}
      >
        <ambientLight intensity={0.3} />
        <pointLight position={[3, 3, 5]} intensity={0.5} color={TEAL} />
        <RadarChart genres={genres} />
      </Canvas>
    </div>
  )
}
