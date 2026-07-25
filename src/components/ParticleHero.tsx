"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Deterministic PRNG (Mulberry32) for pure React 19 rendering
 */
function createPRNG(seed: number) {
  let s = seed >>> 0;
  return function random() {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type MuscleSegment = {
  cx: number;
  cy: number;
  cz?: number;
  rx: number;
  ry: number;
  rz?: number;
  rot?: number;
  weight?: number;
  /** Fill the ellipse evenly instead of weighting toward its rim. */
  solid?: boolean;
};

/**
 * Radius falloff, as the exponent in `random() ** e`.
 *
 * `Math.sqrt` (e = 0.5) spreads points evenly over the ellipse's *area*, which
 * makes every segment a solid blob — and overlapping blobs merge into one
 * cloud with no edges. A smaller exponent pushes points toward the rim so each
 * muscle group keeps an outline. Parts too small to have a meaningful rim opt
 * out with `solid`.
 */
const SHELL_EXPONENT = 0.3;

/**
 * Builds a realistic, massive 3D bodybuilder particle silhouette holding heavy dumbbells
 * with realistic hands, feet, quad stance, and chest/lat definition.
 */
function buildBodybuilderLifterPoints(count: number, random: () => number): Float32Array {
  const segments: MuscleSegment[] = [
    // --- HEAD & TRAPS ---
    { cx: 0, cy: 1.35, rx: 0.16, ry: 0.2, rz: 0.16, weight: 1.2 },    // Head
    { cx: 0, cy: 1.15, rx: 0.48, ry: 0.14, rz: 0.2, weight: 1.5 },   // Trapezius / Neck

    // --- MASSIVE SHOULDERS ---
    { cx: -0.62, cy: 1.05, rx: 0.24, ry: 0.24, rz: 0.22, weight: 2.2 },  // Left Deltoid Shoulder
    { cx: 0.62, cy: 1.05, rx: 0.24, ry: 0.24, rz: 0.22, weight: 2.2 },   // Right Deltoid Shoulder

    // --- FLEXED BICEPS & HANDS HOLDING HEAVY DUMBBELLS ---
    { cx: -0.82, cy: 0.82, rx: 0.22, ry: 0.32, rz: 0.22, rot: -0.5, weight: 2.5 }, // Left Flexed Bicep
    { cx: -0.68, cy: 0.52, rx: 0.16, ry: 0.26, rz: 0.18, rot: 0.4, weight: 2.0 },  // Left Forearm & Hand

    { cx: 0.82, cy: 0.82, rx: 0.22, ry: 0.32, rz: 0.22, rot: 0.5, weight: 2.5 },  // Right Flexed Bicep
    { cx: 0.68, cy: 0.52, rx: 0.16, ry: 0.26, rz: 0.18, rot: -0.4, weight: 2.0 }, // Right Forearm & Hand

    // --- DUMBBELLS ---
    // Previously these sat at cy 0.48 against a forearm centred at 0.52, with a
    // footprint entirely inside it — so every particle was swallowed and the
    // weights never rendered at all. Dropped to 0.22, just below the forearm's
    // lower edge (0.26), and split into a bar with a plate at each end. Seen
    // edge-on like this a dumbbell is unmistakable; the inner plates stop at
    // ±0.46 against a torso reaching ±0.30, so they read as separate objects.
    { cx: -0.68, cy: 0.22, rx: 0.17, ry: 0.022, rz: 0.045, weight: 0.4, solid: true },
    { cx: -0.85, cy: 0.22, rx: 0.05, ry: 0.13, rz: 0.13, weight: 1.2, solid: true },
    { cx: -0.51, cy: 0.22, rx: 0.05, ry: 0.13, rz: 0.13, weight: 1.2, solid: true },

    { cx: 0.68, cy: 0.22, rx: 0.17, ry: 0.022, rz: 0.045, weight: 0.4, solid: true },
    { cx: 0.85, cy: 0.22, rx: 0.05, ry: 0.13, rz: 0.13, weight: 1.2, solid: true },
    { cx: 0.51, cy: 0.22, rx: 0.05, ry: 0.13, rz: 0.13, weight: 1.2, solid: true },

    // --- V-TAPER CHEST, LATS & 6-PACK ABS ---
    { cx: 0, cy: 0.92, rx: 0.52, ry: 0.28, rz: 0.26, weight: 3.0 },   // Massive Pectoral Chest
    { cx: 0, cy: 0.75, rx: 0.58, ry: 0.32, rz: 0.28, weight: 2.8 },   // Wide V-Taper Lats
    { cx: 0, cy: 0.38, rx: 0.34, ry: 0.34, rz: 0.22, weight: 2.2 },   // 6-Pack Abs / Core

    // --- PELVIS & POWERFUL QUADS ---
    { cx: 0, cy: 0.05, rx: 0.28, ry: 0.15, rz: 0.2, weight: 1.4 },    // Waist / Pelvis
    { cx: -0.32, cy: -0.28, rx: 0.24, ry: 0.44, rz: 0.24, rot: -0.12, weight: 2.2 }, // Left Quad Thigh
    { cx: -0.38, cy: -0.78, rx: 0.16, ry: 0.38, rz: 0.18, rot: -0.04, weight: 1.8 }, // Left Calf
    { cx: -0.4, cy: -1.02, rx: 0.14, ry: 0.08, rz: 0.26, weight: 1.4 },             // Left Foot / Shoe

    { cx: 0.32, cy: -0.28, rx: 0.24, ry: 0.44, rz: 0.24, rot: 0.12, weight: 2.2 },  // Right Quad Thigh
    { cx: 0.38, cy: -0.78, rx: 0.16, ry: 0.38, rz: 0.18, rot: 0.04, weight: 1.8 },  // Right Calf
    { cx: 0.4, cy: -1.02, rx: 0.14, ry: 0.08, rz: 0.26, weight: 1.4 },              // Right Foot / Shoe
  ];

  const totalWeight = segments.reduce((sum, s) => sum + (s.weight || 1), 0);
  const positions = new Float32Array(count * 3);

  let i = 0;
  while (i < count) {
    let r = random() * totalWeight;
    let seg = segments[0];
    for (const s of segments) {
      r -= s.weight || 1;
      if (r <= 0) {
        seg = s;
        break;
      }
    }

    const angle = random() * Math.PI * 2;
    const radius = Math.pow(random(), seg.solid ? 0.5 : SHELL_EXPONENT);
    let x = Math.cos(angle) * radius * seg.rx;
    let y = Math.sin(angle) * radius * seg.ry;
    const z = (random() - 0.5) * (seg.rz || 0.22);

    if (seg.rot) {
      const cosR = Math.cos(seg.rot);
      const sinR = Math.sin(seg.rot);
      const rx = x * cosR - y * sinR;
      const ry = x * sinR + y * cosR;
      x = rx;
      y = ry;
    }

    positions[i * 3] = x + seg.cx;
    positions[i * 3 + 1] = y + seg.cy;
    positions[i * 3 + 2] = z + (seg.cz || 0);

    i++;
  }

  return positions;
}

function Silhouette({ density, color }: { density: number; color: string }) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);

  const { target, scatterOffsets } = useMemo(() => {
    const prng = createPRNG(density ^ 777);
    const target = buildBodybuilderLifterPoints(density, prng);
    const scatterOffsets = new Float32Array(density * 3);
    for (let i = 0; i < density; i++) {
      scatterOffsets[i * 3] = (prng() - 0.5) * 5.0;
      scatterOffsets[i * 3 + 1] = (prng() - 0.5) * 5.0;
      scatterOffsets[i * 3 + 2] = (prng() - 0.5) * 2.5;
    }
    return { target, scatterOffsets };
  }, [density]);

  const positions = useMemo(() => new Float32Array(target), [target]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    
    // Smooth particle assembly (1.8s)
    const assemble = Math.min(1, t / 1.8);
    const eased = 1 - Math.pow(1 - assemble, 3);
    const breathe = Math.sin(t * 1.2) * 0.012;

    const posAttr = pointsRef.current?.geometry.attributes.position as
      | THREE.BufferAttribute
      | undefined;
    if (!posAttr) return;

    for (let i = 0; i < density; i++) {
      const ix = i * 3;
      const scatterX = target[ix] + scatterOffsets[ix];
      const scatterY = target[ix + 1] + scatterOffsets[ix + 1];
      const scatterZ = target[ix + 2] + scatterOffsets[ix + 2];

      posAttr.array[ix] = THREE.MathUtils.lerp(scatterX, target[ix], eased);
      posAttr.array[ix + 1] =
        THREE.MathUtils.lerp(scatterY, target[ix + 1], eased) +
        (eased > 0.98 ? breathe : 0);
      posAttr.array[ix + 2] = THREE.MathUtils.lerp(
        scatterZ,
        target[ix + 2],
        eased,
      );
    }
    posAttr.needsUpdate = true;

    if (pointsRef.current) {
      // Gentle 3D ambient rotation
      pointsRef.current.rotation.y = Math.sin(t * 0.2) * 0.2;
    }
    if (materialRef.current) {
      materialRef.current.opacity = eased * 0.55;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        size={0.028}
        color={color}
        transparent
        opacity={0}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

/**
 * Particle silhouette of a lifter. Drawn in the page's own text colour so it
 * reads as a mark rather than an illustration, and flips with the theme.
 */
export default function ParticleHero({
  density,
  color,
}: {
  density: number;
  color: string;
}) {
  return (
    <Canvas
      camera={{ position: [0, 0.1, 4.4], fov: 45 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true }}
    >
      <Silhouette density={density} color={color} />
    </Canvas>
  );
}
