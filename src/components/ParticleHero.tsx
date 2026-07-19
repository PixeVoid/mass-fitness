"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Builds a rough "lunge" silhouette out of layered ellipses (head, torso,
 * front leg, back leg, arms) sampled into scatter points. This keeps the
 * signature element dependency-free (no external model/asset) while still
 * reading clearly as a body mid-movement, which is the hero's whole thesis:
 * "fitness from home" made literal, not a decorative orb.
 */
function buildSilhouettePoints(count: number): Float32Array {
  type Blob = { cx: number; cy: number; rx: number; ry: number; rot: number };

  const blobs: Blob[] = [
    { cx: 0, cy: 1.55, rx: 0.22, ry: 0.26, rot: 0 }, // head
    { cx: -0.02, cy: 0.9, rx: 0.34, ry: 0.55, rot: 0.05 }, // torso
    { cx: -0.55, cy: 1.05, rx: 0.14, ry: 0.42, rot: -0.9 }, // back arm (raised)
    { cx: 0.5, cy: 0.55, rx: 0.13, ry: 0.4, rot: 0.7 }, // front arm (forward)
    { cx: -0.35, cy: 0.05, rx: 0.18, ry: 0.55, rot: -0.35 }, // back thigh
    { cx: -0.62, cy: -0.75, rx: 0.13, ry: 0.5, rot: -0.15 }, // back shin
    { cx: 0.42, cy: -0.1, rx: 0.2, ry: 0.55, rot: 0.25 }, // front thigh
    { cx: 0.62, cy: -0.95, rx: 0.14, ry: 0.5, rot: 0.05 }, // front shin
  ];

  const positions = new Float32Array(count * 3);
  let i = 0;
  while (i < count) {
    const blob = blobs[Math.floor(Math.random() * blobs.length)];
    // sample a unit disk, then stretch/rotate/translate into the blob
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(Math.random());
    let x = Math.cos(angle) * radius * blob.rx;
    let y = Math.sin(angle) * radius * blob.ry;

    const cosR = Math.cos(blob.rot);
    const sinR = Math.sin(blob.rot);
    const rx = x * cosR - y * sinR;
    const ry = x * sinR + y * cosR;

    x = rx + blob.cx;
    y = ry + blob.cy;
    const z = (Math.random() - 0.5) * 0.25;

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    i++;
  }
  return positions;
}

function Silhouette({ density }: { density: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);

  const { target, scatterOffsets } = useMemo(() => {
    const target = buildSilhouettePoints(density);
    const scatterOffsets = new Float32Array(density * 3);
    for (let i = 0; i < density; i++) {
      scatterOffsets[i * 3] = (Math.random() - 0.5) * 6;
      scatterOffsets[i * 3 + 1] = (Math.random() - 0.5) * 6;
      scatterOffsets[i * 3 + 2] = (Math.random() - 0.5) * 3;
    }
    return { target, scatterOffsets };
  }, [density]);

  const positions = useMemo(() => new Float32Array(target), [target]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    // assemble over the first ~2.5s, then breathe gently forever after
    const assemble = Math.min(1, t / 2.5);
    const eased = 1 - Math.pow(1 - assemble, 3);
    const breathe = Math.sin(t * 1.2) * 0.015;

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
      pointsRef.current.rotation.y = Math.sin(t * 0.15) * 0.25;
    }
    if (materialRef.current) {
      materialRef.current.opacity = 0.35 + eased * 0.65;
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
        size={0.032}
        color="#ff4d2e"
        transparent
        opacity={0}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

/**
 * The scene itself. Density is passed in from the wrapper so mobile gets a
 * meaningfully lighter particle count (perf + LCP), not just a resized canvas.
 */
export default function ParticleHero({ density }: { density: number }) {
  return (
    <Canvas
      camera={{ position: [0, 0.6, 4.2], fov: 42 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true }}
    >
      <Silhouette density={density} />
    </Canvas>
  );
}
