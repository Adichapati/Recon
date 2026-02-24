"use client"

import { useEffect, useRef, useCallback } from "react"
import * as THREE from "three"

interface CursorLookOptions {
  /** Max horizontal rotation in radians (default: 0.4) */
  maxYaw?: number
  /** Max vertical rotation in radians (default: 0.3) */
  maxPitch?: number
  /** Lerp speed 0-1 (default: 0.08) */
  smoothing?: number
  /** Return-to-neutral speed when idle (default: 0.04) */
  idleReturnSpeed?: number
  /** Seconds of no movement before returning to neutral (default: 3) */
  idleTimeout?: number
}

/**
 * Hook that converts cursor position to smooth, clamped rotation values.
 * Returns a ref to attach to the robot's head group.
 */
export function useCursorLook(options: CursorLookOptions = {}) {
  const {
    maxYaw = 0.5,
    maxPitch = 0.35,
    smoothing = 0.14,
    idleReturnSpeed = 0.04,
    idleTimeout = 3,
  } = options

  const headRef = useRef<THREE.Group>(null)
  const targetRotation = useRef({ x: 0, y: 0 })
  const lastMoveTime = useRef(Date.now())
  const frameId = useRef<number | null>(null)

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      // Normalize cursor position to -1..1
      const nx = (e.clientX / window.innerWidth) * 2 - 1
      const ny = (e.clientY / window.innerHeight) * 2 - 1

      // Apply a slight curve for more responsive feel near center
      const curvedX = Math.sign(nx) * Math.pow(Math.abs(nx), 0.8)
      const curvedY = Math.sign(ny) * Math.pow(Math.abs(ny), 0.8)

      // Clamp to max rotation (1.3x multiplier for extra sensitivity)
      targetRotation.current.y = THREE.MathUtils.clamp(curvedX * maxYaw * 1.3, -maxYaw, maxYaw)
      targetRotation.current.x = THREE.MathUtils.clamp(curvedY * maxPitch * 1.3, -maxPitch, maxPitch)
      lastMoveTime.current = Date.now()
    },
    [maxYaw, maxPitch]
  )

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove, { passive: true })

    const animate = () => {
      frameId.current = requestAnimationFrame(animate)
      if (!headRef.current) return

      const idle = (Date.now() - lastMoveTime.current) / 1000 > idleTimeout
      const speed = idle ? idleReturnSpeed : smoothing
      const tx = idle ? 0 : targetRotation.current.x
      const ty = idle ? 0 : targetRotation.current.y

      headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, tx, speed)
      headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, ty, speed)
    }

    animate()

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      if (frameId.current !== null) cancelAnimationFrame(frameId.current)
    }
  }, [handleMouseMove, smoothing, idleReturnSpeed, idleTimeout])

  return headRef
}
