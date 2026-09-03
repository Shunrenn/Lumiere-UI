"use client"

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { Image as KonvaImage, Layer, Line, Rect, Stage, Transformer, Group, Text as KonvaText } from 'react-konva'
import Konva from 'konva'
import { MoveUp, MoveDown, Eye, EyeOff, Copy, Trash2, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

export type CanvasTool = 'select' | 'draw' | 'shapes' | 'lines' | 'sticky' | 'text'

// Artboard geometry in stage-local (unscaled) coordinates.
export const ARTBOARD_X = 40
export const ARTBOARD_Y = 40
export const ARTBOARD_W = 900
export const ARTBOARD_H = 650
export const PAGE_GAP = 64

export const getPageY = (index: number) => ARTBOARD_Y + index * (ARTBOARD_H + PAGE_GAP)

export interface KonvaCanvasPage {
  id: string
  title: string
  hidden?: boolean
}

export interface KonvaInfiniteCanvasHandle {
  /** Recomputes zoom + pan so the active artboard fits the current container. */
  fitToScreen: () => void
  /** Smoothly scrolls the continuous viewport to center the target page. */
  scrollToPage: (pageId: string) => void
}

export interface KonvaCanvasAsset {
  id: string
  label: string
  src: string
  x: number
  y: number
  w: number
  h: number
  rotation: number
  opacity: number
  locked: boolean
  hidden: boolean
  zIndex: number
  pageId?: string
  kind?: 'image' | 'rect' | 'line' | 'sticky' | 'text'
  points?: number[]
  text?: string
  fill?: string
  strokeColor?: string
  strokeWidth?: number
  fontSize?: number
}

export interface KonvaDroppedAsset {
  id: string
  name: string
  src: string
  defaultUnit: string
}

type Props = {
  assets: KonvaCanvasAsset[]
  pages: KonvaCanvasPage[]
  currentPage: string
  pageNavMode: 'flow' | 'thumbnail'
  onCurrentPageChange?: (pageId: string) => void
  selectedId: string | null
  zoom: number
  showGrid: boolean
  onSelect: (id: string | null) => void
  onUpdate: (id: string, changes: Partial<KonvaCanvasAsset>) => void
  onDeselect: () => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
  onDropAsset: (asset: KonvaDroppedAsset, x: number, y: number, pageId?: string) => void
  onZoomChange: (zoom: number) => void
  onContextMenu: (clientX: number, clientY: number, assetId: string | null) => void
  onCopy: (id: string) => void
  onPaste: () => void
  onComment: (id: string) => void
  // Page actions for external header bars
  onRenamePage?: (id: string, title: string) => void
  onMovePage?: (id: string, dir: -1 | 1) => void
  onDuplicatePage?: (id: string) => void
  onToggleHidden?: (id: string) => void
  onDeletePage?: (id: string) => void
  onAddPage?: () => void
  /** Solid fill color for all artboard backgrounds (default: #fbf8f1) */
  artboardBg?: string
  /** Loaded HTMLImageElement to tile/cover the artboard as a photo background */
  artboardBgImage?: HTMLImageElement | null
  onPlaceElement?: (asset: Partial<KonvaCanvasAsset>) => void
  activeTool?: CanvasTool
  onToolReset?: () => void
}

function useLoadedImage(src: string) {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  useEffect(() => {
    if (!src) {
      setImage(null)
      return
    }
    const img = new window.Image()
    if (!src.startsWith('blob:') && !src.startsWith('data:')) {
      img.crossOrigin = 'anonymous'
    }
    img.onload = () => setImage(img)
    img.onerror = () => setImage(null)
    img.src = src
    return () => {
      img.onload = null
      img.onerror = null
    }
  }, [src])
  return image
}

function CanvasElement({
  asset,
  pageIndex,
  pageNavMode,
  pan,
  scale,
  selected,
  activeTool = 'select',
  isEditing = false,
  onSelect,
  onUpdate,
  onStartEditing,
}: {
  asset: KonvaCanvasAsset
  pageIndex: number
  pageNavMode: 'flow' | 'thumbnail'
  pan: { x: number; y: number }
  scale: number
  selected: boolean
  activeTool?: CanvasTool
  isEditing?: boolean
  onSelect: () => void
  onUpdate: (changes: Partial<KonvaCanvasAsset>) => void
  onStartEditing: () => void
}) {
  const image = useLoadedImage(asset.src)
  const nodeRef = useRef<any>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
  const pageY = pageNavMode === 'flow' ? getPageY(pageIndex) : ARTBOARD_Y
  const listening = activeTool === 'select'

  useEffect(() => {
    if (selected && listening && nodeRef.current && transformerRef.current) {
      transformerRef.current.nodes([nodeRef.current])
      transformerRef.current.getLayer()?.batchDraw()
    }
  }, [selected, listening])

  if (asset.hidden) return null

  const kind = asset.kind || 'image'
  if (kind === 'image' && !image) return null

  const commonProps = {
    ref: nodeRef,
    id: asset.id,
    x: ARTBOARD_X + asset.x,
    y: pageY + asset.y,
    rotation: asset.rotation,
    opacity: asset.opacity / 100,
    draggable: listening && !asset.locked,
    listening,
    dragBoundFunc: (pos: { x: number; y: number }) => {
      const minX = pan.x + ARTBOARD_X * scale
      const maxX = pan.x + (ARTBOARD_X + Math.max(0, ARTBOARD_W - asset.w)) * scale
      const minY = pan.y + pageY * scale
      const maxY = pan.y + (pageY + Math.max(0, ARTBOARD_H - asset.h)) * scale
      return {
        x: Math.max(minX, Math.min(maxX, pos.x)),
        y: Math.max(minY, Math.min(maxY, pos.y)),
      }
    },
    shadowColor: selected ? '#b58a52' : undefined,
    shadowBlur: selected ? 12 : 0,
    shadowOpacity: selected ? 0.28 : 0,
    onClick: (event: any) => {
      if (!listening) return
      event.cancelBubble = true
      onSelect()
    },
    onTap: () => {
      if (!listening) return
      onSelect()
    },
    onDblClick: (event: any) => {
      if (!listening) return
      event.cancelBubble = true
      onStartEditing()
    },
    onDblTap: () => {
      if (!listening) return
      onStartEditing()
    },
    onDragStart: (event: any) => { event.cancelBubble = true },
    onDragMove: (event: any) => { event.cancelBubble = true },
    onDragEnd: (event: any) => {
      event.cancelBubble = true
      const node = event.target
      const localX = Math.round(node.x() - ARTBOARD_X)
      const localY = Math.round(node.y() - pageY)
      onUpdate({ x: localX, y: localY })
    },
    onTransformEnd: () => {
      const node = nodeRef.current
      if (!node) return
      const scaleX = node.scaleX()
      const scaleY = node.scaleY()
      node.scaleX(1)
      node.scaleY(1)
      const localX = Math.round(node.x() - ARTBOARD_X)
      const localY = Math.round(node.y() - pageY)
      onUpdate({
        x: localX,
        y: localY,
        w: Math.max(20, Math.round(node.width() * scaleX)),
        h: Math.max(20, Math.round(node.height() * scaleY)),
        rotation: Math.round(node.rotation()),
      })
    },
  }

  let nodeEl = null
  if (kind === 'image' && image) {
    const filters = asset.label.toLowerCase().includes('crystal') ? [Konva.Filters.Brighten] : undefined
    nodeEl = <KonvaImage {...commonProps} image={image} width={asset.w} height={asset.h} filters={filters} />
  } else if (kind === 'rect') {
    nodeEl = <Rect {...commonProps} width={asset.w} height={asset.h} fill={asset.fill || '#3b82f6'} stroke="#1d4ed8" strokeWidth={1} cornerRadius={4} />
  } else if (kind === 'line') {
    nodeEl = <Line {...commonProps} points={asset.points || [0, 0, asset.w, asset.h]} stroke={asset.strokeColor || '#1e293b'} strokeWidth={asset.strokeWidth || 3} tension={0.2} lineCap="round" lineJoin="round" />
  } else if (kind === 'sticky') {
    nodeEl = (
      <Group {...commonProps} width={asset.w} height={asset.h}>
        <Rect width={asset.w} height={asset.h} fill={asset.fill || '#fef08a'} stroke="#fde047" strokeWidth={1} cornerRadius={4} shadowColor="#000000" shadowBlur={4} shadowOpacity={0.1} />
        {!isEditing && (
          <KonvaText x={8} y={8} width={Math.max(10, asset.w - 16)} height={Math.max(10, asset.h - 16)} text={asset.text || 'Sticky Note'} fontSize={asset.fontSize || 14} fontFamily="sans-serif" fill="#1e293b" align="left" verticalAlign="top" wrap="word" />
        )}
      </Group>
    )
  } else if (kind === 'text') {
    nodeEl = <KonvaText {...commonProps} width={asset.w} height={asset.h} text={isEditing ? '' : (asset.text || 'Add text')} fontSize={asset.fontSize || 20} fontFamily="sans-serif" fill={asset.strokeColor || '#0f172a'} wrap="word" />
  }

  return (
    <>
      {nodeEl}
      {selected && listening && (
        <Transformer
          ref={transformerRef}
          rotateEnabled
          enabledAnchors={asset.locked ? [] : ['top-left', 'top-right', 'bottom-left', 'bottom-right']}
          borderStroke="#b58a52"
          anchorFill="#fffaf0"
          anchorStroke="#b58a52"
          anchorSize={8}
          padding={4}
        />
      )}
    </>
  )
}

export const KonvaInfiniteCanvas = forwardRef<KonvaInfiniteCanvasHandle, Props>(function KonvaInfiniteCanvas(
  {
    assets,
    pages,
    currentPage,
    pageNavMode,
    onCurrentPageChange,
    selectedId,
    zoom,
    showGrid,
    onSelect,
    onUpdate,
    onDeselect,
    onDuplicate,
    onDelete,
    onDropAsset,
    onZoomChange,
    onContextMenu,
    onCopy,
    onPaste,
    onComment,
    onRenamePage,
    onMovePage,
    onDuplicatePage,
    onToggleHidden,
    onDeletePage,
    onAddPage,
    artboardBg = '#fbf8f1',
    artboardBgImage = null,
    onPlaceElement,
    activeTool = 'select',
    onToolReset,
  },
  ref,
) {
  const stageRef = useRef<Konva.Stage>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 })
  const [manualOffset, setManualOffset] = useState({ x: 0, y: 0 })
  const [panning, setPanning] = useState(false)
  const [isOver, setIsOver] = useState(false)

  // Tools & inline editing state
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [isDrawingLine, setIsDrawingLine] = useState(false)
  const [linePoints, setLinePoints] = useState<number[]>([])
  const [isFreehand, setIsFreehand] = useState(false)
  const [freehandPoints, setFreehandPoints] = useState<number[]>([])
  const activePageForToolRef = useRef<{ page: KonvaCanvasPage; pageY: number } | null>(null)

  useEffect(() => {
    if (editingAssetId) {
      const a = assets.find((x) => x.id === editingAssetId)
      setEditingText(a?.text || '')
    }
  }, [editingAssetId, assets])

  const scale = zoom / 100
  const effectivePages = useMemo(() => (pages.length > 0 ? pages : [{ id: 'pg1', title: 'Page 1' }]), [pages])
  const currentPageIdx = useMemo(() => {
    const idx = effectivePages.findIndex((p) => p.id === currentPage)
    return idx >= 0 ? idx : 0
  }, [effectivePages, currentPage])

  // Track container size
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const { width, height } = entry.contentRect
      setContainerSize({ width: Math.round(width), height: Math.round(height) })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Base pan centering Page 1 / active page
  const basePan = useMemo(() => {
    const targetY = pageNavMode === 'flow' ? ARTBOARD_Y : ARTBOARD_Y
    return {
      x: containerSize.width / 2 - (ARTBOARD_X + ARTBOARD_W / 2) * scale,
      y: containerSize.height / 2 - (targetY + ARTBOARD_H / 2) * scale,
    }
  }, [containerSize, scale, pageNavMode])

  // Continuous vertical bounds (only relevant in Flow mode)
  const { minPanY, maxPanY } = useMemo(() => {
    if (pageNavMode === 'thumbnail') {
      const singleLimit = containerSize.height / 2 - (ARTBOARD_Y + ARTBOARD_H / 2) * scale
      return {
        maxPanY: singleLimit + containerSize.height * 0.4,
        minPanY: singleLimit - containerSize.height * 0.4,
      }
    }
    const topLimit = containerSize.height / 2 - (ARTBOARD_Y + ARTBOARD_H / 2) * scale + (containerSize.height * 0.4)
    const lastPageCenterY = getPageY(effectivePages.length - 1) + ARTBOARD_H / 2
    const bottomLimit = containerSize.height / 2 - lastPageCenterY * scale - (containerSize.height * 0.4)
    return {
      maxPanY: topLimit,
      minPanY: Math.min(topLimit, bottomLimit),
    }
  }, [containerSize, scale, effectivePages.length, pageNavMode])

  // Computed pan, softly clamped within bounds
  const rawY = basePan.y + manualOffset.y
  const clampedY = Math.max(minPanY, Math.min(maxPanY, rawY))
  const pan = { x: basePan.x + manualOffset.x, y: clampedY }

  // Detect active page based on viewport center (in Flow mode only)
  useEffect(() => {
    if (pageNavMode !== 'flow') return
    const viewportCenterStageY = (containerSize.height / 2 - pan.y) / scale
    let bestIndex = 0
    let minDistance = Infinity

    effectivePages.forEach((_, idx) => {
      const pageCenter = getPageY(idx) + ARTBOARD_H / 2
      const dist = Math.abs(viewportCenterStageY - pageCenter)
      if (dist < minDistance) {
        minDistance = dist
        bestIndex = idx
      }
    })

    const activePage = effectivePages[bestIndex]
    if (activePage && activePage.id !== currentPage) {
      onCurrentPageChange?.(activePage.id)
    }
  }, [pan.y, scale, containerSize.height, effectivePages, currentPage, onCurrentPageChange, pageNavMode])

  // Reset vertical pan deviation when switching to Thumbnail mode to keep active page centered
  useEffect(() => {
    if (pageNavMode === 'thumbnail') {
      setManualOffset((prev) => ({ ...prev, y: 0 }))
    }
  }, [pageNavMode, currentPage])

  // Imperative handle
  useImperativeHandle(
    ref,
    () => ({
      fitToScreen() {
        const padding = 64
        const fitScale = Math.min(
          (containerSize.width - padding) / ARTBOARD_W,
          (containerSize.height - padding) / ARTBOARD_H,
        )
        const clamped = Math.max(0.1, Math.min(2, fitScale))
        onZoomChange(Math.round(clamped * 100))

        if (pageNavMode === 'flow') {
          const targetPageCenterY = getPageY(currentPageIdx) + ARTBOARD_H / 2
          const targetPanY = containerSize.height / 2 - targetPageCenterY * clamped
          const newBasePanY = containerSize.height / 2 - (ARTBOARD_Y + ARTBOARD_H / 2) * clamped
          setManualOffset({ x: 0, y: targetPanY - newBasePanY })
        } else {
          setManualOffset({ x: 0, y: 0 })
        }
      },
      scrollToPage(pageId: string) {
        if (pageNavMode === 'flow') {
          const idx = effectivePages.findIndex((p) => p.id === pageId)
          if (idx < 0) return
          const targetPageCenterY = getPageY(idx) + ARTBOARD_H / 2
          const targetPanY = containerSize.height / 2 - targetPageCenterY * scale
          setManualOffset((prev) => ({ ...prev, y: targetPanY - basePan.y }))
        } else {
          setManualOffset((prev) => ({ ...prev, y: 0 }))
        }
      },
    }),
    [containerSize, onZoomChange, currentPageIdx, effectivePages, scale, basePan.y, pageNavMode],
  )

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return

      if (event.key === 'Escape') { onDeselect() }
      const mod = event.metaKey || event.ctrlKey
      if (mod && event.altKey && event.key.toLowerCase() === 'n' && selectedId) { event.preventDefault(); onComment(selectedId) }
      else if (mod && event.key.toLowerCase() === 'd' && selectedId) { event.preventDefault(); onDuplicate(selectedId) }
      else if (mod && event.key.toLowerCase() === 'c' && selectedId) { event.preventDefault(); onCopy(selectedId) }
      else if (mod && event.key.toLowerCase() === 'v') { event.preventDefault(); onPaste() }
      else if ((event.key === 'Delete' || event.key === 'Backspace') && selectedId) { event.preventDefault(); onDelete(selectedId) }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedId, onDeselect, onDuplicate, onDelete, onCopy, onPaste, onComment])

  const toCanvasPoint = (event: React.DragEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: (event.clientX - rect.left - pan.x) / scale, y: (event.clientY - rect.top - pan.y) / scale }
  }

  // Smooth wheel scroll handler
  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (event.ctrlKey || event.metaKey) {
      const delta = event.deltaY < 0 ? 5 : -5
      const nextZoom = Math.max(10, Math.min(200, zoom + delta))
      onZoomChange(nextZoom)
    } else if (pageNavMode === 'flow') {
      const deltaY = event.deltaY
      const deltaX = event.deltaX || 0
      setManualOffset((prev) => {
        const nextY = prev.y - deltaY
        const nextX = prev.x - deltaX
        const currentPanY = basePan.y + nextY
        const clamped = Math.max(minPanY, Math.min(maxPanY, currentPanY))
        return {
          x: nextX,
          y: clamped - basePan.y,
        }
      })
    } else {
      // In thumbnail mode: gentle panning around the single artboard
      const deltaY = event.deltaY
      const deltaX = event.deltaX || 0
      setManualOffset((prev) => {
        const nextY = prev.y - deltaY
        const nextX = prev.x - deltaX
        const currentPanY = basePan.y + nextY
        const clamped = Math.max(minPanY, Math.min(maxPanY, currentPanY))
        return {
          x: nextX,
          y: clamped - basePan.y,
        }
      })
    }
  }

  // Active single page in Thumbnail mode
  const activeSinglePage = effectivePages[currentPageIdx] || effectivePages[0]

  function getPointerStageInfo(_evt?: MouseEvent | TouchEvent) {
    const stage = stageRef.current
    if (!stage) return null
    const pointerPos = stage.getPointerPosition()
    if (!pointerPos) return null
    const stageX = (pointerPos.x - pan.x) / scale
    const stageY = (pointerPos.y - pan.y) / scale

    let targetIdx = 0
    if (pageNavMode === 'thumbnail') {
      targetIdx = currentPageIdx
    } else {
      for (let i = 0; i < effectivePages.length; i++) {
        const pY = getPageY(i)
        if (stageY >= pY && stageY <= pY + ARTBOARD_H + PAGE_GAP) {
          targetIdx = i
          break
        }
        if (stageY > pY + ARTBOARD_H + PAGE_GAP) {
          targetIdx = i
        }
      }
    }
    const targetPage = effectivePages[targetIdx] || effectivePages[0]
    const targetPageY = pageNavMode === 'flow' ? getPageY(targetIdx) : ARTBOARD_Y

    return { stageX, stageY, targetPage, targetPageY }
  }

  const editingAsset = useMemo(() => assets.find((a) => a.id === editingAssetId), [assets, editingAssetId])
  const editingPageIdx = useMemo(() => {
    if (!editingAsset) return 0
    const pId = editingAsset.pageId || effectivePages[0]?.id
    const idx = effectivePages.findIndex((p) => p.id === pId)
    return idx >= 0 ? idx : 0
  }, [editingAsset, effectivePages])

  const editingPageY = pageNavMode === 'flow' ? getPageY(editingPageIdx) : ARTBOARD_Y
  const editingScreenX = editingAsset ? pan.x + (ARTBOARD_X + editingAsset.x) * scale : 0
  const editingScreenY = editingAsset ? pan.y + (editingPageY + editingAsset.y) * scale : 0
  const editingScreenW = editingAsset ? Math.max(120, editingAsset.w * scale) : 0
  const editingScreenH = editingAsset ? Math.max(40, editingAsset.h * scale) : 0
  const editingFontSizePx = editingAsset ? Math.max(12, (editingAsset.fontSize || 16) * scale) : 16

  return (
    <div
      ref={wrapperRef}
      className="relative flex-1 overflow-hidden bg-muted/30 select-none"
      onWheel={handleWheel}
      onDragOver={(event) => { event.preventDefault(); setIsOver(true) }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(event) => {
        event.preventDefault()
        setIsOver(false)
        const raw = event.dataTransfer.getData('application/lumiere-asset')
        if (!raw) return
        try {
          const point = toCanvasPoint(event)
          if (pageNavMode === 'thumbnail') {
            const localX = Math.max(10, Math.min(ARTBOARD_W - 200, Math.round(point.x - ARTBOARD_X)))
            const localY = Math.max(10, Math.min(ARTBOARD_H - 180, Math.round(point.y - ARTBOARD_Y)))
            onDropAsset(JSON.parse(raw) as KonvaDroppedAsset, localX, localY, activeSinglePage.id)
            return
          }

          // In Flow mode: find target page for drop
          let targetIndex = 0
          for (let i = 0; i < effectivePages.length; i++) {
            const pageY = getPageY(i)
            if (point.y >= pageY && point.y <= pageY + ARTBOARD_H + PAGE_GAP) {
              targetIndex = i
              break
            }
            if (point.y > pageY + ARTBOARD_H + PAGE_GAP) {
              targetIndex = i
            }
          }
          const targetPage = effectivePages[targetIndex] || effectivePages[0]
          const targetPageY = getPageY(targetIndex)
          const localX = Math.max(10, Math.min(ARTBOARD_W - 200, Math.round(point.x - ARTBOARD_X)))
          const localY = Math.max(10, Math.min(ARTBOARD_H - 180, Math.round(point.y - targetPageY)))
          onDropAsset(JSON.parse(raw) as KonvaDroppedAsset, localX, localY, targetPage.id)
        } catch { /* invalid drag payload */ }
      }}
      onContextMenu={(event) => event.preventDefault()}
    >
      {isOver && <div className="pointer-events-none absolute inset-3 z-20 rounded-lg border-2 border-dashed border-primary/60 bg-primary/5" />}

      {/* ─── Mode 1: External Per-Page Header Bars outside/above each artboard ─── */}
      {pageNavMode === 'flow' && effectivePages.map((page, pIdx) => {
        const pageY = getPageY(pIdx)
        const top = pan.y + (pageY - 34) * scale
        const left = pan.x + ARTBOARD_X * scale
        const width = ARTBOARD_W * scale
        const isCurrent = page.id === currentPage

        return (
          <div
            key={`hdr-${page.id}`}
            style={{
              position: 'absolute',
              top: `${top}px`,
              left: `${left}px`,
              width: `${width}px`,
              zIndex: 15,
            }}
            className="flex items-center justify-between gap-2 px-1 text-xs select-none pointer-events-auto"
          >
            {/* Left: Page Title Input (click to rename) */}
            <div className="flex items-center gap-1.5 min-w-0 bg-background/90 backdrop-blur-sm border border-border/80 rounded-lg px-2 py-0.5 shadow-sm">
              <span className={cn('font-semibold uppercase tracking-wider text-[0.62rem] shrink-0', isCurrent ? 'text-primary' : 'text-muted-foreground')}>
                Page {pIdx + 1}
              </span>
              <span className="text-muted-foreground/40 text-[0.6rem]">·</span>
              <input
                type="text"
                value={page.title}
                placeholder="Add page title"
                onChange={(e) => onRenamePage?.(page.id, e.target.value)}
                className="bg-transparent hover:bg-muted/40 focus:bg-background rounded px-1.5 py-0.5 text-[0.68rem] font-medium text-foreground outline-none border border-transparent focus:border-primary transition max-w-[200px] truncate"
              />
            </div>

            {/* Right: Page Controls */}
            <div className="flex items-center gap-0.5 bg-background/90 backdrop-blur-sm border border-border/80 rounded-lg px-1.5 py-0.5 shadow-sm">
              <button
                type="button"
                title="Move up"
                onClick={() => onMovePage?.(page.id, -1)}
                disabled={pIdx === 0}
                className="flex size-5 items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-30 transition"
              >
                <MoveUp className="size-3" />
              </button>
              <button
                type="button"
                title="Move down"
                onClick={() => onMovePage?.(page.id, 1)}
                disabled={pIdx === effectivePages.length - 1}
                className="flex size-5 items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-30 transition"
              >
                <MoveDown className="size-3" />
              </button>
              <button
                type="button"
                title={page.hidden ? 'Show page' : 'Hide page'}
                onClick={() => onToggleHidden?.(page.id)}
                className={cn('flex size-5 items-center justify-center rounded transition', page.hidden ? 'text-amber-400 hover:text-amber-300' : 'text-muted-foreground hover:text-foreground')}
              >
                {page.hidden ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
              </button>
              <button
                type="button"
                title="Duplicate page"
                onClick={() => onDuplicatePage?.(page.id)}
                className="flex size-5 items-center justify-center rounded text-muted-foreground hover:text-foreground transition"
              >
                <Copy className="size-3" />
              </button>
              <button
                type="button"
                title="Delete page"
                onClick={() => onDeletePage?.(page.id)}
                disabled={effectivePages.length <= 1}
                className="flex size-5 items-center justify-center rounded text-muted-foreground hover:text-destructive disabled:opacity-30 transition"
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          </div>
        )
      })}

      {/* ─── Mode 1: "+ Add page" button positioned below the last artboard in Flow mode ─── */}
      {pageNavMode === 'flow' && (
        <div
          style={{
            position: 'absolute',
            top: `${pan.y + (getPageY(effectivePages.length - 1) + ARTBOARD_H + 20) * scale}px`,
            left: `${pan.x + (ARTBOARD_X + ARTBOARD_W / 2) * scale}px`,
            transform: 'translateX(-50%)',
            zIndex: 15,
          }}
        >
          <button
            type="button"
            onClick={onAddPage}
            className="flex items-center gap-1.5 rounded-xl border border-dashed border-border bg-background/95 backdrop-blur px-5 py-2.5 text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground hover:border-primary hover:text-foreground shadow-md transition"
          >
            <Plus className="size-3.5" />
            Add page
          </button>
        </div>
      )}

      {/* ─── Stage Canvas Layer ─── */}
      <Stage
        ref={stageRef}
        width={containerSize.width}
        height={containerSize.height}
        x={pan.x}
        y={pan.y}
        scaleX={scale}
        scaleY={scale}
        draggable={panning && activeTool === 'select'}
        onMouseDown={(event) => {
          if (event.evt.button !== 0) return

          if (activeTool === 'select') {
            if (event.target === event.target.getStage()) { onDeselect(); setPanning(true) }
            return
          }

          const info = getPointerStageInfo(event.evt)
          if (!info) return
          const { stageX, stageY, targetPage, targetPageY } = info

          if (activeTool === 'shapes') {
            const localX = Math.max(0, Math.min(ARTBOARD_W - 150, Math.round(stageX - ARTBOARD_X)))
            const localY = Math.max(0, Math.min(ARTBOARD_H - 150, Math.round(stageY - targetPageY)))
            onPlaceElement?.({
              kind: 'rect',
              label: 'Rectangle',
              x: localX,
              y: localY,
              w: 150,
              h: 150,
              fill: '#3b82f6',
              pageId: targetPage.id,
            })
            onToolReset?.()
          } else if (activeTool === 'sticky') {
            const localX = Math.max(0, Math.min(ARTBOARD_W - 160, Math.round(stageX - ARTBOARD_X)))
            const localY = Math.max(0, Math.min(ARTBOARD_H - 160, Math.round(stageY - targetPageY)))
            onPlaceElement?.({
              kind: 'sticky',
              label: 'Sticky Note',
              x: localX,
              y: localY,
              w: 160,
              h: 160,
              fill: '#fef08a',
              text: 'Double-tap to edit',
              fontSize: 14,
              pageId: targetPage.id,
            })
            onToolReset?.()
          } else if (activeTool === 'text') {
            const localX = Math.max(0, Math.min(ARTBOARD_W - 200, Math.round(stageX - ARTBOARD_X)))
            const localY = Math.max(0, Math.min(ARTBOARD_H - 40, Math.round(stageY - targetPageY)))
            const id = `text-${Date.now()}`
            onPlaceElement?.({
              id,
              kind: 'text',
              label: 'Text Element',
              x: localX,
              y: localY,
              w: 200,
              h: 40,
              text: 'Type text here',
              fontSize: 20,
              strokeColor: '#0f172a',
              pageId: targetPage.id,
            })
            setEditingAssetId(id)
            onToolReset?.()
          } else if (activeTool === 'lines') {
            setIsDrawingLine(true)
            activePageForToolRef.current = { page: targetPage, pageY: targetPageY }
            setLinePoints([stageX, stageY, stageX, stageY])
          } else if (activeTool === 'draw') {
            setIsFreehand(true)
            activePageForToolRef.current = { page: targetPage, pageY: targetPageY }
            setFreehandPoints([stageX, stageY])
          }
        }}
        onMouseMove={(event) => {
          if (isDrawingLine && activeTool === 'lines') {
            const info = getPointerStageInfo(event.evt)
            if (!info) return
            setLinePoints((prev) => [prev[0], prev[1], info.stageX, info.stageY])
          } else if (isFreehand && activeTool === 'draw') {
            const info = getPointerStageInfo(event.evt)
            if (!info) return
            setFreehandPoints((prev) => [...prev, info.stageX, info.stageY])
          }
        }}
        onMouseUp={() => {
          if (panning) setPanning(false)

          if (isDrawingLine && linePoints.length === 4) {
            const [x1, y1, x2, y2] = linePoints
            const pageInfo = activePageForToolRef.current
            if (pageInfo) {
              const minX = Math.min(x1, x2)
              const minY = Math.min(y1, y2)
              const maxX = Math.max(x1, x2)
              const maxY = Math.max(y1, y2)
              const w = Math.max(20, Math.round(maxX - minX))
              const h = Math.max(20, Math.round(maxY - minY))
              const localX = Math.round(minX - ARTBOARD_X)
              const localY = Math.round(minY - pageInfo.pageY)

              onPlaceElement?.({
                kind: 'line',
                label: 'Straight Line',
                x: localX,
                y: localY,
                w,
                h,
                points: [x1 - minX, y1 - minY, x2 - minX, y2 - minY],
                strokeColor: '#1e293b',
                strokeWidth: 3,
                pageId: pageInfo.page.id,
              })
            }
            setIsDrawingLine(false)
            setLinePoints([])
            activePageForToolRef.current = null
            onToolReset?.()
          } else if (isFreehand && freehandPoints.length >= 4) {
            const pageInfo = activePageForToolRef.current
            if (pageInfo) {
              const xs = freehandPoints.filter((_, i) => i % 2 === 0)
              const ys = freehandPoints.filter((_, i) => i % 2 === 1)
              const minX = Math.min(...xs)
              const maxX = Math.max(...xs)
              const minY = Math.min(...ys)
              const maxY = Math.max(...ys)

              const w = Math.max(20, Math.round(maxX - minX))
              const h = Math.max(20, Math.round(maxY - minY))
              const localX = Math.round(minX - ARTBOARD_X)
              const localY = Math.round(minY - pageInfo.pageY)

              const relPoints = freehandPoints.map((val, idx) => (idx % 2 === 0 ? val - minX : val - minY))

              onPlaceElement?.({
                kind: 'line',
                label: 'Freehand Drawing',
                x: localX,
                y: localY,
                w,
                h,
                points: relPoints,
                strokeColor: '#1e293b',
                strokeWidth: 3,
                pageId: pageInfo.page.id,
              })
            }
            setIsFreehand(false)
            setFreehandPoints([])
            activePageForToolRef.current = null
            onToolReset?.()
          }
        }}
        onDragEnd={(event) => {
          if (event.target !== event.target.getStage()) return
          const stage = event.target
          const nextPanY = Math.max(minPanY, Math.min(maxPanY, stage.y()))
          setManualOffset({ x: stage.x() - basePan.x, y: nextPanY - basePan.y })
        }}
        onContextMenu={(event) => {
          event.evt.preventDefault()
          const node = event.target
          if (node === node.getStage()) { onContextMenu(event.evt.clientX, event.evt.clientY, null); return }
          const asset = assets.find((item) => item.id === node.id())
          if (asset && asset.id !== selectedId) onSelect(asset.id)
          onContextMenu(event.evt.clientX, event.evt.clientY, asset?.id ?? null)
        }}
      >
        <Layer>
          {showGrid && Array.from({ length: 60 }, (_, index) => (
            <Line
              key={`v-${index}`}
              points={[
                index * 50 - 1000,
                -1000,
                index * 50 - 1000,
                pageNavMode === 'flow' ? getPageY(effectivePages.length) + 1000 : 2000,
              ]}
              stroke="#d6cdbc"
              strokeWidth={0.5}
              opacity={0.35}
            />
          ))}
          {showGrid && Array.from({ length: Math.ceil(((pageNavMode === 'flow' ? getPageY(effectivePages.length) : ARTBOARD_H) + 2000) / 50) }, (_, index) => (
            <Line key={`h-${index}`} points={[-1000, index * 50 - 1000, 3000, index * 50 - 1000]} stroke="#d6cdbc" strokeWidth={0.5} opacity={0.35} />
          ))}

          {/* ══════════ Mode 1: Flow Mode (Stack of all pages) ══════════ */}
          {pageNavMode === 'flow' && effectivePages.map((page, pIdx) => {
            const pageY = getPageY(pIdx)
            const pageAssets = assets
              .filter((a) => (a.pageId || effectivePages[0]?.id) === page.id)
              .sort((a, b) => a.zIndex - b.zIndex)

            return (
              <Group key={page.id} opacity={page.hidden ? 0.45 : 1}>
                {/* Artboard background (clean, no inside text) */}
                <Rect
                  x={ARTBOARD_X}
                  y={pageY}
                  width={ARTBOARD_W}
                  height={ARTBOARD_H}
                  fill={artboardBgImage ? '#ffffff' : artboardBg}
                  stroke={page.id === currentPage ? '#c4b59d' : '#d8d1c4'}
                  strokeWidth={page.id === currentPage ? 1.5 : 1}
                  cornerRadius={4}
                  shadowColor="#1f1810"
                  shadowBlur={page.id === currentPage ? 12 : 4}
                  shadowOpacity={0.06}
                  shadowOffset={{ x: 0, y: 2 }}
                />
                {/* Photo background: cover-fit image over the artboard */}
                {artboardBgImage && (() => {
                  const imgW = artboardBgImage.naturalWidth || ARTBOARD_W
                  const imgH = artboardBgImage.naturalHeight || ARTBOARD_H
                  const scale = Math.max(ARTBOARD_W / imgW, ARTBOARD_H / imgH)
                  const drawW = imgW * scale
                  const drawH = imgH * scale
                  const offsetX = (ARTBOARD_W - drawW) / 2
                  const offsetY = (ARTBOARD_H - drawH) / 2
                  return (
                    <KonvaImage
                      image={artboardBgImage}
                      x={ARTBOARD_X + offsetX}
                      y={pageY + offsetY}
                      width={drawW}
                      height={drawH}
                      listening={false}
                      clipFunc={(ctx: any) => {
                        ctx.rect(ARTBOARD_X, pageY, ARTBOARD_W, ARTBOARD_H)
                      }}
                    />
                  )
                })()}

                {/* Placed elements for this page */}
                <Group>
                  {pageAssets.map((asset) => (
                    <CanvasElement
                      key={asset.id}
                      asset={asset}
                      pageIndex={pIdx}
                      pageNavMode="flow"
                      pan={pan}
                      scale={scale}
                      selected={asset.id === selectedId}
                      activeTool={activeTool}
                      isEditing={asset.id === editingAssetId}
                      onSelect={() => onSelect(asset.id)}
                      onUpdate={(changes) => onUpdate(asset.id, changes)}
                      onStartEditing={() => setEditingAssetId(asset.id)}
                    />
                  ))}
                </Group>
              </Group>
            )
          })}

          {/* ══════════ Mode 2: Thumbnail Mode (Single active page artboard) ══════════ */}
          {pageNavMode === 'thumbnail' && (
            <Group opacity={activeSinglePage.hidden ? 0.45 : 1}>
              {/* Artboard background (clean, no inside text) */}
              <Rect
                x={ARTBOARD_X}
                y={ARTBOARD_Y}
                width={ARTBOARD_W}
                height={ARTBOARD_H}
                fill={artboardBgImage ? '#ffffff' : artboardBg}
                stroke="#c4b59d"
                strokeWidth={1.5}
                cornerRadius={4}
                shadowColor="#1f1810"
                shadowBlur={10}
                shadowOpacity={0.06}
                shadowOffset={{ x: 0, y: 2 }}
              />
              {/* Photo background: cover-fit image over the artboard */}
              {artboardBgImage && (() => {
                const imgW = artboardBgImage.naturalWidth || ARTBOARD_W
                const imgH = artboardBgImage.naturalHeight || ARTBOARD_H
                const scale = Math.max(ARTBOARD_W / imgW, ARTBOARD_H / imgH)
                const drawW = imgW * scale
                const drawH = imgH * scale
                const offsetX = (ARTBOARD_W - drawW) / 2
                const offsetY = (ARTBOARD_H - drawH) / 2
                return (
                  <KonvaImage
                    image={artboardBgImage}
                    x={ARTBOARD_X + offsetX}
                    y={ARTBOARD_Y + offsetY}
                    width={drawW}
                    height={drawH}
                    listening={false}
                    clipFunc={(ctx: any) => {
                      ctx.rect(ARTBOARD_X, ARTBOARD_Y, ARTBOARD_W, ARTBOARD_H)
                    }}
                  />
                )
              })()}

              {/* Placed elements for active page */}
              <Group>
                {assets
                  .filter((a) => (a.pageId || effectivePages[0]?.id) === activeSinglePage.id)
                  .sort((a, b) => a.zIndex - b.zIndex)
                  .map((asset) => (
                    <CanvasElement
                      key={asset.id}
                      asset={asset}
                      pageIndex={currentPageIdx}
                      pageNavMode="thumbnail"
                      pan={pan}
                      scale={scale}
                      selected={asset.id === selectedId}
                      activeTool={activeTool}
                      isEditing={asset.id === editingAssetId}
                      onSelect={() => onSelect(asset.id)}
                      onUpdate={(changes) => onUpdate(asset.id, changes)}
                      onStartEditing={() => setEditingAssetId(asset.id)}
                    />
                  ))}
              </Group>
            </Group>
          )}

          {/* In-progress drawing / line preview overlays */}
          {isDrawingLine && linePoints.length === 4 && (
            <Line points={linePoints} stroke="#3b82f6" strokeWidth={3} dash={[6, 6]} />
          )}
          {isFreehand && freehandPoints.length >= 4 && (
            <Line points={freehandPoints} stroke="#1e293b" strokeWidth={3} tension={0.2} lineCap="round" lineJoin="round" />
          )}
        </Layer>
      </Stage>

      {/* Textarea inline editing overlay */}
      {editingAsset && (
        <textarea
          autoFocus
          value={editingText}
          onChange={(e) => setEditingText(e.target.value)}
          onBlur={() => {
            onUpdate(editingAsset.id, { text: editingText })
            setEditingAssetId(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              onUpdate(editingAsset.id, { text: editingText })
              setEditingAssetId(null)
            } else if (e.key === 'Enter' && !e.shiftKey && editingAsset.kind === 'text') {
              e.preventDefault()
              onUpdate(editingAsset.id, { text: editingText })
              setEditingAssetId(null)
            }
          }}
          style={{
            position: 'absolute',
            top: `${editingScreenY}px`,
            left: `${editingScreenX}px`,
            width: `${editingScreenW}px`,
            height: `${editingScreenH}px`,
            fontSize: `${editingFontSizePx}px`,
            fontFamily: 'sans-serif',
            color: editingAsset.kind === 'sticky' ? '#1e293b' : (editingAsset.strokeColor || '#0f172a'),
            backgroundColor: editingAsset.kind === 'sticky' ? (editingAsset.fill || '#fef08a') : 'transparent',
            border: '2px solid #3b82f6',
            borderRadius: '4px',
            padding: '4px',
            outline: 'none',
            resize: 'both',
            zIndex: 50,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        />
      )}
    </div>
  )
})
