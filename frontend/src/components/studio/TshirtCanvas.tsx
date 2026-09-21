import { useRef, useEffect, useState, useCallback } from 'react'
import type { CanvasDesign } from '../../types'
import {
  type StudioView,
  PRINT_AREA_PX,
  PRINT_AREA_CM,
  pxPerCm,
  clampDesignToArea,
} from '../../config/printArea'

interface Props {
  designs: CanvasDesign[]
  selectedId: string | null
  tshirtColour: string
  view: StudioView
  onSelect: (id: string | null) => void
  onUpdate: (id: string, updates: Partial<CanvasDesign>) => void
  onRotate?: (id: string, rotation: number) => void
  onResizeEnd?: () => void
}

export default function TshirtCanvas({
  designs,
  selectedId,
  tshirtColour,
  view,
  onSelect,
  onUpdate,
  onRotate,
  onResizeEnd,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [resizing, setResizing] = useState(false)
  const [resizeStart, setResizeStart] = useState({
    x: 0, y: 0, w: 0, h: 0, ox: 0, oy: 0, aspect: 1,
  })
  const [rotating, setRotating] = useState(false)
  const [rotateStart, setRotateStart] = useState({ x: 0, y: 0, angle: 0 })
  const [cursor, setCursor] = useState('crosshair')

  const imagesCache = useRef<Record<string, HTMLImageElement>>({})

  const PRINT_AREA = PRINT_AREA_PX[view]

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
    const cm = PRINT_AREA_CM[view]
    ctx.fillText(
      `${view === 'front' ? 'Front' : 'Back'} Printable Area · ${cm.width} × ${cm.height} cm`,
      PRINT_AREA.x + 4,
      PRINT_AREA.y - 4,
    )
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

        // Corner resize handles — drag any one to scale the artwork
        ctx.fillStyle = '#6366f1'
        const hw = d.width / 2 + 4
        const hh = d.height / 2 + 4
        ctx.fillRect(hw - 5, hh - 5, 10, 10)   // bottom-right
        ctx.fillRect(-hw - 5, hh - 5, 10, 10)  // bottom-left
        ctx.fillRect(hw - 5, -hh - 5, 10, 10)  // top-right
        ctx.fillRect(-hw - 5, -hh - 5, 10, 10) // top-left

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
    const l = d.x - 4, r = d.x + d.width + 4
    const t = d.y - 4, b = d.y + d.height + 4
    const nearX = Math.abs(pos.x - l) < 12 || Math.abs(pos.x - r) < 12
    const nearY = Math.abs(pos.y - t) < 12 || Math.abs(pos.y - b) < 12
    return nearX && nearY
  }

  const isOnRotateHandle = (pos: { x: number; y: number }, d: CanvasDesign) => {
    const cx = d.x + d.width / 2
    const cy = d.y - d.height / 2 - 35
    return Math.hypot(pos.x - cx, pos.y - cy) < 15
  }

  const cursorFor = (pos: { x: number; y: number }) => {
    const d = designs.find(x => x.id === selectedId)
    if (d && isOnRotateHandle(pos, d)) return 'grab'
    if (d && isOnResizeHandle(pos, d)) return 'nwse-resize'
    if (d && hitTest(pos)) return 'move'
    return 'crosshair'
  }

  const clampToPrintArea = (x: number, y: number, w: number, h: number) =>
    clampDesignToArea(view, { x, y, width: w, height: h })

  const onMouseDown = (e: React.MouseEvent) => {
    const pos = getPos(e)
    const hit = hitTest(pos)
    if (!hit) { onSelect(null); return }
    onSelect(hit.id)
    if (isOnResizeHandle(pos, hit)) {
      setResizing(true)
      const aspect = hit.originalWidth && hit.originalHeight
        ? hit.originalWidth / hit.originalHeight
        : hit.width / hit.height
      setResizeStart({
        x: pos.x, y: pos.y,
        w: hit.width, h: hit.height,
        ox: hit.x, oy: hit.y,
        aspect,
      })
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
      const { aspect, ox, oy, w: sw, h: sh } = resizeStart
      // Scale by how far the pointer is from the design's centre, versus at drag start.
      // This keeps the behaviour correct no matter which corner handle is dragged.
      const cx0 = ox + sw / 2
      const cy0 = oy + sh / 2
      const dist0 = Math.hypot(resizeStart.x - cx0, resizeStart.y - cy0)
      const dist = Math.hypot(pos.x - cx0, pos.y - cy0)
      const scale = dist0 > 0 ? dist / dist0 : 1
      let nw = Math.max(20, sw * scale)
      let nh = nw / aspect

      // Never exceed the printable area.
      const area = PRINT_AREA
      if (nw > area.width || nh > area.height) {
        if (nw / area.width > nh / area.height) {
          nw = area.width
          nh = nw / aspect
        } else {
          nh = area.height
          nw = nh * aspect
        }
      }

      // Grow from the centre so the artwork stays anchored where the user placed it.
      const nx = ox + (sw - nw) / 2
      const ny = oy + (sh - nh) / 2
      const clamped = clampToPrintArea(nx, ny, nw, nh)
      onUpdate(selectedId, {
        width: clamped.width,
        height: clamped.height,
        x: clamped.x,
        y: clamped.y,
      })
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

  const onMouseUp = () => {
    const wasResizing = resizing
    setDragging(false); setResizing(false); setRotating(false)
    if (wasResizing) onResizeEnd?.()
  }

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={480}
      className="w-full max-w-sm mx-auto touch-none select-none"
      style={{ maxHeight: '480px', cursor }}
      onMouseDown={onMouseDown}
      onMouseMove={(e) => { onMouseMove(e); setCursor(cursorFor(getPos(e))) }}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    />
  )
}