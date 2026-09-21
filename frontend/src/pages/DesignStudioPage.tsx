import { useState, useCallback, useEffect, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Trash2, Copy, Undo2, Redo2, Type, ShoppingCart, RotateCcw, Minus, Plus, Lock, Unlock } from 'lucide-react'
import { nanoid } from 'nanoid'
import { useQuery } from '@tanstack/react-query'
import TshirtCanvas from '../components/studio/TshirtCanvas'
import UploadPanel from '../components/studio/UploadPanel'
import PricePanel from '../components/studio/PricePanel'
import QualityIndicator from '../components/studio/QualityIndicator'
import type { CanvasDesign, Audience } from '../types'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import { PRINT_AREA } from '../config/brand'
import { productService } from '../services/products'
import {
  type StudioView,
  PRINT_AREA_CM,
  pxPerCm,
  fitDesignToArea,
} from '../config/printArea'

const FALLBACK_COLOURS = [
  { name: 'Black', hex: '#1a1a1a' },
  { name: 'White', hex: '#f5f5f5' },
  { name: 'Grey', hex: '#9ca3af' },
  { name: 'Navy', hex: '#1e3a5f' },
  { name: 'Red', hex: '#dc2626' },
  { name: 'Green', hex: '#16a34a' },
  { name: 'Yellow', hex: '#eab308' },
  { name: 'Purple', hex: '#7c3aed' },
]
const FALLBACK_SIZES = ['S', 'M', 'L', 'XL', '2XL']
const FALLBACK_PRICE = 599
const FONTS = ['Inter', 'Georgia', 'Impact', 'Courier New', 'Arial Black']

type View = StudioView

interface DesignWithView {
  front: CanvasDesign[]
  back: CanvasDesign[]
}

