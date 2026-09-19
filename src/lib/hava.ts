import exifr from 'exifr'

export interface HavaPhotoMetadata {
  capturedAt: string
  gpsCoordinates: string
  latitude: number | null
  longitude: number | null
  gpsSource: 'exif' | 'geolocation' | 'unavailable'
  exifJson: string | null
}

export async function computePhotoSha256(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function formatGpsDisplay(lat: number, lon: number): string {
  const latDir = lat >= 0 ? 'N' : 'S'
  const lonDir = lon >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(4)}\u00b0 ${latDir}, ${Math.abs(lon).toFixed(4)}\u00b0 ${lonDir}`
}

function getDeviceGps(): Promise<{ latitude: number; longitude: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) { resolve(null); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 5000, maximumAge: 30000 },
    )
  })
}

export async function extractPhotoMetadata(file: File): Promise<HavaPhotoMetadata> {
  let capturedAt: string = new Date().toISOString()
  let latitude: number | null = null
  let longitude: number | null = null
  let gpsSource: HavaPhotoMetadata['gpsSource'] = 'unavailable'
  let exifJson: string | null = null

  try {
    const exifData = await exifr.parse(file, {
      tiff: true, exif: true, gps: true, ifd1: false, interop: false,
      translateKeys: true, translateValues: true,
    })

    if (exifData) {
      const rawTs: Date | string | undefined =
        exifData.DateTimeOriginal ?? exifData.DateTime ?? exifData.CreateDate
      if (rawTs) {
        capturedAt = rawTs instanceof Date ? rawTs.toISOString() : new Date(rawTs as string).toISOString()
      }

      if (typeof exifData.latitude === 'number' && typeof exifData.longitude === 'number') {
        latitude = exifData.latitude
        longitude = exifData.longitude
        gpsSource = 'exif'
      }

      const safe: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(exifData)) {
        if (v !== undefined && v !== null && typeof v !== 'object') safe[k] = v
      }
      if (Object.keys(safe).length > 0) exifJson = JSON.stringify(safe)
    }
  } catch {
    // EXIF parse failure is non-fatal
  }

  if (gpsSource === 'unavailable') {
    const deviceGps = await getDeviceGps()
    if (deviceGps) {
      latitude = deviceGps.latitude
      longitude = deviceGps.longitude
      gpsSource = 'geolocation'
    }
  }

  const gpsCoordinates =
    latitude !== null && longitude !== null
      ? formatGpsDisplay(latitude, longitude)
      : 'GPS unavailable'

  return { capturedAt, gpsCoordinates, latitude, longitude, gpsSource, exifJson }
}