import { EntityStatus, MapCluster, MapCoordinates, MapMarkerData, MarkerType } from '@/types/map';

/**
 * Returns hex color associated with entity operational status
 */
export function getStatusColorHex(status: EntityStatus = 'idle'): string {
  switch (status) {
    case 'idle':
      return '#10B981'; // Emerald Green
    case 'working':
      return '#3B82F6'; // Royal Blue
    case 'busy':
      return '#F59E0B'; // Amber Yellow
    case 'offline':
      return '#6B7280'; // Slate Gray
    case 'suspended':
      return '#EF4444'; // Coral Red
    default:
      return '#6B7280';
  }
}

/**
 * Returns icon badge color for marker type
 */
export function getMarkerTypeColorHex(type: MarkerType): string {
  switch (type) {
    case 'assistant':
      return '#3B82F6'; // Blue
    case 'partner':
      return '#8B5CF6'; // Purple
    case 'customer':
      return '#EC4899'; // Pink
    case 'pickup':
      return '#F59E0B'; // Orange / Amber
    case 'delivery':
      return '#10B981'; // Emerald Green
    case 'task':
      return '#6366F1'; // Indigo
    default:
      return '#3B82F6';
  }
}

/**
 * Generates lightweight grid-based clusters for high performance with 1000+ markers
 */
export function clusterMarkers(
  markers: MapMarkerData[],
  gridSizeKm = 1.5
): { visibleMarkers: MapMarkerData[]; clusters: MapCluster[] } {
  if (markers.length < 50) {
    // Under 50 markers, render all directly without clustering overhead
    return { visibleMarkers: markers, clusters: [] };
  }

  const gridMap: Map<string, MapMarkerData[]> = new Map();

  markers.forEach((marker) => {
    // Spatial hash grid key
    const latCell = Math.floor(marker.coordinates.latitude / (gridSizeKm / 111));
    const lngCell = Math.floor(
      marker.coordinates.longitude / (gridSizeKm / (111 * Math.cos((marker.coordinates.latitude * Math.PI) / 180)))
    );
    const key = `${latCell}:${lngCell}`;

    if (!gridMap.has(key)) {
      gridMap.set(key, []);
    }
    gridMap.get(key)!.push(marker);
  });

  const visibleMarkers: MapMarkerData[] = [];
  const clusters: MapCluster[] = [];

  gridMap.forEach((gridItems, key) => {
    if (gridItems.length === 1) {
      visibleMarkers.push(gridItems[0]);
    } else {
      // Calculate cluster center
      const totalLat = gridItems.reduce((acc, m) => acc + m.coordinates.latitude, 0);
      const totalLng = gridItems.reduce((acc, m) => acc + m.coordinates.longitude, 0);

      clusters.push({
        id: `cluster-${key}`,
        center: {
          latitude: totalLat / gridItems.length,
          longitude: totalLng / gridItems.length,
        },
        count: gridItems.length,
        markerIds: gridItems.map((m) => m.id),
      });
    }
  });

  return { visibleMarkers, clusters };
}

/**
 * Interpolates intermediate polyline coordinates between pickup and delivery
 */
export function generateRoutePolyline(
  origin: MapCoordinates,
  destination: MapCoordinates,
  steps = 8
): MapCoordinates[] {
  const points: MapCoordinates[] = [origin];

  for (let i = 1; i < steps; i++) {
    const fraction = i / steps;
    // Add small random curve curvature to simulate city grid turnings
    const curvatureLat = Math.sin(fraction * Math.PI) * 0.002;
    const curvatureLng = Math.cos(fraction * Math.PI) * 0.002;

    points.push({
      latitude: origin.latitude + (destination.latitude - origin.latitude) * fraction + curvatureLat,
      longitude: origin.longitude + (destination.longitude - origin.longitude) * fraction + curvatureLng,
    });
  }

  points.push(destination);
  return points;
}