export default function DesignStudioPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { addItem } = useCart()

  const [colour, setColour] = useState(FALLBACK_COLOURS[0])
  const [view, setView] = useState<View>('front')
  const [frontDesigns, setFrontDesigns] = useState<CanvasDesign[]>([])
  const [backDesigns, setBackDesigns] = useState<CanvasDesign[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sizeQty, setSizeQty] = useState<Record<string, number>>({})
  const [history, setHistory] = useState<DesignWithView[]>([])
  const [historyIdx, setHistoryIdx] = useState(-1)
  const [activeTab, setActiveTab] = useState<'upload' | 'library' | 'text'>('upload')
  const [textInput, setTextInput] = useState('Your Text')
  const [textFont, setTextFont] = useState('Inter')
  const [textSize, setTextSize] = useState(32)
  const [textColor, setTextColor] = useState('#000000')
  const [textWeight, setTextWeight] = useState('normal')
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('center')
  const [letterSpacing, setLetterSpacing] = useState(0)
  const [addingToCart, setAddingToCart] = useState(false)
  const [lockAspect, setLockAspect] = useState(true)

  // --- Resolve the product + variant being customised ---------------------
  const productIdParam = searchParams.get('product')
  const { data: product } = useQuery({
    queryKey: ['product', productIdParam],
    queryFn: () => productService.getProduct(productIdParam!),
    enabled: !!productIdParam,
  })

  const audienceParam = (searchParams.get('audience') as Audience | null) || null
  const variantParam = searchParams.get('variant')

  const variant = useMemo(() => {
    if (!product) return null
    const variants = product.variants || []
    if (variantParam) {
      const byId = variants.find(v => String(v.id) === variantParam)
      if (byId) return byId
    }
    const wantedAudience = audienceParam || 'adults'
    return variants.find(v => v.audience === wantedAudience && v.configured && v.is_active)
      || variants.find(v => v.configured && v.is_active)
      || variants[0]
      || null
  }, [product, variantParam, audienceParam])

  // Only the colours/sizes this variant actually offers.
  const productColours = variant?.colours?.length ? variant.colours : (product?.colours?.length ? product.colours : FALLBACK_COLOURS)
  const productSizes = variant?.sizes?.length ? variant.sizes : (product?.sizes?.length ? product.sizes : FALLBACK_SIZES)
  const unitPrice = variant?.price ?? product?.base_price ?? FALLBACK_PRICE
  const buyable = !!(variant && variant.configured && !variant.coming_soon && !product?.coming_soon)

  // Keep the chosen colour inside the variant's available colours.
  useEffect(() => {
    if (!productColours.some(c => c.name === colour.name)) {
      setColour(productColours[0] || FALLBACK_COLOURS[0])
    }
  }, [productColours, colour.name])

  // Drop any quantity for a size this variant doesn't offer.
  useEffect(() => {
    setSizeQty(prev => {
      const next: Record<string, number> = {}
      Object.entries(prev).forEach(([size, qty]) => {
        if (productSizes.includes(size) && qty > 0) next[size] = qty
      })
      return Object.keys(next).length === Object.keys(prev).length ? prev : next
    })
  }, [productSizes])

  const designs = view === 'front' ? frontDesigns : backDesigns
  const setDesigns = view === 'front' ? setFrontDesigns : setBackDesigns

  // Initialize from URL params
  useEffect(() => {
    const designImage = searchParams.get('designImage')
    const designName = searchParams.get('designName')
    const productId = searchParams.get('product')
    const colourParam = searchParams.get('colour')
    
    if (colourParam) {
      const c = productColours.find(x => x.name.toLowerCase() === colourParam.toLowerCase())
        || FALLBACK_COLOURS.find(x => x.name.toLowerCase() === colourParam.toLowerCase())
      if (c) setColour(c)
    }
    
    if (designImage) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const fit = fitDesignToArea('front', img.naturalWidth, img.naturalHeight)
        const d: CanvasDesign = {
          id: nanoid(), type: 'image', src: designImage,
          x: fit.x, y: fit.y, width: fit.width, height: fit.height, rotation: 0,
          originalWidth: img.naturalWidth, originalHeight: img.naturalHeight,
        }
        setFrontDesigns([d])
        setSelectedId(d.id)
      }
      img.src = designImage
    }
  }, [])

  const pushHistory = useCallback((f: CanvasDesign[], b: CanvasDesign[]) => {
    setHistory(prev => [...prev.slice(0, historyIdx + 1), { front: f, back: b }])
    setHistoryIdx(prev => prev + 1)
  }, [historyIdx])

  const undo = () => {
    if (historyIdx <= 0) return
    const prev = history[historyIdx - 1]
    setFrontDesigns(prev.front); setBackDesigns(prev.back)
    setHistoryIdx(i => i - 1)
    setSelectedId(null)
  }

  const redo = () => {
    if (historyIdx >= history.length - 1) return
    const next = history[historyIdx + 1]
    setFrontDesigns(next.front); setBackDesigns(next.back)
    setHistoryIdx(i => i + 1)
    setSelectedId(null)
  }

  const updateDesign = (id: string, updates: Partial<CanvasDesign>) => {
    setDesigns(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d))
  }

  const rotateDesign = (id: string, rotation: number) => {
    updateDesign(id, { rotation })
  }

  const deleteSelected = () => {
    if (!selectedId) return
    const next = designs.filter(d => d.id !== selectedId)
    setDesigns(next); setSelectedId(null)
    pushHistory(view === 'front' ? next : frontDesigns, view === 'back' ? next : backDesigns)
  }

  const duplicateSelected = () => {
    const d = designs.find(x => x.id === selectedId)
    if (!d) return
    const copy = { ...d, id: nanoid(), x: d.x + 10, y: d.y + 10 }
    const next = [...designs, copy]
    setDesigns(next); setSelectedId(copy.id)
    pushHistory(view === 'front' ? next : frontDesigns, view === 'back' ? next : backDesigns)
  }

  const handleUpload = (_file: File, dataUrl: string, w: number, h: number) => {
    const fit = fitDesignToArea(view, w, h)
    const d: CanvasDesign = {
      id: nanoid(), type: 'image', src: dataUrl,
      x: fit.x, y: fit.y, width: fit.width, height: fit.height, rotation: 0,
      originalWidth: w, originalHeight: h,
    }
    const next = [...designs, d]
    setDesigns(next); setSelectedId(d.id)
    pushHistory(view === 'front' ? next : frontDesigns, view === 'back' ? next : backDesigns)
  }

  const addText = () => {
    if (!textInput.trim()) return
    const d: CanvasDesign = {
      id: nanoid(), type: 'text', text: textInput,
      x: 130, y: 200, width: 140, height: 40, rotation: 0,
      fontSize: textSize, fontFamily: textFont, fontWeight: textWeight, color: textColor, textAlign, letterSpacing,
    }
    const next = [...designs, d]
    setDesigns(next); setSelectedId(d.id)
    pushHistory(view === 'front' ? next : frontDesigns, view === 'back' ? next : backDesigns)
  }

  const selected = designs.find(d => d.id === selectedId)
  const totalQty = Object.values(sizeQty).reduce((a, b) => a + b, 0)

  // Max printable size for the side currently being edited
  const maxPrint = PRINT_AREA_CM[view]
  const MAX_PRINT_WIDTH_CM = maxPrint.width
  const MAX_PRINT_HEIGHT_CM = maxPrint.height

  // Calculate dimensions in cm (print scale depends on the active side)
  const getDimensionsCm = (d: CanvasDesign) => ({
    width: d.width / pxPerCm(view),
    height: d.height / pxPerCm(view),
  })

  // Real printed size (in cm) of the largest design on a given side — used for the
  // order record so production knows what size to print.
  const largestDesignCm = (v: StudioView, list: CanvasDesign[]) => {
    const scale = pxPerCm(v)
    const biggest = list.reduce((best, d) =>
      (d.width * d.height) > (best.width * best.height) ? d : best, list[0])
    return {
      width: +(biggest.width / scale).toFixed(1),
      height: +(biggest.height / scale).toFixed(1),
    }
  }

  const handleDimensionChange = (dim: 'width' | 'height', value: string) => {
    if (!selected) return
    const num = parseFloat(value)
    if (isNaN(num) || num <= 0) return

    const maxCm = dim === 'width' ? MAX_PRINT_WIDTH_CM : MAX_PRINT_HEIGHT_CM
    if (num > maxCm) return

    const px = num * pxPerCm(view)

    if (lockAspect && selected.originalWidth && selected.originalHeight) {
      const aspect = selected.originalWidth / selected.originalHeight
      const otherPx = dim === 'width' ? px / aspect : px * aspect
      const otherCm = dim === 'width' ? num / aspect : num * aspect
      const otherMaxCm = dim === 'width' ? MAX_PRINT_HEIGHT_CM : MAX_PRINT_WIDTH_CM

      if (otherCm <= otherMaxCm) {
        updateDesign(selectedId!, { [dim]: px, [dim === 'width' ? 'height' : 'width']: otherPx })
      }
    } else {
      updateDesign(selectedId!, { [dim]: px })
    }
  }

  const handleAddToCart = async () => {
    if (!isAuthenticated) { navigate('/login?redirect=/design-studio'); return }
    if (!buyable) { alert('This variant is not available for purchase yet. Please contact us for pricing.'); return }
    if (totalQty === 0) { alert('Please select at least one size and quantity.'); return }
    if (frontDesigns.length === 0 && backDesigns.length === 0) { alert('Add a design to continue'); return }

    setAddingToCart(true)
    try {
      await addItem({
        product_id: Number(searchParams.get('product') || 1),
        variant_id: variant?.id,
        colour: colour.name, colour_hex: colour.hex, sizes: sizeQty,
        front_design: JSON.stringify(frontDesigns),
        back_design: JSON.stringify(backDesigns),
        front_dimensions: frontDesigns.length
          ? largestDesignCm('front', frontDesigns)
          : PRINT_AREA.front,
        back_dimensions: backDesigns.length
          ? largestDesignCm('back', backDesigns)
          : PRINT_AREA.back,
      })
      navigate('/cart')
    } catch {
      setAddingToCart(false)
    }
  }

  const resetView = () => {
    const next = []
    setDesigns(next); setSelectedId(null)
    pushHistory(view === 'front' ? next : frontDesigns, view === 'back' ? next : backDesigns)
  }

  const hasDesigns = frontDesigns.length > 0 || backDesigns.length > 0

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="bg-white border-b border-zinc-100 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-16 z-20">
        <div className="flex items-center gap-3">
          <h1 className="font-black text-lg">Design Studio</h1>
          <div className="flex items-center gap-1 bg-zinc-100 rounded-xl px-2 py-1">
            {(['front', 'back'] as const).map(v => (
              <button key={v} onClick={() => { setView(v); setSelectedId(null) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${view === v ? 'bg-black text-white' : 'text-zinc-500 hover:text-zinc-700'}`}>
                {v}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={undo} disabled={historyIdx <= 0} className="p-2 rounded-lg hover:bg-zinc-100 disabled:opacity-30" title="Undo"><Undo2 size={16} /></button>
          <button onClick={redo} disabled={historyIdx >= history.length - 1} className="p-2 rounded-lg hover:bg-zinc-100 disabled:opacity-30" title="Redo"><Redo2 size={16} /></button>
          {selectedId && (
            <>
              <button onClick={duplicateSelected} className="p-2 rounded-lg hover:bg-zinc-100" title="Duplicate"><Copy size={16} /></button>
              <button onClick={deleteSelected} className="p-2 rounded-lg hover:bg-red-50 text-red-500" title="Delete"><Trash2 size={16} /></button>
              <button onClick={resetView} className="p-2 rounded-lg hover:bg-zinc-100" title="Clear this side">Clear</button>
            </>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid lg:grid-cols-[280px_1fr_300px] gap-6">

          {/* Left Panel */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-zinc-100 p-4">
              <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl mb-4">
                {(['upload', 'library', 'text'] as const).map(t => (
                  <button key={t} onClick={() => setActiveTab(t)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${activeTab === t ? 'bg-white text-black shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
                    {t === 'upload' ? 'Upload' : t === 'library' ? 'Library' : 'Text'}
                  </button>
                ))}
              </div>

              {activeTab === 'upload' && <UploadPanel onUpload={handleUpload} />}

              {activeTab === 'library' && (
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                  {[
                    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&q=80',
                    'https://images.unsplash.com/photo-1571945153237-4929e783af4a?w=200&q=80',
                    'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=200&q=80',
                    'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=200&q=80',
                    'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=200&q=80',
                    'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=200&q=80',
                  ].map((src, i) => (
                    <button key={i} onClick={() => handleUpload(new File([], ''), src, 800, 800)}
                      className="aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-black transition-colors">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {activeTab === 'text' && (
                <div className="space-y-3">
                  <input value={textInput} onChange={e => setTextInput(e.target.value)} placeholder="Enter text..."
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black" />
                  <select value={textFont} onChange={e => setTextFont(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none">
                    {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-zinc-400 mb-1 block">Size</label>
                      <input type="number" value={textSize} onChange={e => setTextSize(Number(e.target.value))} min={10} max={120}
                        className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block">Color</label>
                      <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)}
                        className="w-10 h-10 rounded-xl border border-zinc-200 cursor-pointer" />
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {['normal', 'bold'].map(w => (
                      <button key={w} onClick={() => setTextWeight(w)}
                        className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${textWeight === w ? 'bg-black text-white border-black' : 'border-zinc-200 hover:bg-zinc-50'}`}>
                        {w === 'bold' ? 'Bold' : 'Normal'}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    {['left', 'center', 'right'].map(a => (
                      <button key={a} onClick={() => setTextAlign(a as 'left' | 'center' | 'right')}
                        className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${textAlign === a ? 'bg-black text-white border-black' : 'border-zinc-200 hover:bg-zinc-50'}`}
                        title={a}>
                        {a === 'left' ? '◧' : a === 'center' ? '◨' : '◩'}
                      </button>
                    ))}
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Letter Spacing: {letterSpacing}px</label>
                    <input type="range" min={-2} max={20} value={letterSpacing}
                      onChange={e => setLetterSpacing(Number(e.target.value))}
                      className="w-full accent-black" />
                  </div>
                  <button onClick={addText} className="w-full py-2.5 bg-black text-white rounded-xl text-sm font-semibold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2">
                    <Type size={14} /> Add Text
                  </button>
                </div>
              )}
            </div>

            {selected && selected.type === 'image' && (
              <div className="bg-white rounded-2xl border border-zinc-100 p-4 space-y-3">
                <h4 className="text-sm font-semibold text-zinc-900">Design Controls</h4>
                
                {/* Rotation */}
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Rotation: {selected.rotation}°</label>
                  <div className="flex gap-2">
                    <input type="range" min={-180} max={180} value={selected.rotation}
                      onChange={e => rotateDesign(selectedId!, Number(e.target.value))}
                      className="flex-1 accent-black" />
                    <input type="number" value={selected.rotation} onChange={e => rotateDesign(selectedId!, Number(e.target.value))}
                      min={-180} max={180} step={15}
                      className="w-20 px-2 py-1.5 border border-zinc-200 rounded-lg text-xs text-center focus:outline-none" />
                  </div>
                  <div className="flex gap-1 mt-1">
                    {[-90, -45, 0, 45, 90, 180].map(a => (
                      <button key={a} onClick={() => rotateDesign(selectedId!, a)}
                        className={`flex-1 py-1 text-xs rounded-lg border transition-colors ${selected.rotation === a ? 'bg-black text-white border-black' : 'border-zinc-200 hover:bg-zinc-50'}`}>
                        {a}°
                      </button>
                    ))}
                  </div>
                </div>

                {/* Manual Dimensions */}
                <div className="border-t border-zinc-100 pt-3">
                  <h5 className="text-xs font-semibold text-zinc-900 mb-2">Dimensions (cm)</h5>
                  <div className="flex items-center gap-2 mb-2">
                    <button onClick={() => setLockAspect(!lockAspect)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${lockAspect ? 'bg-black text-white' : 'border border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}>
                      {lockAspect ? <Lock size={12} /> : <Unlock size={12} />}
                      <span>Lock Aspect</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block">Width (cm)</label>
                      <input type="number" value={getDimensionsCm(selected).width.toFixed(1)}
                        onChange={e => handleDimensionChange('width', e.target.value)}
                        step="0.5" min="1" max={MAX_PRINT_WIDTH_CM}
                        className="w-full px-2 py-1.5 border border-zinc-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-black" />
                      <p className="text-xs text-zinc-400 mt-0.5">Max: {MAX_PRINT_WIDTH_CM} cm</p>
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block">Height (cm)</label>
                      <input type="number" value={getDimensionsCm(selected).height.toFixed(1)}
                        onChange={e => handleDimensionChange('height', e.target.value)}
                        step="0.5" min="1" max={MAX_PRINT_HEIGHT_CM}
                        className="w-full px-2 py-1.5 border border-zinc-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-black" />
                      <p className="text-xs text-zinc-400 mt-0.5">Max: {MAX_PRINT_HEIGHT_CM} cm</p>
                    </div>
                  </div>
                </div>

                {selected.originalWidth && (
                  <QualityIndicator
                    width={selected.width} height={selected.height}
                    originalWidth={selected.originalWidth}
                    originalHeight={selected.originalHeight || selected.originalWidth}
                  />
                )}
              </div>
            )}

            {selected && selected.type === 'text' && (
              <div className="bg-white rounded-2xl border border-zinc-100 p-4 space-y-3">
                <h4 className="text-sm font-semibold text-zinc-900">Text Controls</h4>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Font Size: {selected.fontSize}px</label>
                  <input type="range" min={10} max={120} value={selected.fontSize}
                    onChange={e => updateDesign(selectedId!, { fontSize: Number(e.target.value) })}
                    className="w-full accent-black" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Letter Spacing: {selected.letterSpacing || 0}px</label>
                  <input type="range" min={-2} max={20} value={selected.letterSpacing || 0}
                    onChange={e => updateDesign(selectedId!, { letterSpacing: Number(e.target.value) })}
                    className="w-full accent-black" />
                </div>
                <div className="flex gap-1">
                  {['left', 'center', 'right'].map(a => (
                    <button key={a} onClick={() => updateDesign(selectedId!, { textAlign: a })}
                      className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${selected.textAlign === a ? 'bg-black text-white border-black' : 'border-zinc-200 hover:bg-zinc-50'}`}>
                      {a === 'left' ? '◧' : a === 'center' ? '◨' : '◩'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Center Canvas */}
          <div className="flex flex-col items-center gap-4">
            <div className="bg-white rounded-3xl border border-zinc-100 p-6 w-full max-w-sm shadow-sm">
              <TshirtCanvas
                designs={designs}
                selectedId={selectedId}
                tshirtColour={colour.hex}
                view={view}
                onSelect={setSelectedId}
                onUpdate={updateDesign}
                onRotate={rotateDesign}
                onResizeEnd={() =>
                  pushHistory(
                    view === 'front' ? frontDesigns : backDesigns,
                    view === 'back' ? backDesigns : frontDesigns,
                  )
                }
              />
            </div>

            <div className="bg-white rounded-2xl border border-zinc-100 p-4 w-full max-w-sm">
              <p className="text-xs font-semibold text-zinc-500 mb-3 uppercase tracking-wide">
                {product ? `${product.name} — Colour` : 'T-Shirt Colour'}
              </p>
              <div className="flex flex-wrap gap-2">
                {productColours.map(c => (
                  <button key={c.name} onClick={() => setColour(c)} title={c.name}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${colour.name === c.name ? 'border-black scale-110' : 'border-zinc-200 hover:border-zinc-400'}`}
                    style={{ background: c.hex }} />
                ))}
              </div>
              <p className="text-xs text-zinc-400 mt-2">{colour.name}</p>
              {variant && (
                <p className="text-xs text-zinc-400 mt-1">{variant.name} · {variant.audience === 'kids' ? 'Kids' : 'Adults'}</p>
              )}
            </div>
          </div>

          {/* Right Panel */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-zinc-100 p-4">
              <h3 className="font-semibold text-sm text-zinc-900 mb-3">Sizes & Quantities</h3>
              <div className="space-y-2">
                {productSizes.map(size => {
                  const qty = sizeQty[size] || 0
                  return (
                    <div key={size} className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${qty > 0 ? 'border-black bg-zinc-50' : 'border-zinc-100'}`}>
                      <span className="text-sm font-semibold w-10">{size}</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setSizeQty(p => ({ ...p, [size]: Math.max(0, (p[size] || 0) - 1) }))} className="w-6 h-6 rounded-lg border border-zinc-200 flex items-center justify-center text-sm font-bold hover:bg-zinc-100"><Minus size={12} /></button>
                        <span className="w-5 text-center text-sm font-semibold">{qty}</span>
                        <button onClick={() => setSizeQty(p => ({ ...p, [size]: (p[size] || 0) + 1 }))} className="w-6 h-6 rounded-lg border border-zinc-200 flex items-center justify-center text-sm font-bold hover:bg-zinc-100"><Plus size={12} /></button>
                      </div>
                    </div>
                  )
                })}
              </div>
              {totalQty > 0 && <p className="text-xs text-zinc-500 mt-2 font-medium">Total: {totalQty} piece{totalQty > 1 ? 's' : ''}</p>}
              {!buyable && (
                <p className="text-xs text-amber-600 mt-2 font-medium">
                  {variant?.audience === 'kids'
                    ? 'Contact for Kids Pricing — this variant cannot be checked out yet.'
                    : 'This variant is coming soon.'}
                </p>
              )}
            </div>

            <PricePanel
              basePrice={unitPrice}
              hasFront={frontDesigns.length > 0}
              hasBack={backDesigns.length > 0}
              totalQty={totalQty}
              couponDiscount={0}
            />

            <div className="bg-white rounded-2xl border border-zinc-100 p-4 text-xs space-y-1.5 text-zinc-500">
              <div className="flex justify-between"><span>Front designs</span><span className="font-medium text-zinc-900">{frontDesigns.length}</span></div>
              <div className="flex justify-between"><span>Back designs</span><span className="font-medium text-zinc-900">{backDesigns.length}</span></div>
              <div className="flex justify-between"><span>Colour</span><span className="font-medium text-zinc-900">{colour.name}</span></div>
              {variant && (
                <div className="flex justify-between"><span>Variant</span><span className="font-medium text-zinc-900">{variant.name}</span></div>
              )}
              {variant?.gsm && (
                <div className="flex justify-between"><span>GSM</span><span className="font-medium text-zinc-900">{variant.gsm}</span></div>
              )}
            </div>

            <button
              onClick={handleAddToCart}
              disabled={addingToCart || !hasDesigns || totalQty === 0 || !buyable}
              className="w-full bg-black text-white py-4 rounded-2xl font-bold text-sm hover:bg-zinc-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {addingToCart
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Adding...</>
                : <><ShoppingCart size={16} /> Add to Cart</>
              }
            </button>
            {!buyable && (
              <p className="text-xs text-amber-600 text-center">Not available for purchase yet</p>
            )}
            {buyable && !hasDesigns && (
              <p className="text-xs text-zinc-400 text-center">Add a design to continue</p>
            )}
            {buyable && hasDesigns && totalQty === 0 && (
              <p className="text-xs text-zinc-400 text-center">Select at least one size</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}