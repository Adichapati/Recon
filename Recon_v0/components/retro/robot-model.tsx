"use client"

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { useCursorLook } from "@/hooks/use-cursor-look"

/* ── Palette — light shell, dark accents, amber/teal glow ── */
const BODY         = "#d0d0d0"   // light warm grey shell
const BODY_EDGE    = "#b0b0b0"   // subtle edge trim
const SIDE         = "#a8a8a8"   // side panel inset
const SCREEN_BG    = "#080808"   // CRT black
const SCREEN_BEZEL = "#222222"   // dark bezel
const AMBER        = "#c8a832"   // primary glow
const TEAL         = "#4abfad"   // accent glow
const EYE_COLOR    = "#c8a832"   // amber eyes
const MOUTH_COLOR  = "#c8a832"   // amber smile
const DPAD         = "#3a3a3a"   // dark d-pad
const DPAD_ACCENT  = "#c8a832"   // amber dot
const BTN_A        = "#4abfad"   // teal button
const BTN_B        = "#c8a832"   // amber button
const BTN_C        = "#555555"   // mid-grey button
const SLOT         = "#1a1a1a"   // cartridge slot
const LIMB         = "#999999"   // lighter limbs
const LIMB_JOINT   = "#777777"   // joint rings

const SPARK_COUNT  = 24
const GLITCH_COLOR = "#ff3366"   // glitch accent (hot pink flash)

/**
 * Procedural BMO — light shell with glitch FX, sparks, and CRT screen.
 */
