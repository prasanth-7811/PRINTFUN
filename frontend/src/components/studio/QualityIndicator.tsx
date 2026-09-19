import { AlertTriangle, CheckCircle, Info } from 'lucide-react'

interface Props {
  width: number
  height: number
  originalWidth: number
  originalHeight: number
}

const CM_TO_PX_RATIO = 37.8 // 96dpi

export default function QualityIndicator({ width, height, originalWidth, originalHeight }: Props) {
  if (!originalWidth || !originalHeight || !width || !height) return null

  const printWidthPx = width
  const printHeightPx = height
  const dpiX = (originalWidth / (printWidthPx / CM_TO_PX_RATIO)) * 2.54
  const dpiY = (originalHeight / (printHeightPx / CM_TO_PX_RATIO)) * 2.54
  const dpi = Math.min(dpiX, dpiY)

  const widthCm = (width / CM_TO_PX_RATIO).toFixed(1)
  const heightCm = (height / CM_TO_PX_RATIO).toFixed(1)

  let quality: 'high' | 'medium' | 'low'
  if (dpi >= 200) quality = 'high'
  else if (dpi >= 100) quality = 'medium'
  else quality = 'low'

  const config = {
    high: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50 border-green-200', label: 'High Quality', desc: 'Excellent print quality at this size.' },
    medium: { icon: Info, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', label: 'Medium Quality', desc: 'Acceptable quality. Consider a larger file for best results.' },
    low: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50 border-red-200', label: 'Low Quality', desc: 'Your design may appear blurry at this print size.' },
  }[quality]

  const Icon = config.icon

  return (
    <div className={`rounded-xl border p-3 ${config.bg}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className={config.color} />
        <span className={`text-xs font-semibold ${config.color}`}>{config.label}</span>
        <span className="text-xs text-zinc-400 ml-auto">{Math.round(dpi)} DPI</span>
      </div>
      <p className="text-xs text-zinc-500">{config.desc}</p>
      <p className="text-xs text-zinc-400 mt-1">{widthCm} × {heightCm} cm</p>
    </div>
  )
}
