import * as THREE from 'three'

/**
 * Procedurally generates realistic fabric normal maps and roughness maps using HTML5 Canvas.
 * No external image assets needed — instant, reliable, zero network latency.
 */
export function createFabricTexture(type: 'jersey' | 'pique' | 'fleece' = 'jersey'): {
  normalMap: THREE.CanvasTexture
  roughnessMap: THREE.CanvasTexture
} {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  // Normal map generation (RGB represents XYZ tangent space normals)
  // Base normal is (128, 128, 255) = pointing straight out (0, 0, 1)
  const imgData = ctx.createImageData(size, size)
  const data = imgData.data

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      let dx = 0
      let dy = 0

      if (type === 'jersey') {
        // Intertwined V-knit pattern of single jersey cotton
        const s = Math.sin((x + (y % 4 < 2 ? 0 : 2)) * 0.8)
        const c = Math.cos(y * 1.2)
        dx = s * 25
        dy = c * 20
      } else if (type === 'pique') {
        // Waffle / honeycomb knit pattern for polo pique fabric
        const wx = Math.sin(x * 0.6) * Math.cos(y * 0.6)
        dx = wx * 35
        dy = wx * 35
      } else if (type === 'fleece') {
        // Raised loopknit texture for heavyweight hoodies
        const noise = (Math.random() - 0.5) * 20
        const wave = Math.sin(x * 0.4) * Math.cos(y * 0.4) * 20
        dx = noise + wave
        dy = noise + wave
      }

      data[idx] = Math.max(0, Math.min(255, 128 + dx))     // R = X normal
      data[idx + 1] = Math.max(0, Math.min(255, 128 + dy)) // G = Y normal
      data[idx + 2] = 255                                   // B = Z normal
      data[idx + 3] = 255                                   // Alpha
    }
  }
  ctx.putImageData(imgData, 0, 0)

  const normalMap = new THREE.CanvasTexture(canvas)
  normalMap.wrapS = THREE.RepeatWrapping
  normalMap.wrapT = THREE.RepeatWrapping
  normalMap.repeat.set(type === 'fleece' ? 12 : 24, type === 'fleece' ? 12 : 24)
  normalMap.needsUpdate = true

  // Roughness canvas: slightly varying matte roughness
  const rCanvas = document.createElement('canvas')
  rCanvas.width = size
  rCanvas.height = size
  const rCtx = rCanvas.getContext('2d')!
  const rData = rCtx.createImageData(size, size)
  for (let i = 0; i < rData.data.length; i += 4) {
    const val = 190 + Math.floor(Math.random() * 40) // 0.75 - 0.90 roughness
    rData.data[i] = val
    rData.data[i + 1] = val
    rData.data[i + 2] = val
    rData.data[i + 3] = 255
  }
  rCtx.putImageData(rData, 0, 0)
  const roughnessMap = new THREE.CanvasTexture(rCanvas)
  roughnessMap.wrapS = THREE.RepeatWrapping
  roughnessMap.wrapT = THREE.RepeatWrapping
  roughnessMap.repeat.set(24, 24)
  roughnessMap.needsUpdate = true

  return { normalMap, roughnessMap }
}