export function RobotModel() {
  const groupRef = useRef<THREE.Group>(null)
  const bodyRef = useCursorLook({ maxYaw: 0.35, maxPitch: 0.2, smoothing: 0.12 })

  const leftEyeRef = useRef<THREE.Mesh>(null)
  const rightEyeRef = useRef<THREE.Mesh>(null)
  const leftArmRef = useRef<THREE.Group>(null)
  const rightArmRef = useRef<THREE.Group>(null)
  const leftLegRef = useRef<THREE.Group>(null)
  const rightLegRef = useRef<THREE.Group>(null)
  const screenGlowRef = useRef<THREE.Mesh>(null)
  const scanlineRef = useRef<THREE.Mesh>(null)
  const glitchBarRef = useRef<THREE.Mesh>(null)
  const sparkGroupRef = useRef<THREE.Group>(null)

  const blinkState = useRef({
    nextBlink: 2 + Math.random() * 2,
    blinking: false,
    blinkEnd: 0,
    nextWink: 7 + Math.random() * 5,
    winking: false,
    winkEnd: 0,
    winkEye: "left" as "left" | "right",
  })

  const glitchState = useRef({
    nextGlitch: 3 + Math.random() * 4,
    glitching: false,
    glitchEnd: 0,
    intensity: 0,
  })

  /* Spark particle initial positions + velocities */
  const sparkData = useMemo(() => {
    return Array.from({ length: SPARK_COUNT }, () => ({
      pos: new THREE.Vector3(
        (Math.random() - 0.5) * 3.5,
        (Math.random() - 0.5) * 4.5,
        (Math.random() - 0.5) * 2.5
      ),
      vel: new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        0.2 + Math.random() * 0.4,
        (Math.random() - 0.5) * 0.2
      ),
      phase: Math.random() * Math.PI * 2,
      size: 0.015 + Math.random() * 0.025,
      isTeal: Math.random() > 0.4,
    }))
  }, [])

  /* CRT scanline texture */
  const scanlineTex = useMemo(() => {
    const canvas = document.createElement("canvas")
    canvas.width = 4
    canvas.height = 64
    const ctx = canvas.getContext("2d")!
    for (let i = 0; i < 64; i++) {
      ctx.fillStyle = i % 3 === 0 ? "rgba(74,191,173,0.08)" : "rgba(0,0,0,0)"
      ctx.fillRect(0, i, 4, 1)
    }
    const tex = new THREE.CanvasTexture(canvas)
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(1, 8)
    return tex
  }, [])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const bs = blinkState.current
    const gs = glitchState.current

    /* ── Idle bob + sway ── */
    if (groupRef.current) {
      let posY = Math.sin(t * 1.2) * 0.12
      let rotZ = Math.sin(t * 0.7) * 0.025
      let rotX = Math.sin(t * 0.9) * 0.015

      /* ── Glitch jitter overlay ── */
      if (gs.glitching) {
        const p = 1 - (gs.glitchEnd - t) / 0.3
        gs.intensity = p < 0.5 ? p * 2 : (1 - p) * 2
        posY += (Math.random() - 0.5) * 0.08 * gs.intensity
        rotZ += (Math.random() - 0.5) * 0.06 * gs.intensity
        rotX += (Math.random() - 0.5) * 0.04 * gs.intensity
        // Horizontal glitch offset
        groupRef.current.position.x = (Math.random() - 0.5) * 0.12 * gs.intensity
        if (t >= gs.glitchEnd) {
          gs.glitching = false
          groupRef.current.position.x = 0
        }
      } else {
        groupRef.current.position.x = 0
      }

      groupRef.current.position.y = posY
      groupRef.current.rotation.z = rotZ
      groupRef.current.rotation.x = rotX
    }

    /* ── Trigger glitch every 4-8s ── */
    if (!gs.glitching && t > gs.nextGlitch) {
      gs.glitching = true
      gs.glitchEnd = t + 0.15 + Math.random() * 0.2
      gs.nextGlitch = t + 4 + Math.random() * 4
    }

    /* ── Screen glow pulse + glitch flicker ── */
    if (screenGlowRef.current) {
      const mat = screenGlowRef.current.material as THREE.MeshStandardMaterial
      let baseIntensity = 0.15 + Math.sin(t * 2.0) * 0.05
      if (gs.glitching) {
        baseIntensity += Math.random() * 0.4 * gs.intensity
        // Flash screen white during intense glitch
        if (gs.intensity > 0.7) {
          mat.emissive.set(Math.random() > 0.5 ? GLITCH_COLOR : TEAL)
        } else {
          mat.emissive.set(TEAL)
        }
      } else {
        mat.emissive.set(TEAL)
      }
      mat.emissiveIntensity = baseIntensity
    }

    /* ── Glitch bar (horizontal noise band on screen) ── */
    if (glitchBarRef.current) {
      if (gs.glitching && gs.intensity > 0.3) {
        glitchBarRef.current.visible = true
        glitchBarRef.current.position.y = 0.4 + (Math.random() - 0.5) * 1.0
        glitchBarRef.current.scale.y = 0.5 + Math.random() * 2
        const mat = glitchBarRef.current.material as THREE.MeshBasicMaterial
        mat.opacity = 0.15 + Math.random() * 0.25 * gs.intensity
      } else {
        glitchBarRef.current.visible = false
      }
    }

    /* ── Scanline scroll ── */
    if (scanlineTex) {
      scanlineTex.offset.y = t * 0.15
    }

    /* ── Spark particles ── */
    if (sparkGroupRef.current) {
      const children = sparkGroupRef.current.children as THREE.Mesh[]
      for (let i = 0; i < sparkData.length; i++) {
        const s = sparkData[i]
        const child = children[i]
        if (!child) continue

        // Float upward in a wavy path
        s.pos.x += Math.sin(t * 1.5 + s.phase) * 0.002
        s.pos.y += s.vel.y * 0.008
        s.pos.z += Math.cos(t * 1.2 + s.phase) * 0.001

        // Reset when drifted too high
        if (s.pos.y > 3) {
          s.pos.y = -2.5
          s.pos.x = (Math.random() - 0.5) * 3.5
          s.pos.z = (Math.random() - 0.5) * 2.5
        }

        child.position.copy(s.pos)

        // Twinkle
        const twinkle = 0.3 + Math.sin(t * 4 + s.phase) * 0.7
        const mat = child.material as THREE.MeshStandardMaterial
        mat.emissiveIntensity = twinkle * (gs.glitching ? 2.5 : 1.0)
        mat.opacity = 0.3 + twinkle * 0.5
        child.scale.setScalar(s.size * (0.8 + twinkle * 0.4))
      }
    }

    /* ── Arms sway ── */
    if (leftArmRef.current) {
      leftArmRef.current.rotation.z = 0.1 + Math.sin(t * 1.1) * 0.1
      leftArmRef.current.rotation.x = Math.sin(t * 0.8) * 0.06
      const wave = t % 8
      if (wave > 5.5 && wave < 7) {
        const w = (wave - 5.5) / 1.5
        leftArmRef.current.rotation.z = 0.1 + Math.sin(w * Math.PI * 3) * 0.6
      }
    }
    if (rightArmRef.current) {
      rightArmRef.current.rotation.z = -0.1 - Math.sin(t * 1.1 + 1.2) * 0.08
      rightArmRef.current.rotation.x = Math.sin(t * 0.8 + Math.PI) * 0.05
    }

    /* ── Legs subtle kick ── */
    if (leftLegRef.current) {
      leftLegRef.current.rotation.x = Math.sin(t * 0.7) * 0.06
    }
    if (rightLegRef.current) {
      rightLegRef.current.rotation.x = Math.sin(t * 0.7 + Math.PI * 0.5) * 0.06
    }

    /* ── Blink (both eyes) ── */
    if (!bs.blinking && !bs.winking && t > bs.nextBlink) {
      bs.blinking = true
      bs.blinkEnd = t + 0.13
      bs.nextBlink = t + 2.5 + Math.random() * 4
    }
    if (bs.blinking) {
      const p = Math.min(1, (t - (bs.blinkEnd - 0.13)) / 0.13)
      const sq = p < 0.5 ? 1 - p * 2 : (p - 0.5) * 2
      const sy = Math.max(0.05, sq)
      if (leftEyeRef.current) leftEyeRef.current.scale.y = sy
      if (rightEyeRef.current) rightEyeRef.current.scale.y = sy
      if (t >= bs.blinkEnd) {
        bs.blinking = false
        if (leftEyeRef.current) leftEyeRef.current.scale.y = 1
        if (rightEyeRef.current) rightEyeRef.current.scale.y = 1
      }
    }

    /* ── Wink (one eye) ── */
    if (!bs.blinking && !bs.winking && t > bs.nextWink) {
      bs.winking = true
      bs.winkEnd = t + 0.22
      bs.winkEye = Math.random() > 0.5 ? "left" : "right"
      bs.nextWink = t + 8 + Math.random() * 7
    }
    if (bs.winking) {
      const eye = bs.winkEye === "left" ? leftEyeRef.current : rightEyeRef.current
      if (eye) {
        const p = Math.min(1, (t - (bs.winkEnd - 0.22)) / 0.22)
        const sq = p < 0.4 ? 1 - p / 0.4 : p > 0.6 ? (p - 0.6) / 0.4 : 0
        eye.scale.y = Math.max(0.05, sq)
      }
      if (t >= bs.winkEnd) {
        bs.winking = false
        if (leftEyeRef.current) leftEyeRef.current.scale.y = 1
        if (rightEyeRef.current) rightEyeRef.current.scale.y = 1
      }
    }
  })

  return (
    <group ref={groupRef} position={[0, 0.5, 0]}>

      {/* ── SPARK PARTICLES ────────────────────────── */}
      <group ref={sparkGroupRef}>
        {sparkData.map((s, i) => (
          <mesh key={`spark-${i}`} position={[s.pos.x, s.pos.y, s.pos.z]}>
            <sphereGeometry args={[s.size, 6, 6]} />
            <meshStandardMaterial
              color={s.isTeal ? TEAL : AMBER}
              emissive={s.isTeal ? TEAL : AMBER}
              emissiveIntensity={1.0}
              transparent
              opacity={0.5}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>

      <group ref={bodyRef}>

        {/* ── MAIN BODY ─────────────────────────────── */}
        <mesh>
          <boxGeometry args={[2.2, 2.8, 1.4]} />
          <meshStandardMaterial color={BODY} roughness={0.55} metalness={0.15} />
        </mesh>

        {/* Top/bottom edge trim */}
        <mesh position={[0, 1.42, 0]}>
          <boxGeometry args={[2.22, 0.04, 1.42]} />
          <meshStandardMaterial color={BODY_EDGE} roughness={0.35} metalness={0.3} />
        </mesh>
        <mesh position={[0, -1.42, 0]}>
          <boxGeometry args={[2.22, 0.04, 1.42]} />
          <meshStandardMaterial color={BODY_EDGE} roughness={0.35} metalness={0.3} />
        </mesh>

        {/* Side panels */}
        <mesh position={[-1.105, 0, 0]}>
          <boxGeometry args={[0.02, 2.7, 1.3]} />
          <meshStandardMaterial color={SIDE} roughness={0.5} metalness={0.2} />
        </mesh>
        <mesh position={[1.105, 0, 0]}>
          <boxGeometry args={[0.02, 2.7, 1.3]} />
          <meshStandardMaterial color={SIDE} roughness={0.5} metalness={0.2} />
        </mesh>

        {/* ── SCREEN BEZEL ────────────────────────────── */}
        <mesh position={[0, 0.4, 0.701]}>
          <boxGeometry args={[1.6, 1.4, 0.02]} />
          <meshStandardMaterial color={SCREEN_BEZEL} roughness={0.4} metalness={0.4} />
        </mesh>

        {/* ── SCREEN (CRT dark) ──────────────────────── */}
        <mesh ref={screenGlowRef} position={[0, 0.4, 0.715]}>
          <boxGeometry args={[1.4, 1.2, 0.01]} />
          <meshStandardMaterial
            color={SCREEN_BG}
            roughness={0.15}
            metalness={0.1}
            emissive={TEAL}
            emissiveIntensity={0.15}
          />
        </mesh>

        {/* Scanline overlay */}
        <mesh ref={scanlineRef} position={[0, 0.4, 0.722]}>
          <planeGeometry args={[1.38, 1.18]} />
          <meshBasicMaterial map={scanlineTex} transparent opacity={0.5} depthWrite={false} />
        </mesh>

        {/* Glitch bar (hidden until glitch triggers) */}
        <mesh ref={glitchBarRef} position={[0, 0.4, 0.724]} visible={false}>
          <planeGeometry args={[1.38, 0.04]} />
          <meshBasicMaterial color={GLITCH_COLOR} transparent opacity={0.2} depthWrite={false} />
        </mesh>

        {/* Screen edge glow — teal lines */}
        <mesh position={[0, 1.01, 0.71]}>
          <boxGeometry args={[1.42, 0.015, 0.01]} />
          <meshStandardMaterial color={TEAL} emissive={TEAL} emissiveIntensity={0.8}
            roughness={0.2} transparent opacity={0.7} />
        </mesh>
        <mesh position={[0, -0.21, 0.71]}>
          <boxGeometry args={[1.42, 0.015, 0.01]} />
          <meshStandardMaterial color={TEAL} emissive={TEAL} emissiveIntensity={0.8}
            roughness={0.2} transparent opacity={0.7} />
        </mesh>
        <mesh position={[-0.71, 0.4, 0.71]}>
          <boxGeometry args={[0.015, 1.22, 0.01]} />
          <meshStandardMaterial color={TEAL} emissive={TEAL} emissiveIntensity={0.8}
            roughness={0.2} transparent opacity={0.7} />
        </mesh>
        <mesh position={[0.71, 0.4, 0.71]}>
          <boxGeometry args={[0.015, 1.22, 0.01]} />
          <meshStandardMaterial color={TEAL} emissive={TEAL} emissiveIntensity={0.8}
            roughness={0.2} transparent opacity={0.7} />
        </mesh>

        {/* ── EYES (amber glowing) ────────────────────── */}
        <mesh ref={leftEyeRef} position={[-0.28, 0.58, 0.73]}>
          <circleGeometry args={[0.1, 24]} />
          <meshStandardMaterial
            color={EYE_COLOR} emissive={EYE_COLOR} emissiveIntensity={1.5}
            roughness={0.2} side={THREE.DoubleSide}
          />
        </mesh>
        <mesh ref={rightEyeRef} position={[0.22, 0.55, 0.73]}>
          <circleGeometry args={[0.09, 24]} />
          <meshStandardMaterial
            color={EYE_COLOR} emissive={EYE_COLOR} emissiveIntensity={1.5}
            roughness={0.2} side={THREE.DoubleSide}
          />
        </mesh>

        {/* Eye glow halos */}
        <mesh position={[-0.28, 0.58, 0.725]}>
          <circleGeometry args={[0.18, 24]} />
          <meshStandardMaterial
            color={AMBER} emissive={AMBER} emissiveIntensity={0.3}
            transparent opacity={0.15} roughness={0.5} side={THREE.DoubleSide}
          />
        </mesh>
        <mesh position={[0.22, 0.55, 0.725]}>
          <circleGeometry args={[0.16, 24]} />
          <meshStandardMaterial
            color={AMBER} emissive={AMBER} emissiveIntensity={0.3}
            transparent opacity={0.15} roughness={0.5} side={THREE.DoubleSide}
          />
        </mesh>

        {/* ── MOUTH (amber arc) ──────────────────────── */}
        {Array.from({ length: 11 }, (_, i) => {
          const angle = Math.PI * 0.12 + (i / 10) * Math.PI * 0.76
          const cx = Math.cos(angle) * 0.25
          const cy = -Math.sin(angle) * 0.14 + 0.22
          return (
            <mesh key={`m-${i}`} position={[cx, cy, 0.73]}>
              <circleGeometry args={[0.02, 8]} />
              <meshStandardMaterial
                color={MOUTH_COLOR} emissive={MOUTH_COLOR} emissiveIntensity={0.6}
                roughness={0.3} side={THREE.DoubleSide}
              />
            </mesh>
          )
        })}

        {/* ── DIVIDER LINE ────────────────────────────── */}
        <mesh position={[0, -0.25, 0.71]}>
          <boxGeometry args={[1.7, 0.025, 0.01]} />
          <meshStandardMaterial color={TEAL} emissive={TEAL} emissiveIntensity={0.5}
            roughness={0.3} transparent opacity={0.6} />
        </mesh>

        {/* ── D-PAD ──────────────────────────────────── */}
        {[
          [0, 0], [-0.13, 0], [0.13, 0], [0, 0.13], [0, -0.13],
        ].map(([dx, dy], i) => (
          <mesh key={`dp-${i}`} position={[-0.45 + dx!, -0.55 + dy!, 0.715]}>
            <boxGeometry args={[0.12, 0.12, 0.04]} />
            <meshStandardMaterial color={DPAD} roughness={0.5} metalness={0.3} />
          </mesh>
        ))}
        <mesh position={[-0.45, -0.55, 0.74]}>
          <circleGeometry args={[0.03, 12]} />
          <meshStandardMaterial
            color={DPAD_ACCENT} emissive={DPAD_ACCENT} emissiveIntensity={0.4}
            roughness={0.3} side={THREE.DoubleSide}
          />
        </mesh>

        {/* ── TEAL BUTTON ─────────────────────────────── */}
        <mesh position={[0.2, -0.45, 0.72]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.04, 24]} />
          <meshStandardMaterial
            color={BTN_A} emissive={BTN_A} emissiveIntensity={0.3}
            roughness={0.3} metalness={0.2}
          />
        </mesh>

        {/* ── AMBER BUTTON ────────────────────────────── */}
        <mesh position={[0.48, -0.62, 0.72]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 0.04, 24]} />
          <meshStandardMaterial
            color={BTN_B} emissive={BTN_B} emissiveIntensity={0.25}
            roughness={0.3} metalness={0.2}
          />
        </mesh>

        {/* ── DARK BUTTON ─────────────────────────────── */}
        <mesh position={[0.2, -0.72, 0.72]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.065, 0.065, 0.04, 16]} />
          <meshStandardMaterial color={BTN_C} roughness={0.5} metalness={0.3} />
        </mesh>

        {/* ── CARTRIDGE SLOT ──────────────────────────── */}
        <mesh position={[0, -1.0, 0.71]}>
          <boxGeometry args={[0.5, 0.12, 0.02]} />
          <meshStandardMaterial color={SLOT} roughness={0.6} metalness={0.2} />
        </mesh>
        {[-0.14, 0, 0.14].map((x, i) => (
          <mesh key={`sl-${i}`} position={[x, -1.0, 0.725]}>
            <boxGeometry args={[0.06, 0.03, 0.01]} />
            <meshStandardMaterial color={TEAL} emissive={TEAL} emissiveIntensity={0.2}
              roughness={0.3} transparent opacity={0.4} />
          </mesh>
        ))}

        {/* ── SPEAKER GRILLE ──────────────────────────── */}
        {[0, 1, 2, 3, 4].map((row) =>
          [0, 1, 2].map((col) => (
            <mesh key={`sp-${row}-${col}`}
              position={[-1.12, 0.5 - row * 0.14, -0.2 + col * 0.2]}
              rotation={[0, -Math.PI / 2, 0]}
            >
              <circleGeometry args={[0.025, 8]} />
              <meshStandardMaterial
                color={TEAL} emissive={TEAL}
                emissiveIntensity={row === 2 && col === 1 ? 0.3 : 0.05}
                roughness={0.5} side={THREE.DoubleSide} transparent opacity={0.5}
              />
            </mesh>
          ))
        )}

        {/* ── STATUS LED ──────────────────────────────── */}
        <mesh position={[0.85, 1.2, 0.71]}>
          <circleGeometry args={[0.035, 12]} />
          <meshStandardMaterial
            color={TEAL} emissive={TEAL} emissiveIntensity={1.0}
            roughness={0.2} side={THREE.DoubleSide}
          />
        </mesh>
        <mesh position={[0.85, 1.2, 0.705]}>
          <circleGeometry args={[0.07, 12]} />
          <meshStandardMaterial
            color={TEAL} emissive={TEAL} emissiveIntensity={0.4}
            transparent opacity={0.2} roughness={0.5} side={THREE.DoubleSide}
          />
        </mesh>

        {/* ── ARMS ────────────────────────────────────── */}
        <group ref={leftArmRef} position={[-1.25, 0.1, 0.1]}>
          <mesh position={[0, -0.45, 0]}>
            <capsuleGeometry args={[0.06, 0.7, 4, 12]} />
            <meshStandardMaterial color={LIMB} roughness={0.5} metalness={0.2} />
          </mesh>
          <mesh position={[0, -0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.065, 0.015, 8, 16]} />
            <meshStandardMaterial color={LIMB_JOINT} roughness={0.4} metalness={0.4} />
          </mesh>
        </group>

        <group ref={rightArmRef} position={[1.25, 0.1, 0.1]}>
          <mesh position={[0, -0.45, 0]}>
            <capsuleGeometry args={[0.06, 0.7, 4, 12]} />
            <meshStandardMaterial color={LIMB} roughness={0.5} metalness={0.2} />
          </mesh>
          <mesh position={[0, -0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.065, 0.015, 8, 16]} />
            <meshStandardMaterial color={LIMB_JOINT} roughness={0.4} metalness={0.4} />
          </mesh>
        </group>

        {/* ── LEGS ────────────────────────────────────── */}
        <group ref={leftLegRef} position={[-0.4, -1.45, 0.05]}>
          <mesh position={[0, -0.2, 0]}>
            <capsuleGeometry args={[0.065, 0.35, 4, 12]} />
            <meshStandardMaterial color={LIMB} roughness={0.5} metalness={0.2} />
          </mesh>
          <mesh position={[0, 0.0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.07, 0.012, 8, 16]} />
            <meshStandardMaterial color={LIMB_JOINT} roughness={0.4} metalness={0.4} />
          </mesh>
          <mesh position={[0, -0.42, 0.03]}>
            <boxGeometry args={[0.16, 0.08, 0.2]} />
            <meshStandardMaterial color={LIMB} roughness={0.5} metalness={0.2} />
          </mesh>
        </group>

        <group ref={rightLegRef} position={[0.4, -1.45, 0.05]}>
          <mesh position={[0, -0.2, 0]}>
            <capsuleGeometry args={[0.065, 0.35, 4, 12]} />
            <meshStandardMaterial color={LIMB} roughness={0.5} metalness={0.2} />
          </mesh>
          <mesh position={[0, 0.0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.07, 0.012, 8, 16]} />
            <meshStandardMaterial color={LIMB_JOINT} roughness={0.4} metalness={0.4} />
          </mesh>
          <mesh position={[0, -0.42, 0.03]}>
            <boxGeometry args={[0.16, 0.08, 0.2]} />
            <meshStandardMaterial color={LIMB} roughness={0.5} metalness={0.2} />
          </mesh>
        </group>

      </group>
    </group>
  )
}
