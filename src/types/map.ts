export type MapProviderType = 'google' | 'mapbox' | 'leaflet' | 'mock';

export type MarkerType = 'assistant' | 'partner' | 'customer' | 'pickup' | 'delivery' | 'task';

export type EntityStatus = 'idle' | 'working' | 'offline' | 'busy' | 'suspended';

export interface MapCoordinates {
  latitude: number;
  longitude: number;
}

export interface MapBounds {
  northEast: MapCoordinates;
  southWest: MapCoordinates;
}

export interface MapViewport {
  center: MapCoordinates;
  zoom: number;
  bounds?: MapBounds;
}

export interface MapMarkerData {
  id: string;
  type: MarkerType;
  title: string;
  coordinates: MapCoordinates;
  status?: EntityStatus;
  heading?: number;
  iconUrl?: string;
  colorHex?: string;
  metadata?: Record<string, any>;
}

export interface MapRoute {
  id: string;
  taskId: string;
  origin: MapCoordinates;
  destination: MapCoordinates;
  waypoints?: MapCoordinates[];
  polylineCoordinates: MapCoordinates[];
  distanceKm: number;
  etaMinutes: number;
  colorHex?: string;
}

export interface MapCluster {
  id: string;
  center: MapCoordinates;
  count: number;
  markerIds: string[];
}

export type MapEventType = 'marker_click' | 'marker_update' | 'location_update' | 'route_update' | 'task_update' | 'viewport_change';

export interface MapEvent {
  type: MapEventType;
  payload: any;
  timestamp: string;
}

export interface IMapProvider {
  name: MapProviderType;
  initialize(containerId: string, initialViewport: MapViewport): Promise<void>;
  setViewport(viewport: MapViewport): void;
  renderMarkers(markers: MapMarkerData[]): void;
  renderClusters(clusters: MapCluster[]): void;
  renderRoute(route: MapRoute): void;
  clearRoute(routeId: string): void;
  destroy(): void;
}
