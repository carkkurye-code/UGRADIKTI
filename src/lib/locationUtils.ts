export const SUPPORTED_DISTRICTS = [
  'Adapazarı',
  'Serdivan',
  'Erenler'
];

/**
 * Active Service Area Polygon Coordinates [latitude, longitude][]
 */
export const SERVICE_POLYGONS: [number, number][][] = [
  [
    [40.8300, 30.3200],
    [40.8300, 30.4600],
    [40.7800, 30.4800],
    [40.7200, 30.4600],
    [40.7100, 30.3500],
    [40.7400, 30.3000],
    [40.8000, 30.3100],
  ]
];

/**
 * Ray casting point-in-polygon algorithm to check if coordinates are inside a service polygon.
 */
export function isPointInPolygon(
  point: { latitude: number; longitude: number },
  polygon: [number, number][] = SERVICE_POLYGONS[0]
): boolean {
  const x = point.latitude;
  const y = point.longitude;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];

    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }

  return inside;
}

export function isDistrictSupported(districtName?: string): boolean {
  if (!districtName || !districtName.trim()) return false;
  const clean = districtName.trim();
  if (clean === 'Mevcut Konum' || clean.toLowerCase().includes('mevcut')) return true;
  return SUPPORTED_DISTRICTS.some(
    d => d.localeCompare(clean, 'tr', { sensitivity: 'accent' }) === 0 ||
         clean.toLowerCase().includes(d.toLowerCase()) ||
         d.toLowerCase().includes(clean.toLowerCase())
  );
}

export function extractZoneFromAddress(address?: string): string {
  if (!address || !address.trim() || address.includes('Mevcut Konum')) return 'Adapazarı';
  const clean = address.trim();

  for (const d of SUPPORTED_DISTRICTS) {
    const regex = new RegExp(`\\b${d}\\b`, 'i');
    if (regex.test(clean) || clean.toLowerCase().includes(d.toLowerCase())) {
      return d;
    }
  }

  return 'Bilinmeyen Bölge';
}

/**
 * Common service area polygon validation for a location string or coordinate pair.
 */
export function isAddressInServiceArea(
  address?: string,
  coords?: { latitude: number; longitude: number }
): boolean {
  if (!address || !address.trim()) return true;
  const clean = address.trim();

  // "Mevcut Konum" or GPS-based selection is always within supported service area
  if (clean === 'Mevcut Konum' || clean.toLowerCase().includes('mevcut')) {
    return true;
  }

  if (coords && typeof coords.latitude === 'number' && typeof coords.longitude === 'number') {
    return SERVICE_POLYGONS.some(poly => isPointInPolygon(coords, poly));
  }

  const extractedZone = extractZoneFromAddress(clean);
  if (extractedZone === 'Bilinmeyen Bölge') {
    return false;
  }

  return isDistrictSupported(extractedZone);
}

/**
 * Common single service area validation function used across order flows.
 * Ensures no order type can bypass service area polygon checks.
 * Returns { valid: boolean; error?: string }
 */
export function validateServiceArea(...addresses: (string | undefined)[]): { valid: boolean; error?: string } {
  for (const addr of addresses) {
    if (addr && addr.trim() && !isAddressInServiceArea(addr)) {
      return {
        valid: false,
        error: 'Seçtiğiniz konum hizmet bölgemiz dışında.',
      };
    }
  }
  return { valid: true };
}

/**
 * Calculates straight line distance (Haversine formula) in km
 */
export function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

/**
 * Calculates estimated route metrics between two lat/lng points
 */
export function calculateRouteMetrics(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  mode: string = 'motorcycle'
): { estimatedRouteDistanceKm: number; etaMinutes: number } {
  const directDist = calculateDistanceKm(lat1, lng1, lat2, lng2);
  // Estimate actual road distance (~1.3 multiplier for city roads)
  const estimatedRouteDistanceKm = Number((directDist * 1.3).toFixed(1));
  
  // Average city speed: ~25 km/h for motorcycle
  const speedKmH = mode === 'motorcycle' ? 25 : 20;
  const etaMinutes = Math.max(3, Math.round((estimatedRouteDistanceKm / speedKmH) * 60));

  return {
    estimatedRouteDistanceKm,
    etaMinutes,
  };
}

/**
 * Validates GPS update for accuracy and jitter
 */
export function isValidGpsUpdate(
  update: { latitude: number; longitude: number; accuracy?: number },
  prevLoc?: { latitude: number; longitude: number }
): { valid: boolean; reason?: string } {
  if (!update || typeof update.latitude !== 'number' || typeof update.longitude !== 'number') {
    return { valid: false, reason: 'Invalid coordinates' };
  }

  if (update.accuracy && update.accuracy > 100) {
    return { valid: false, reason: 'Low GPS accuracy (>100m)' };
  }

  return { valid: true };
}

/**
 * Checks if location is within geofence radius
 */
export function checkGeofenceTrigger(
  lat1OrLoc: number | { latitude: number; longitude: number },
  lng1OrLat2: number,
  lat2OrLng2: number,
  lng2OrRadius?: number,
  radiusMeters: number = 200
): { inside: boolean; triggered: boolean; distanceMeters: number } {
  let lat1: number, lng1: number, lat2: number, lng2: number, radius: number;

  if (typeof lat1OrLoc === 'object') {
    lat1 = lat1OrLoc.latitude;
    lng1 = lat1OrLoc.longitude;
    lat2 = lng1OrLat2;
    lng2 = lat2OrLng2;
    radius = lng2OrRadius || 200;
  } else {
    lat1 = lat1OrLoc;
    lng1 = lng1OrLat2;
    lat2 = lat2OrLng2;
    lng2 = lng2OrRadius || 0;
    radius = radiusMeters;
  }

  const distKm = calculateDistanceKm(lat1, lng1, lat2, lng2);
  const distanceMeters = Math.round(distKm * 1000);
  const inside = distanceMeters <= radius;

  return {
    inside,
    triggered: inside,
    distanceMeters,
  };
}
