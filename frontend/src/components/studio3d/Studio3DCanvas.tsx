import { Suspense, useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, ContactShadows, Center } from '@react-three/drei'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { CanvasDesign } from '../../types'
import GarmentMesh from './GarmentMesh'
import ArtworkDecal, { PrintableAreaOutline } from './ArtworkDecal'

export interface Studio3DCanvasHandle {
  setCameraView: (view: 'front' | 'back' | 'left' | 'right' | 'reset') => void
  takeSnapshot: () => string
}

interface Studio3DCanvasProps {
  garmentType: string
  color: string
  frontDesigns: CanvasDesign[]
  backDesigns: CanvasDesign[]
  selectedId: string | null
  showPrintBoundary?: boolean
  autoRotate?: boolean
  onWebGLUnavailable?: () => void
}

/**
 * Controller inside R3F Canvas to animate camera position and capture snapshots
 */
function SceneController({
  controlsRef,
  onControllerReady,
}: {
  controlsRef: React.RefObject<OrbitControlsImpl | null>
  onControllerReady: (methods: {
    setView: (view: 'front' | 'back' | 'left' | 'right' | 'reset') => void
    capture: () => string
  }) => void
}) {
  const { camera, gl, scene } = useThree()

  useEffect(() => {
    const setView = (view: 'front' | 'back' | 'left' | 'right' | 'reset') => {
      if (!controlsRef.current) return
      const controls = controlsRef.current

      // Target positions for each preset view
      const distance = 4.6
      let targetX = 0
      let targetY = 0.2
      let targetZ = distance

      if (view === 'front') {
        targetX = 0; targetY = 0.2; targetZ = distance
      } else if (view === 'back') {
        targetX = 0; targetY = 0.2; targetZ = -distance
      } else if (view === 'left') {
        targetX = -distance; targetY = 0.2; targetZ = 0
      } else if (view === 'right') {
        targetX = distance; targetY = 0.2; targetZ = 0
      } else if (view === 'reset') {
        targetX = 0; targetY = 0.2; targetZ = distance
      }

      camera.position.set(targetX, targetY, targetZ)
      controls.target.set(0, 0, 0)
      controls.update()
    }

    const capture = (): string => {
      gl.render(scene, camera)
      return gl.domElement.toDataURL('image/png')
    }

    onControllerReady({ setView, capture })
  }, [camera, gl, scene, controlsRef, onControllerReady])

  return null
}

const Studio3DCanvas = forwardRef<Studio3DCanvasHandle, Studio3DCanvasProps>(function Studio3DCanvas(
  {
    garmentType,
    color,
    frontDesigns,
    backDesigns,
    selectedId,
    showPrintBoundary = true,
    autoRotate = false,
    onWebGLUnavailable,
  },
  ref
) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const [internalMethods, setInternalMethods] = useState<{
    setView: (view: 'front' | 'back' | 'left' | 'right' | 'reset') => void
    capture: () => string
  } | null>(null)

  // WebGL availability check
  const [webglSupported, setWebglSupported] = useState(true)

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      if (!gl) {
        setWebglSupported(false)
        if (onWebGLUnavailable) onWebGLUnavailable()
      }
    } catch {
      setWebglSupported(false)
      if (onWebGLUnavailable) onWebGLUnavailable()
    }
  }, [onWebGLUnavailable])

  useImperativeHandle(ref, () => ({
    setCameraView: (view) => {
      if (internalMethods) internalMethods.setView(view)
    },
    takeSnapshot: () => {
      if (internalMethods) return internalMethods.capture()
      return ''
    },
  }))

  if (!webglSupported) {
    return (
      <div className="w-full h-full min-h-[480px] flex flex-col items-center justify-center bg-zinc-100 rounded-3xl p-8 text-center">
        <p className="text-zinc-600 font-semibold mb-2">3D WebGL is unavailable on this device</p>
        <p className="text-xs text-zinc-400">Falling back to the high-resolution 2D studio canvas.</p>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full min-h-[500px] select-none rounded-3xl overflow-hidden bg-gradient-to-b from-zinc-100 via-zinc-50 to-zinc-200">
      <Canvas
        shadows
        gl={{ preserveDrawingBuffer: true, antialias: true, alpha: true }}
        camera={{ position: [0, 0.2, 4.6], fov: 45 }}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      >
        <Suspense fallback={null}>
          <SceneController
            controlsRef={controlsRef}
            onControllerReady={setInternalMethods}
          />

          {/* Studio Lighting Setup */}
          <ambientLight intensity={0.7} />
          {/* Key Light (Top-Front Right) */}
          <directionalLight
            position={[4, 6, 5]}
            intensity={1.2}
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-bias={-0.0001}
          />
          {/* Fill Light (Soft Left) */}
          <directionalLight position={[-4, 3, 3]} intensity={0.6} color="#dbeafe" />
          {/* Rim / Back Light (Edge definition) */}
          <directionalLight position={[0, 4, -5]} intensity={0.9} color="#fef3c7" />
          {/* Chest subtle point light */}
          <pointLight position={[0, 0.5, 2.5]} intensity={0.35} />

          {/* 3D Garment Center Group */}
          <Center top>
            <group>
              <GarmentMesh type={garmentType} color={color} />

              {/* Front Artwork Decals */}
              {frontDesigns.map((d) => (
                <ArtworkDecal
                  key={d.id}
                  design={d}
                  side="front"
                  isSelected={d.id === selectedId}
                  showPrintBoundary={showPrintBoundary}
                />
              ))}

              {/* Back Artwork Decals */}
              {backDesigns.map((d) => (
                <ArtworkDecal
                  key={d.id}
                  design={d}
                  side="back"
                  isSelected={d.id === selectedId}
                  showPrintBoundary={showPrintBoundary}
                />
              ))}

              {/* Print Boundaries (Wireframe Outlines) */}
              {showPrintBoundary && (
                <>
                  <PrintableAreaOutline side="front" />
                  <PrintableAreaOutline side="back" />
                </>
              )}
            </group>
          </Center>

          {/* Soft Ground Contact Shadow */}
          <ContactShadows
            position={[0, -2.1, 0]}
            opacity={0.45}
            scale={7}
            blur={2.4}
            far={4}
          />

          {/* Interactive 360° Camera OrbitControls */}
          <OrbitControls
            ref={controlsRef}
            enablePan={true}
            enableZoom={true}
            minDistance={2.4}
            maxDistance={7.5}
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={Math.PI / 1.75}
            dampingFactor={0.06}
            autoRotate={autoRotate}
            autoRotateSpeed={1.8}
          />
        </Suspense>
      </Canvas>
    </div>
  )
})

export default Studio3DCanvas
