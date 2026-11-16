import React from 'react'
import {
  RotateCcw,
  RotateCw,
  Eye,
  Maximize2,
  Trash2,
  Undo2,
  Redo2,
  Sliders,
  Move,
  Layers,
} from 'lucide-react'
import type { CanvasDesign } from '../../types'
import { PRINT_AREA_CM, PRINT_AREA_PX } from '../../config/printArea'

interface ThreeDControlsProps {
  onSetView: (view: 'front' | 'back' | 'left' | 'right' | 'reset') => void
  autoRotate: boolean
  onToggleAutoRotate: () => void
  showPrintBoundary: boolean
  onTogglePrintBoundary: () => void
  selectedDesign: CanvasDesign | null
  currentSide: 'front' | 'back'
  onUpdateDesign: (id: string, updates: Partial<CanvasDesign>) => void
  onDeleteDesign: (id: string) => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
}

export default function ThreeDControls({
  onSetView,
  autoRotate,
  onToggleAutoRotate,
  showPrintBoundary,
  onTogglePrintBoundary,
  selectedDesign,
  currentSide,
  onUpdateDesign,
  onDeleteDesign,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: ThreeDControlsProps) {
  const printAreaPx = PRINT_AREA_PX[currentSide]
  const printAreaCm = PRINT_AREA_CM[currentSide]

  // Calculate real-world dimensions in cm
  const widthCm = selectedDesign
    ? Math.round((selectedDesign.width / printAreaPx.width) * printAreaCm.width * 10) / 10
    : 0
  const heightCm = selectedDesign
    ? Math.round((selectedDesign.height / printAreaPx.height) * printAreaCm.height * 10) / 10
    : 0

  return (
    <div className="flex flex-col gap-3">
      {/* 1. Camera View Presets & View Controls */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-zinc-200 p-3 shadow-sm flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mr-1.5 flex items-center gap-1">
            <Eye size={13} /> View:
          </span>
          {[
            { id: 'front', label: 'Front' },
            { id: 'back', label: 'Back' },
            { id: 'left', label: 'Left' },
            { id: 'right', label: 'Right' },
          ].map((v) => (
            <button
              key={v.id}
              onClick={() => onSetView(v.id as any)}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-zinc-100 hover:bg-black hover:text-white transition-all text-zinc-700 active:scale-95"
            >
              {v.label}
            </button>
          ))}
          <button
            onClick={() => onSetView('reset')}
            className="p-1 text-xs font-semibold rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition-colors"
            title="Reset 3D camera"
          >
            <RotateCcw size={14} />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Auto-rotate toggle */}
          <button
            onClick={onToggleAutoRotate}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
              autoRotate ? 'bg-indigo-600 text-white shadow-sm' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            <RotateCw size={12} className={autoRotate ? 'animate-spin' : ''} />
            360° Spin
          </button>

          {/* Printable boundary outline toggle */}
          <button
            onClick={onTogglePrintBoundary}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
              showPrintBoundary ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            <Layers size={12} />
            Boundary
          </button>

          {/* Undo / Redo */}
          <div className="flex items-center border-l border-zinc-200 pl-1.5 gap-1">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 disabled:opacity-40 text-zinc-700 transition-colors"
              title="Undo"
            >
              <Undo2 size={13} />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 disabled:opacity-40 text-zinc-700 transition-colors"
              title="Redo"
            >
              <Redo2 size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Selected Artwork Controls & Dimension Tags (when artwork is selected) */}
      {selectedDesign && (
        <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-zinc-200 p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
            <div className="flex items-center gap-2">
              <Sliders size={14} className="text-zinc-600" />
              <span className="text-xs font-bold text-zinc-900">
                Artwork Tuning ({currentSide.toUpperCase()})
              </span>
            </div>
            {/* Live Print Dimensions Tag */}
            <span className="text-[11px] font-bold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200">
              {widthCm} × {heightCm} cm
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* Size / Scale Slider */}
            <div>
              <div className="flex justify-between text-zinc-500 mb-1">
                <span>Scale Size</span>
                <span className="font-semibold text-zinc-800">{Math.round(selectedDesign.width)} px</span>
              </div>
              <input
                type="range"
                min={40}
                max={printAreaPx.width}
                value={selectedDesign.width}
                onChange={(e) => {
                  const newW = Number(e.target.value)
                  const aspect = selectedDesign.height / selectedDesign.width
                  onUpdateDesign(selectedDesign.id, {
                    width: newW,
                    height: newW * aspect,
                  })
                }}
                className="w-full accent-black cursor-pointer"
              />
            </div>

            {/* Rotation Slider */}
            <div>
              <div className="flex justify-between text-zinc-500 mb-1">
                <span>Rotation</span>
                <span className="font-semibold text-zinc-800">{Math.round(selectedDesign.rotation || 0)}°</span>
              </div>
              <input
                type="range"
                min={-180}
                max={180}
                value={selectedDesign.rotation || 0}
                onChange={(e) => {
                  onUpdateDesign(selectedDesign.id, {
                    rotation: Number(e.target.value),
                  })
                }}
                className="w-full accent-black cursor-pointer"
              />
            </div>

            {/* Nudge Position Buttons */}
            <div>
              <span className="text-zinc-500 block mb-1">Reposition</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onUpdateDesign(selectedDesign.id, { x: selectedDesign.x - 10 })}
                  className="flex-1 py-1 bg-zinc-100 hover:bg-zinc-200 rounded font-bold text-zinc-700"
                  title="Move Left"
                >
                  ←
                </button>
                <button
                  onClick={() => onUpdateDesign(selectedDesign.id, { y: selectedDesign.y - 10 })}
                  className="flex-1 py-1 bg-zinc-100 hover:bg-zinc-200 rounded font-bold text-zinc-700"
                  title="Move Up"
                >
                  ↑
                </button>
                <button
                  onClick={() => onUpdateDesign(selectedDesign.id, { y: selectedDesign.y + 10 })}
                  className="flex-1 py-1 bg-zinc-100 hover:bg-zinc-200 rounded font-bold text-zinc-700"
                  title="Move Down"
                >
                  ↓
                </button>
                <button
                  onClick={() => onUpdateDesign(selectedDesign.id, { x: selectedDesign.x + 10 })}
                  className="flex-1 py-1 bg-zinc-100 hover:bg-zinc-200 rounded font-bold text-zinc-700"
                  title="Move Right"
                >
                  →
                </button>
              </div>
            </div>
          </div>

          {/* Action buttons: Reset center & Remove */}
          <div className="flex items-center justify-between pt-1 border-t border-zinc-100 text-xs">
            <button
              onClick={() => {
                onUpdateDesign(selectedDesign.id, {
                  x: printAreaPx.x + (printAreaPx.width - selectedDesign.width) / 2,
                  y: printAreaPx.y + (printAreaPx.height - selectedDesign.height) / 2,
                  rotation: 0,
                })
              }}
              className="text-zinc-600 hover:text-black font-medium flex items-center gap-1"
            >
              <Move size={12} /> Center on Chest
            </button>

            <button
              onClick={() => onDeleteDesign(selectedDesign.id)}
              className="text-red-500 hover:text-red-700 font-medium flex items-center gap-1"
            >
              <Trash2 size={12} /> Remove Artwork
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
