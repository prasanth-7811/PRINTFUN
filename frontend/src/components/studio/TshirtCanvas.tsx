import { useRef, useEffect, useState, useCallback } from 'react'
import type { CanvasDesign } from '../../types'

const PRINT_AREA = { x: 80, y: 100, width: 240, height: 280 }
const CM_TO_PX = 37.8

interface Props {
  designs: CanvasDesign[]
  selectedId: string | null
  tshirtColour: string
  view: 'front' | 'back'
  onSelect: (id: string | null) => void
  onUpdate: (id: string, updates: Partial<CanvasDesign>) => void
  onRotate?: (id: string, rotation: number) => void
}

export default function TshirtCanvas({ designs, selectedId, tshirtColour, view, onSelect, onUpdate, onRotate }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [resizing, setResizing] = useState(false)
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, w: 0, h: 0 })
  const [rotating, setRotating] = useState(false)
  const [rotateStart, setRotateStart] = useState({ x: 0, y: 0, angle: 0 })
  const imagesCache = useRef<Record<string, HTMLImageElement>>({})

  const loadImage = useCallback((src: string): Promise<HTMLImageElement> => {
    if (imagesCache.current[src]) return Promise.resolve(imagesCache.current[src])
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => { imagesCache.current[src] = img; resolve(img) }
      img.onerror = reject
      img.src = src
    })
  }, [])

  const draw = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw T-shirt shape
    ctx.save()
    ctx.fillStyle = tshirtColour
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 1.5

    const W = canvas.width, H = canvas.height
    ctx.beginPath()
    ctx.moveTo(W * 0.22, H * 0.08)
    ctx.quadraticCurveTo(W * 0.5, H * 0.18, W * 0.78, H * 0.08)
    ctx.lineTo(W * 0.95, H * 0.22)
    ctx.lineTo(W * 0.78, H * 0.35)
    ctx.lineTo(W * 0.78, H * 0.92)
    ctx.lineTo(W * 0.22, H * 0.92)
    ctx.lineTo(W * 0.22, H * 0.35)
    ctx.lineTo(W * 0.05, H * 0.22)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.restore()

    // Printable area
    ctx.save()
    ctx.strokeStyle = 'rgba(99,102,241,0.4)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.strokeRect(PRINT_AREA.x, PRINT_AREA.y, PRINT_AREA.width, PRINT_AREA.height)
    ctx.restore()

    ctx.save()
    ctx.fillStyle = 'rgba(99,102,241,0.5)'
    ctx.font = '9px Inter, sans-serif'
    ctx.fillText(`${view === 'front' ? 'Front' : 'Back'} Printable Area`, PRINT_AREA.x + 4, PRINT_AREA.y - 4)
    ctx.restore()

    // Draw designs
    for (const d of designs) {
      ctx.save()
      const cx = d.x + d.width / 2
      const cy = d.y + d.height / 2
      ctx.translate(cx, cy)
      ctx.rotate((d.rotation * Math.PI) / 180)

      if (d.type === 'image' && d.src) {
        try {
          const img = await loadImage(d.src)
          ctx.drawImage(img, -d.width / 2, -d.height / 2, d.width, d.height)
        } catch {}
      } else if (d.type === 'text' && d.text) {
        ctx.font = `${d.fontWeight || 'normal'} ${d.fontSize || 24}px ${d.fontFamily || 'Inter, sans-serif'}`
        ctx.fillStyle = d.color || '#000000'
        ctx.textAlign = (d.textAlign as CanvasTextAlign) || 'center'
        ctx.letterSpacing = `${d.letterSpacing || 0}px`
        ctx.fillText(d.text, 0, (d.fontSize || 24) / 3)
      }

      // Selection handles
      if (d.id === selectedId) {
        ctx.strokeStyle = '#6366f1'
        ctx.lineWidth = 2
        ctx.setLineDash([])
        ctx.strokeRect(-d.width / 2 - 4, -d.height / 2 - 4, d.width + 8, d.height + 8)

        // Resize handle (bottom-right)
        ctx.fillStyle = '#6366f1'
        ctx.fillRect(d.width / 2 - 2, d.height / 2 - 2, 10, 10)

        // Rotate handle (top-center)
        ctx.beginPath()
        ctx.moveTo(0, -d.height / 2 - 20)
        ctx.lineTo(0, -d.height / 2 - 35)
        ctx.strokeStyle = '#6366f1'
        ctx.lineWidth = 2
        ctx.stroke()
        ctx.fillStyle = '#6366f1'
        ctx.beginPath()
        ctx.arc(0, -d.height / 2 - 35, 6, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.restore()
    }
  }, [designs, selectedId, tshirtColour, view, loadImage])

  useEffect(() => { draw() }, [draw])

  const getPos = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const scaleX = canvasRef.current!.width / rect.width
    const scaleY = canvasRef.current!.height / rect.height
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  const hitTest = (pos: { x: number; y: number }) => {
    for (let i = designs.length - 1; i >= 0; i--) {
      const d = designs[i]
      const dx = pos.x - (d.x + d.width / 2)
      const dy = pos.y - (d.y + d.height / 2)
      const rad = (-d.rotation * Math.PI) / 180
      const lx = dx * Math.cos(rad) - dy * Math.sin(rad)
      const ly = dx * Math.sin(rad) + dy * Math.cos(rad)
      if (Math.abs(lx) <= d.width / 2 + 4 && Math.abs(ly) <= d.height / 2 + 4) return d
    }
    return null
  }

  const isOnResizeHandle = (pos: { x: number; y: number }, d: CanvasDesign) => {
    const hx = d.x + d.width + 4
    const hy = d.y + d.height + 4
    return Math.abs(pos.x - hx) < 12 && Math.abs(pos.y - hy) < 12
  }

  const isOnRotateHandle = (pos: { x: number; y: number }, d: CanvasDesign) => {
    const cx = d.x + d.width / 2
    const cy = d.y - d.height / 2 - 35
    return Math.hypot(pos.x - cx, pos.y - cy) < 15
  }

  const clampToPrintArea = (x: number, y: number, w: number, h: number) => ({
    x: Math.max(PRINT_AREA.x, Math.min(x, PRINT_AREA.x + PRINT_AREA.width - w)),
    y: Math.max(PRINT_AREA.y, Math.min(y, PRINT_AREA.y + PRINT_AREA.height - h)),
  })

  const onMouseDown = (e: React.MouseEvent) => {
    const pos = getPos(e)
    const hit = hitTest(pos)
    if (!hit) { onSelect(null); return }
    onSelect(hit.id)
    if (isOnResizeHandle(pos, hit)) {
      setResizing(true)
      setResizeStart({ x: pos.x, y: pos.y, w: hit.width, h: hit.height })
    } else if (isOnRotateHandle(pos, hit)) {
      setRotating(true)
      const cx = hit.x + hit.width / 2
      const cy = hit.y + hit.height / 2
      setRotateStart({ x: pos.x, y: pos.y, angle: hit.rotation })
    } else {
      setDragging(true)
      setDragStart({ x: pos.x - hit.x, y: pos.y - hit.y })
    }
  }

  const onMouseMove = (e: React.MouseEvent) => {
    if (!selectedId) return
    const pos = getPos(e)
    const d = designs.find(x => x.id === selectedId)
    if (!d) return

    if (dragging) {
      const nx = pos.x - dragStart.x
      const ny = pos.y - dragStart.y
      const clamped = clampToPrintArea(nx, ny, d.width, d.height)
      onUpdate(selectedId, clamped)
    } else if (resizing) {
      const dw = pos.x - resizeStart.x
      const dh = pos.y - resizeStart.y
      const nw = Math.max(20, resizeStart.w + dw)
      const nh = Math.max(20, resizeStart.h + dh)
      const maxW = PRINT_AREA.x + PRINT_AREA.width - d.x
      const maxH = PRINT_AREA.y + PRINT_AREA.height - d.y
      onUpdate(selectedId, { width: Math.min(nw, maxW), height: Math.min(nh, maxH) })
    } else if (rotating && onRotate) {
      const cx = d.x + d.width / 2
      const cy = d.y + d.height / 2
      const dx1 = rotateStart.x - cx
      const dy1 = rotateStart.y - cy
      const dx2 = pos.x - cx
      const dy2 = pos.y - cy
      const angle1 = Math.atan2(dy1, dx1) * 180 / Math.PI
      const angle2 = Math.atan2(dy2, dx2) * 180 / Math.PI
      let newAngle = rotateStart.angle + (angle2 - angle1)
      newAngle = Math.round(newAngle / 15) * 15 // Snap to 15 degrees
      onRotate(selectedId, newAngle)
    }
  }

  const onMouseUp = () => { setDragging(false); setResizing(false); setRotating(false) }

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={480}
      className="w-full max-w-sm mx-auto cursor-crosshair touch-none select-none"
      style={{ maxHeight: '480px' }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    />
  )
}