import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { Decal } from '@react-three/drei'
import type { CanvasDesign } from '../../types'
import { PRINT_AREA_PX, PRINT_AREA_CM } from '../../config/printArea'

interface ArtworkDecalProps {
  design: CanvasDesign
  side: 'front' | 'back'
  isSelected?: boolean
  showPrintBoundary?: boolean
}

export default function ArtworkDecal({
  design,
  side,
  isSelected,
  showPrintBoundary,
}: ArtworkDecalProps) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null)

  const isFront = side === 'front'
  const printAreaPx = PRINT_AREA_PX[side]
  const printAreaCm = PRINT_AREA_CM[side]

  // Create texture from image URL or text
  useEffect(() => {
    let active = true

    if (design.type === 'image' && design.src) {
      const loader = new THREE.TextureLoader()
      loader.crossOrigin = 'anonymous'
      loader.load(
        design.src,
        (loadedTex) => {
          if (!active) return
          loadedTex.colorSpace = THREE.SRGBColorSpace
          loadedTex.needsUpdate = true
          setTexture(loadedTex)
        },
        undefined,
        (err) => console.error('Failed to load decal texture:', err)
      )
    } else if (design.type === 'text' && design.text) {
      // Render text onto an offscreen canvas
      const canvas = document.createElement('canvas')
      canvas.width = 1024
      canvas.height = 1024
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = design.color || '#000000'
        ctx.font = `${design.fontWeight || 'normal'} 96px ${design.fontFamily || 'Inter'}, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(design.text, canvas.width / 2, canvas.height / 2)

        const textTex = new THREE.CanvasTexture(canvas)
        textTex.colorSpace = THREE.SRGBColorSpace
        textTex.needsUpdate = true
        setTexture(textTex)
      }
    }

    return () => {
      active = false
    }
  }, [design.src, design.type, design.text, design.color, design.fontFamily, design.fontWeight])

  // Transform 2D canvas pixel coordinates to 3D garment coordinates
  const { position, rotation, scale, dimensionsCm } = useMemo(() => {
    // Relative position normalized within the print area (-0.5 to 0.5)
    const relX = ((design.x - printAreaPx.x) / printAreaPx.width) - 0.5 + (design.width / printAreaPx.width) / 2
    const relY = ((design.y - printAreaPx.y) / printAreaPx.height) - 0.5 + (design.height / printAreaPx.height) / 2

    // 3D placement:
    // Torso width spans roughly 2.6 units (-1.3 to 1.3)
    // Printable width in 3D ~ 1.5 units, height ~ 2.0 units
    // Front chest center ~ [0, 0.45, 0.65], Back center ~ [0, 0.45, -0.65]
    const p3dX = (isFront ? relX : -relX) * 1.45
    const p3dY = -relY * 1.85 + 0.35
    const p3dZ = isFront ? 0.66 : -0.66

    // Dimensions in 3D
    const scaleX = (design.width / printAreaPx.width) * 1.35
    const scaleY = (design.height / printAreaPx.height) * 1.75
    const depth = 0.5 // Decal projection depth through the surface

    // Rotation: angle around the normal axis (Z)
    const rotZ = ((design.rotation || 0) * Math.PI) / 180 * (isFront ? -1 : 1)
    const rotY = isFront ? 0 : Math.PI

    // Real-world cm dimensions
    const widthCm = Math.round((design.width / printAreaPx.width) * printAreaCm.width * 10) / 10
    const heightCm = Math.round((design.height / printAreaPx.height) * printAreaCm.height * 10) / 10

    return {
      position: [p3dX, p3dY, p3dZ] as [number, number, number],
      rotation: [0, rotY, rotZ] as [number, number, number],
      scale: [scaleX, scaleY, depth] as [number, number, number],
      dimensionsCm: { width: widthCm, height: heightCm },
    }
  }, [design.x, design.y, design.width, design.height, design.rotation, printAreaPx, printAreaCm, isFront])

  if (!texture) return null

  return (
    <group>
      {/* 3D Decal projected directly onto curved surface */}
      <Decal
        position={position}
        rotation={rotation}
        scale={scale}
      >
        <meshBasicMaterial
          map={texture}
          transparent
          polygonOffset
          polygonOffsetFactor={-4}
          depthTest
          depthWrite={false}
        />
      </Decal>

      {/* Selection bounding box indicator in 3D space */}
      {isSelected && (
        <group position={position} rotation={rotation}>
          <lineSegments>
            <edgesGeometry args={[new THREE.BoxGeometry(scale[0], scale[1], 0.02)]} />
            <lineBasicMaterial color={0x6366f1} linewidth={2} />
          </lineSegments>
        </group>
      )}
    </group>
  )
}

/**
 * Printable Area Boundary Outline (Wireframe boundary on front or back)
 */
export function PrintableAreaOutline({ side }: { side: 'front' | 'back' }) {
  const isFront = side === 'front'
  const posZ = isFront ? 0.68 : -0.68
  const rotY = isFront ? 0 : Math.PI
  const width = 1.45
  const height = 1.95

  return (
    <group position={[0, 0.35, posZ]} rotation={[0, rotY, 0]}>
      {/* Dashed boundary outline */}
      <lineSegments>
        <edgesGeometry args={[new THREE.PlaneGeometry(width, height)]} />
        <lineDashedMaterial
          color={0x60a5fa}
          dashSize={0.08}
          gapSize={0.04}
          transparent
          opacity={0.65}
        />
      </lineSegments>
    </group>
  )
}
