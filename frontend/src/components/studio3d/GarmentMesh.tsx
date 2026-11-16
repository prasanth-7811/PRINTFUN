import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { createFabricTexture } from './FabricTextureGenerator'

interface GarmentMeshProps {
  type: 'Round Neck' | 'Polo' | 'Hoodies' | 'Oversized' | string
  color: string
  onMeshReady?: (mesh: THREE.Mesh) => void
}

export default function GarmentMesh({ type, color, onMeshReady }: GarmentMeshProps) {
  const mainMeshRef = useRef<THREE.Mesh>(null)

  // Fabric texture selection
  const fabricType = useMemo(() => {
    if (type === 'Polo') return 'pique'
    if (type === 'Hoodies') return 'fleece'
    return 'jersey'
  }, [type])

  const { normalMap, roughnessMap } = useMemo(() => {
    return createFabricTexture(fabricType)
  }, [fabricType])

  // Realistic PBR fabric material
  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness: fabricType === 'fleece' ? 0.88 : 0.80,
      metalness: 0.04,
      normalMap,
      normalScale: new THREE.Vector2(0.4, 0.4),
      roughnessMap,
      side: THREE.DoubleSide,
    })
  }, [color, fabricType, normalMap, roughnessMap])

  // Accent / detail material (e.g. collar, buttons, drawstrings)
  const ribMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(color).multiplyScalar(0.95), // slightly darker for ribbing
      roughness: 0.85,
      metalness: 0.02,
      normalMap,
      normalScale: new THREE.Vector2(0.6, 0.6),
    })
  }, [color, normalMap])

  const buttonMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: 0xf5f5f5, // pearl white button
      roughness: 0.25,
      metalness: 0.1,
    })
  }, [])

  const cordMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: 0xeeeeee,
      roughness: 0.7,
      metalness: 0.05,
    })
  }, [])

  const isHoodie = type === 'Hoodies'
  const isPolo = type === 'Polo'
  const isOversized = type === 'Oversized'

  // Scale multipliers for oversized / hoodie fits
  const widthMult = isOversized ? 1.15 : isHoodie ? 1.12 : 1.0
  const depthMult = isHoodie ? 1.15 : isOversized ? 1.10 : 1.0

  // 1. Torso Geometry: Smooth curved torso with realistic chest & waist
  const torsoGeometry = useMemo(() => {
    // Generate curved torso slice by slice
    const segmentsX = 48
    const segmentsY = 48
    const geom = new THREE.CylinderGeometry(
      1.38 * widthMult, // top radius (shoulders / chest)
      1.30 * widthMult, // bottom radius (waist / hem)
      3.2,              // height
      segmentsX,
      segmentsY,
      true              // open-ended
    )

    // Deform cylinder into realistic human torso (oval cross-section + chest curve)
    const pos = geom.attributes.position
    const uv = geom.attributes.uv

    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i)
      let y = pos.getY(i)
      let z = pos.getZ(i)

      // Normalize height from 0 (bottom) to 1 (top)
      const ny = (y + 1.6) / 3.2

      // Make cross section oval (flatter depth Z, wider width X)
      const zScale = (0.50 + 0.08 * Math.sin(ny * Math.PI)) * depthMult
      z *= zScale

      // Chest prominence at upper torso (ny ~ 0.65)
      if (z > 0) {
        const chestBulge = Math.exp(-Math.pow((ny - 0.65) / 0.25, 2)) * 0.16
        z += chestBulge
      }

      // Subtle fabric folds around waist (ny ~ 0.25 to 0.45)
      const fold = Math.sin(x * 6 + y * 4) * 0.02 * (1 - Math.abs(ny - 0.35) * 2)
      if (Math.abs(ny - 0.35) < 0.3) {
        z += fold
      }

      pos.setXYZ(i, x, y, z)
    }

    geom.computeVertexNormals()
    return geom
  }, [widthMult, depthMult])

  // Attach mesh ready callback
  const setRef = (mesh: THREE.Mesh | null) => {
    (mainMeshRef as any).current = mesh
    if (mesh && onMeshReady) {
      onMeshReady(mesh)
    }
  }

  return (
    <group position={[0, -0.2, 0]}>
      {/* Main Torso (Target for Decals & Artwork) */}
      <mesh
        ref={setRef}
        geometry={torsoGeometry}
        material={material}
        castShadow
        receiveShadow
      />

      {/* Round Neck Collar Rib */}
      {!isPolo && !isHoodie && (
        <group position={[0, 1.58, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh material={ribMaterial} castShadow>
            <torusGeometry args={[0.72 * widthMult, 0.08, 16, 48]} />
          </mesh>
        </group>
      )}

      {/* Polo Collar, Placket & Buttons */}
      {isPolo && (
        <group position={[0, 1.55, 0]}>
          {/* Folded Polo Collar Wings */}
          <mesh position={[0, 0.05, 0]} rotation={[0.2, 0, 0]} material={ribMaterial} castShadow>
            <torusGeometry args={[0.76, 0.12, 16, 48, Math.PI * 1.65]} />
          </mesh>
          {/* Collar tips / lapels */}
          <mesh position={[-0.25, -0.15, 0.62]} rotation={[0.4, 0.3, -0.2]} material={ribMaterial}>
            <boxGeometry args={[0.35, 0.28, 0.05]} />
          </mesh>
          <mesh position={[0.25, -0.15, 0.62]} rotation={[0.4, -0.3, 0.2]} material={ribMaterial}>
            <boxGeometry args={[0.35, 0.28, 0.05]} />
          </mesh>
          {/* Placket Strip down chest */}
          <mesh position={[0, -0.45, 0.64]} material={material}>
            <boxGeometry args={[0.24, 0.72, 0.04]} />
          </mesh>
          {/* 2 Pearl Buttons */}
          <mesh position={[0, -0.30, 0.67]} rotation={[Math.PI / 2, 0, 0]} material={buttonMaterial}>
            <cylinderGeometry args={[0.04, 0.04, 0.02, 16]} />
          </mesh>
          <mesh position={[0, -0.55, 0.67]} rotation={[Math.PI / 2, 0, 0]} material={buttonMaterial}>
            <cylinderGeometry args={[0.04, 0.04, 0.02, 16]} />
          </mesh>
        </group>
      )}

      {/* Hoodie Features: Hood, Kangaroo Pocket, Drawstrings */}
      {isHoodie && (
        <group>
          {/* Draped 3D Hood */}
          <group position={[0, 1.65, -0.15]}>
            {/* Main hood volume draped behind neck & head */}
            <mesh position={[0, 0.35, -0.35]} rotation={[-0.4, 0, 0]} material={material} castShadow>
              <sphereGeometry args={[0.85, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.75]} />
            </mesh>
            {/* Hood opening rim */}
            <mesh position={[0, 0.1, 0.25]} rotation={[0.3, 0, 0]} material={ribMaterial}>
              <torusGeometry args={[0.75, 0.1, 16, 36]} />
            </mesh>
          </group>

          {/* Kangaroo Pocket on lower front torso */}
          <group position={[0, -0.55, 0.58]}>
            <mesh material={material} castShadow>
              {/* Curved trapezoidal pocket pouch */}
              <boxGeometry args={[1.35, 0.85, 0.18]} />
            </mesh>
            {/* Left pocket entry rim */}
            <mesh position={[-0.68, 0.1, 0]} rotation={[0, 0, 0.4]} material={ribMaterial}>
              <boxGeometry args={[0.05, 0.6, 0.2]} />
            </mesh>
            {/* Right pocket entry rim */}
            <mesh position={[0.68, 0.1, 0]} rotation={[0, 0, -0.4]} material={ribMaterial}>
              <boxGeometry args={[0.05, 0.6, 0.2]} />
            </mesh>
          </group>

          {/* Drawstring Cords */}
          <group position={[0, 1.5, 0.62]}>
            {/* Left cord */}
            <mesh position={[-0.15, -0.45, 0]} rotation={[0, 0, 0.05]} material={cordMaterial}>
              <cylinderGeometry args={[0.015, 0.015, 0.8, 12]} />
            </mesh>
            {/* Left metal aglet */}
            <mesh position={[-0.17, -0.86, 0]} material={buttonMaterial}>
              <cylinderGeometry args={[0.02, 0.02, 0.07, 12]} />
            </mesh>
            {/* Right cord */}
            <mesh position={[0.15, -0.42, 0]} rotation={[0, 0, -0.06]} material={cordMaterial}>
              <cylinderGeometry args={[0.015, 0.015, 0.75, 12]} />
            </mesh>
            {/* Right metal aglet */}
            <mesh position={[0.17, -0.81, 0]} material={buttonMaterial}>
              <cylinderGeometry args={[0.02, 0.02, 0.07, 12]} />
            </mesh>
          </group>
        </group>
      )}

      {/* Sleeves (Left & Right) */}
      {!isHoodie ? (
        // Short Sleeves (T-shirt & Polo)
        <group>
          {/* Left Sleeve */}
          <group position={[-1.48 * widthMult, 1.15, 0]} rotation={[0, 0, 0.68]}>
            <mesh material={material} castShadow>
              <cylinderGeometry args={[0.48, 0.44, 1.05 * (isOversized ? 1.25 : 1), 32, 1, true]} />
            </mesh>
            {/* Sleeve Hem / Cuff */}
            <mesh position={[0, -0.52 * (isOversized ? 1.25 : 1), 0]} material={isPolo ? ribMaterial : material}>
              <torusGeometry args={[0.44, 0.035, 12, 32]} />
            </mesh>
          </group>

          {/* Right Sleeve */}
          <group position={[1.48 * widthMult, 1.15, 0]} rotation={[0, 0, -0.68]}>
            <mesh material={material} castShadow>
              <cylinderGeometry args={[0.48, 0.44, 1.05 * (isOversized ? 1.25 : 1), 32, 1, true]} />
            </mesh>
            {/* Sleeve Hem / Cuff */}
            <mesh position={[0, -0.52 * (isOversized ? 1.25 : 1), 0]} material={isPolo ? ribMaterial : material}>
              <torusGeometry args={[0.44, 0.035, 12, 32]} />
            </mesh>
          </group>
        </group>
      ) : (
        // Long Sleeves (Hoodie)
        <group>
          {/* Left Long Sleeve */}
          <group position={[-1.52 * widthMult, 0.6, 0]} rotation={[0, 0, 0.35]}>
            <mesh material={material} castShadow>
              <cylinderGeometry args={[0.54, 0.38, 2.3, 32, 1, true]} />
            </mesh>
            {/* Ribbed Wrist Cuff */}
            <mesh position={[0, -1.2, 0]} material={ribMaterial}>
              <cylinderGeometry args={[0.38, 0.36, 0.32, 32]} />
            </mesh>
          </group>

          {/* Right Long Sleeve */}
          <group position={[1.52 * widthMult, 0.6, 0]} rotation={[0, 0, -0.35]}>
            <mesh material={material} castShadow>
              <cylinderGeometry args={[0.54, 0.38, 2.3, 32, 1, true]} />
            </mesh>
            {/* Ribbed Wrist Cuff */}
            <mesh position={[0, -1.2, 0]} material={ribMaterial}>
              <cylinderGeometry args={[0.38, 0.36, 0.32, 32]} />
            </mesh>
          </group>
        </group>
      )}

      {/* Bottom Hem / Ribbed Waistband */}
      <group position={[0, -1.6, 0]}>
        <mesh material={isHoodie ? ribMaterial : material} castShadow>
          <cylinderGeometry
            args={[
              1.31 * widthMult,
              1.30 * widthMult,
              isHoodie ? 0.35 : 0.12,
              48
            ]}
          />
        </mesh>
      </group>
    </group>
  )
}
