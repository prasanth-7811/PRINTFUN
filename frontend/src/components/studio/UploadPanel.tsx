import { useState, useRef, useCallback } from 'react'
import { Upload, CheckCircle, AlertTriangle } from 'lucide-react'

interface UploadPanelProps {
  onUpload: (file: File, dataUrl: string, width: number, height: number) => void
}

export default function UploadPanel({ onUpload }: UploadPanelProps) {
  const [dragging, setDragging] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'invalid'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback((file: File) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg']
    if (!allowed.includes(file.type)) {
      setStatus('invalid')
      setErrorMsg('Only PNG, JPG, JPEG files are supported.')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      setStatus('invalid')
      setErrorMsg('File size must be under 20MB.')
      return
    }
    setStatus('loading')
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      const img = new Image()
      img.onload = () => {
        setStatus('success')
        onUpload(file, dataUrl, img.naturalWidth, img.naturalHeight)
        setTimeout(() => setStatus('idle'), 2000)
      }
      img.onerror = () => { setStatus('error'); setErrorMsg('Could not read image.') }
      img.src = dataUrl
    }
    reader.onerror = () => { setStatus('error'); setErrorMsg('Failed to read file.') }
    reader.readAsDataURL(file)
  }, [onUpload])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          dragging ? 'border-black bg-zinc-50' : 'border-zinc-200 hover:border-zinc-400'
        }`}
      >
        <input ref={inputRef} type="file" accept=".png,.jpg,.jpeg" className="hidden" onChange={handleChange} />
        {status === 'loading' && (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-zinc-500">Processing...</p>
          </div>
        )}
        {status === 'success' && (
          <div className="flex flex-col items-center gap-2 text-green-600">
            <CheckCircle size={28} />
            <p className="text-xs font-medium">Design added!</p>
          </div>
        )}
        {(status === 'error' || status === 'invalid') && (
          <div className="flex flex-col items-center gap-2 text-red-500">
            <AlertTriangle size={28} />
            <p className="text-xs font-medium">{errorMsg}</p>
            <button onClick={(e) => { e.stopPropagation(); setStatus('idle') }} className="text-xs underline">Try again</button>
          </div>
        )}
        {status === 'idle' && (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center">
              <Upload size={20} className="text-zinc-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-700">Drop your design here</p>
              <p className="text-xs text-zinc-400 mt-1">PNG, JPG, JPEG · Max 20MB</p>
            </div>
            <span className="text-xs bg-zinc-100 text-zinc-600 px-3 py-1.5 rounded-lg font-medium">Browse Files</span>
          </div>
        )}
      </div>
    </div>
  )
}
