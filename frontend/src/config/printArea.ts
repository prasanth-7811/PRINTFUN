export type StudioView = 'front' | 'back'

export const CANVAS_SIZE = { width: 400, height: 480 }

// Real-world printable size for each side, in centimetres.
export const PRINT_AREA_CM: Record<StudioView, { width: number; height: number }> = {
  front: { width: 30, height: 36 },
  back: { width: 29.7, height: 42 }, // up to A3 (297 x 420 mm)
}

// On-canvas printable box (the dashed guide), in canvas pixels.
// Each box is drawn to scale with PRINT_AREA_CM so it visually represents the real print size.
export const PRINT_AREA_PX: Record<StudioView, { x: number; y: number; width: number; height: number }> = {
  front: { x: 80, y: 96, width: 240, height: 288 },
  back: { x: 81, y: 72, width: 238, height: 336 },
}

// How many canvas pixels represent one printed centimetre, per side.
export const pxPerCm = (view: StudioView) => PRINT_AREA_PX[view].width / PRINT_AREA_CM[view].width

export const cmToPx = (view: StudioView, cm: number) => cm * pxPerCm(view)
export const pxToCm = (view: StudioView, px: number) => px / pxPerCm(view)

export const maxPrintSize = (view: StudioView) => PRINT_AREA_CM[view]

// Fit an uploaded artwork (in original pixels) inside the printable area of the given
// side, preserving its aspect ratio and centring it.
export const fitDesignToArea = (
  view: StudioView,
  originalWidth: number,
  originalHeight: number,
) => {
  const area = PRINT_AREA_PX[view]
  const pad = 6
  const maxW = area.width - pad * 2
  const maxH = area.height - pad * 2
  const aspect = originalWidth && originalHeight ? originalWidth / originalHeight : 1

  let width = maxW
  let height = width / aspect
  if (height > maxH) {
    height = maxH
    width = height * aspect
  }

  return {
    width,
    height,
    x: area.x + (area.width - width) / 2,
    y: area.y + (area.height - height) / 2,
  }
}

// Keep a design fully inside the printable area of the given side.
export const clampDesignToArea = (
  view: StudioView,
  d: { x: number; y: number; width: number; height: number },
) => {
  const area = PRINT_AREA_PX[view]
  const width = Math.min(d.width, area.width)
  const height = Math.min(d.height, area.height)
  return {
    width,
    height,
    x: Math.max(area.x, Math.min(d.x, area.x + area.width - width)),
    y: Math.max(area.y, Math.min(d.y, area.y + area.height - height)),
  }
}
