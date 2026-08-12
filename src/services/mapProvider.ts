import { IMapProvider, MapCluster, MapMarkerData, MapProviderType, MapRoute, MapViewport } from '@/types/map';

/**
 * Google Maps Provider Implementation Stub / Wrapper
 */
export class GoogleMapProvider implements IMapProvider {
  public name: MapProviderType = 'google';
  private containerId?: string;
  private currentMarkers: Map<string, MapMarkerData> = new Map();

  public async initialize(containerId: string, initialViewport: MapViewport): Promise<void> {
    this.containerId = containerId;
    console.log(`[GoogleMapProvider] Initialized map in #${containerId} at`, initialViewport.center);
  }

  public setViewport(viewport: MapViewport): void {
    console.log(`[GoogleMapProvider] Viewport updated: Zoom ${viewport.zoom}, Center:`, viewport.center);
  }

  public renderMarkers(markers: MapMarkerData[]): void {
    this.currentMarkers.clear();
    markers.forEach((m) => this.currentMarkers.set(m.id, m));
    console.log(`[GoogleMapProvider] Rendered ${markers.length} markers.`);
  }

  public renderClusters(clusters: MapCluster[]): void {
    console.log(`[GoogleMapProvider] Rendered ${clusters.length} clusters.`);
  }

  public renderRoute(route: MapRoute): void {
    console.log(`[GoogleMapProvider] Rendered route #${route.id} (${route.distanceKm} km, ${route.etaMinutes} mins).`);
  }

  public clearRoute(routeId: string): void {
    console.log(`[GoogleMapProvider] Cleared route #${routeId}.`);
  }

  public destroy(): void {
    this.currentMarkers.clear();
    console.log('[GoogleMapProvider] Map destroyed cleanly.');
  }
}

/**
 * Mapbox Provider Implementation Wrapper
 */
export class MapboxMapProvider implements IMapProvider {
  public name: MapProviderType = 'mapbox';
  private containerId?: string;

  public async initialize(containerId: string, initialViewport: MapViewport): Promise<void> {
    this.containerId = containerId;
    console.log(`[MapboxMapProvider] Initialized Mapbox in #${containerId} at`, initialViewport.center);
  }

  public setViewport(viewport: MapViewport): void {
    console.log(`[MapboxMapProvider] Viewport set to`, viewport.center);
  }

  public renderMarkers(markers: MapMarkerData[]): void {
    console.log(`[MapboxMapProvider] Rendered ${markers.length} Mapbox GL markers.`);
  }

  public renderClusters(clusters: MapCluster[]): void {
    console.log(`[MapboxMapProvider] Rendered ${clusters.length} Mapbox superclusters.`);
  }

  public renderRoute(route: MapRoute): void {
    console.log(`[MapboxMapProvider] Rendered Mapbox direction polyline #${route.id}.`);
  }

  public clearRoute(routeId: string): void {
    console.log(`[MapboxMapProvider] Removed polyline layer #${routeId}.`);
  }

  public destroy(): void {
    console.log('[MapboxMapProvider] Mapbox destroyed.');
  }
}

/**
 * Lightweight Headless Mock Provider for server/testing environments
 */
export class MockMapProvider implements IMapProvider {
  public name: MapProviderType = 'mock';

  public async initialize(containerId: string, initialViewport: MapViewport): Promise<void> {
    console.log(`[MockMapProvider] Headless map engine attached to #${containerId}`);
  }

  public setViewport(viewport: MapViewport): void {}
  public renderMarkers(markers: MapMarkerData[]): void {}
  public renderClusters(clusters: MapCluster[]): void {}
  public renderRoute(route: MapRoute): void {}
  public clearRoute(routeId: string): void {}
  public destroy(): void {}
}

/**
 * Factory method for map providers
 */
export function createMapProvider(type: MapProviderType): IMapProvider {
  switch (type) {
    case 'google':
      return new GoogleMapProvider();
    case 'mapbox':
      return new MapboxMapProvider();
    default:
      return new MockMapProvider();
  }
}
