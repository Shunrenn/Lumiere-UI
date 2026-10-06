import { useEffect, useState, useRef } from 'react'
import { X, ZoomIn, ZoomOut, RotateCcw, Maximize2, Download } from 'lucide-react'

interface ImageViewerModalProps {
  src: string | null
  alt?: string
  title?: string
  onClose: () => void
}

export function ImageViewerModal({
  src,
  alt = 'Full view image',
  title = 'Image Preview',
  onClose,
}: ImageViewerModalProps) {
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === '+' || e.key === '=') {
        setScale((s) => Math.min(s + 0.25, 4))
      } else if (e.key === '-') {
        setScale((s) => Math.max(s - 0.25, 0.5))
      } else if (e.key === '0') {
        setScale(1)
        setPosition({ x: 0, y: 0 })
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!src) return null

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.25, 4))
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.25, 0.5))
  const handleReset = () => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true)
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    }
  }

  const handleMouseUp = () => setIsDragging(false)

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    if (e.deltaY < 0) {
      setScale((s) => Math.min(s + 0.15, 4))
    } else {
      setScale((s) => Math.max(s - 0.15, 0.5))
    }
  }

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = src
    link.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'asset-photo'}.png`
    link.click()
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/92 backdrop-blur-md animate-in fade-in duration-200 select-none"
      onClick={onClose}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Top Controls Bar */}
      <div
        className="flex items-center justify-between border-b border-white/10 bg-black/60 px-6 py-3.5 backdrop-blur shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-white/10 text-white">
            <Maximize2 className="size-4" />
          </div>
          <div>
            <h3 className="font-sans text-sm font-medium text-white">{title}</h3>
            <p className="text-[0.65rem] text-white/50">
              Scroll to zoom • Click &amp; drag to pan • Press Esc to close
            </p>
          </div>
        </div>

        {/* Toolbar buttons */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-white/15 bg-white/5 p-0.5">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={scale <= 0.5}
              title="Zoom out (-)"
              className="flex size-8 items-center justify-center rounded text-white/80 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
            >
              <ZoomOut className="size-4" />
            </button>
            <button
              type="button"
              onClick={handleReset}
              title="Reset Zoom (0)"
              className="px-2.5 py-1 text-xs font-mono font-medium text-white/90 hover:bg-white/10 rounded transition"
            >
              {Math.round(scale * 100)}%
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={scale >= 4}
              title="Zoom in (+)"
              className="flex size-8 items-center justify-center rounded text-white/80 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
            >
              <ZoomIn className="size-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleReset}
            title="Reset position & zoom"
            className="flex size-8 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <RotateCcw className="size-3.5" />
          </button>

          <button
            type="button"
            onClick={handleDownload}
            title="Download image"
            className="flex size-8 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <Download className="size-3.5" />
          </button>

          <div className="h-5 w-px bg-white/20 mx-1" />

          <button
            type="button"
            onClick={onClose}
            aria-label="Close full view"
            className="flex size-8 items-center justify-center rounded-lg bg-white/10 text-white transition hover:bg-rose-500/80 hover:text-white"
          >
            <X className="size-4.5" />
          </button>
        </div>
      </div>

      {/* Main Image Viewport with Checkerboard pattern for transparency */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        className="flex-1 flex items-center justify-center overflow-hidden p-6 relative cursor-default"
        onClick={(e) => {
          if (e.target === containerRef.current) onClose()
        }}
      >
        <div
          className="relative max-h-[85vh] max-w-[90vw] transition-transform duration-75 flex items-center justify-center rounded-xl p-2"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
          }}
          onClick={(e) => {
            e.stopPropagation()
            if (scale === 1) {
              setScale(1.75)
            }
          }}
        >
          {/* Transparent checkerboard background */}
          <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none opacity-40 bg-[linear-gradient(45deg,#333_25%,transparent_25%),linear-gradient(-45deg,#333_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#333_75%),linear-gradient(-45deg,transparent_75%,#333_75%)] bg-[size:20px_20px]" />

          <img
            src={src}
            alt={alt}
            draggable={false}
            className="relative max-h-[80vh] max-w-[85vw] object-contain drop-shadow-2xl select-none rounded-lg"
          />
        </div>
      </div>

      {/* Bottom Hint */}
      <div className="py-2 text-center text-[0.7rem] text-white/40 shrink-0 pointer-events-none">
        Click image to zoom in • Double click or click backdrop to exit
      </div>
    </div>
  )
}
