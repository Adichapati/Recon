"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { Canvas, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { RobotModel } from "./robot-model"

const TEAL = "#4abfad"
const AMBER = "#c8a832"

/**
 * Pauses the render loop when the tab is hidden or the canvas is off-screen.
 */
function PerformanceGuard() {
  const { gl, invalidate } = useThree()
  const canvasEl = gl.domElement

  useEffect(() => {
    let paused = false

    const pause = () => {
      paused = true
    }
    const resume = () => {
      paused = false
      invalidate()
    }

    // Tab visibility
    const onVisibility = () => {
      document.hidden ? pause() : resume()
    }
    document.addEventListener("visibilitychange", onVisibility)

    // IntersectionObserver for off-screen pause
    const observer = new IntersectionObserver(
      ([entry]) => {
        entry.isIntersecting ? resume() : pause()
      },
      { threshold: 0.05 }
    )
    observer.observe(canvasEl)

    // Override the animation loop to no-op when paused
    const origSetAnimationLoop = gl.setAnimationLoop.bind(gl)
    let currentLoop: XRFrameRequestCallback | null = null

    gl.setAnimationLoop = (callback: XRFrameRequestCallback | null) => {
      currentLoop = callback
      origSetAnimationLoop(callback ? (time: DOMHighResTimeStamp, frame?: XRFrame) => {
        if (!paused && currentLoop) currentLoop(time, frame!)
      } : null)
    }

    return () => {
      document.removeEventListener("visibilitychange", onVisibility)
      observer.disconnect()
    }
  }, [gl, invalidate])

  return null
}

/**
 * Three.js Canvas wrapper for the hero robot.
 * SSR-safe — only renders on client. Includes Suspense boundary.
 */
export function HeroRobotCanvas() {
  const [mounted, setMounted] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // SSR / initial render placeholder — prevents hydration mismatch
    return (
      <div
        className="flex h-full w-full items-center justify-center"
        aria-hidden="true"
      >
        <div className="font-retro animate-pulse text-xs tracking-widest text-muted-foreground/30">
          LOADING_3D...
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="h-full w-full" aria-hidden="true">
      <Canvas
        dpr={[1.5, 2]}
        camera={{ position: [0, 0.3, 6], fov: 40 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
          toneMapping: THREE.NoToneMapping,
        }}
        style={{ background: "transparent", pointerEvents: "none" }}
      >
        <Suspense fallback={null}>
          <PerformanceGuard />

          {/* Lighting — moody with teal/amber accents */}
          <ambientLight intensity={0.25} color="#aabbcc" />
          <directionalLight
            position={[3, 4, 5]}
            intensity={0.9}
            color="#dde4f0"
          />
          <directionalLight
            position={[-2, 2, -3]}
            intensity={0.25}
            color="#667799"
          />
          {/* Teal rim light from behind  */}
          <pointLight
            position={[0, 1, -3]}
            intensity={0.8}
            color={TEAL}
            distance={10}
            decay={2}
          />
          {/* Warm amber under-glow (reflecting screen) */}
          <pointLight
            position={[0, -1.5, 2]}
            intensity={0.3}
            color={AMBER}
            distance={6}
            decay={2}
          />
          {/* Teal key from top-left for edge definition */}
          <spotLight
            position={[-4, 5, 3]}
            intensity={0.4}
            color={TEAL}
            angle={0.5}
            penumbra={0.8}
            distance={15}
            decay={2}
          />

          <RobotModel />
        </Suspense>
      </Canvas>
    </div>
  )
}
