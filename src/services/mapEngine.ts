import { createMapProvider } from './mapProvider';
import {
  IMapProvider,
  MapCluster,
  MapEvent,
  MapEventType,
  MapMarkerData,
  MapProviderType,
  MapRoute,
  MapViewport,
  MarkerType,
} from '@/types/map';
import { clusterMarkers, generateRoutePolyline, getStatusColorHex } from '@/lib/mapUtils';
import { calculateRouteMetrics } from '@/lib/locationUtils';
import { eventBus } from '@/lib/eventBus';

/**
 * Production Live Operations Map Engine
 * Manages high-performance live map visualization, spatial clustering, multi-provider abstraction,
 * route polylines, and real-time state synchronization with GPS & Dispatch engines.
 */
export class MapEngine {
  private static provider: IMapProvider = createMapProvider('google');
  private static markers: Map<string, MapMarkerData> = new Map();
  private static routes: Map<string, MapRoute> = new Map();
  private static eventListeners: Set<(event: MapEvent) => void> = new Set();
  private static currentViewport: MapViewport = {
    center: { latitude: 40.7731, longitude: 30.3948 }, // Sakarya center default
    zoom: 13,
  };

  private static isInitialized = false;

  /**
   * Initializes map engine with container element and selected provider
   */
  public static async initialize(
    containerId: string,
    providerType: MapProviderType = 'google',
    initialViewport?: MapViewport
  ): Promise<void> {
    if (initialViewport) {
      this.currentViewport = initialViewport;
    }

    this.provider = createMapProvider(providerType);
    await this.provider.initialize(containerId, this.currentViewport);
    this.isInitialized = true;

    // Attach real-time event listeners
    this.attachRealtimeListeners();

    console.log(`[MapEngine] Operations Map initialized with ${providerType.toUpperCase()} provider.`);
  }

  /**
   * Switches map provider on the fly (e.g. Google Maps -> Mapbox)
   */
  public static async switchProvider(providerType: MapProviderType, containerId: string): Promise<void> {
    this.provider.destroy();
    this.provider = createMapProvider(providerType);
    await this.provider.initialize(containerId, this.currentViewport);
    this.refreshMap();
    console.log(`[MapEngine] Provider switched to ${providerType.toUpperCase()}`);
  }

  /**
   * Upserts a marker on the map
   */
  public static upsertMarker(marker: MapMarkerData): void {
    const existing = this.markers.get(marker.id);
    const colorHex = marker.colorHex || getStatusColorHex(marker.status);

    const updatedMarker: MapMarkerData = {
      ...marker,
      colorHex,
    };

    this.markers.set(marker.id, updatedMarker);

    // Emit event
    this.emitEvent(existing ? 'marker_update' : 'location_update', updatedMarker);

    // Render / Cluster update
    this.refreshMap();
  }

  /**
   * Removes marker by ID
   */
  public static removeMarker(id: string): void {
    if (this.markers.has(id)) {
      this.markers.delete(id);
      this.refreshMap();
    }
  }

  /**
   * Bulk loads markers (Optimized for 500+ / 1000+ / 5000+ markers)
   */
  public static loadBulkMarkers(markersList: MapMarkerData[]): void {
    markersList.forEach((m) => {
      const colorHex = m.colorHex || getStatusColorHex(m.status);
      this.markers.set(m.id, { ...m, colorHex });
    });

    this.refreshMap();
    console.log(`[MapEngine] Bulk loaded ${markersList.length} markers onto operations map.`);
  }

  /**
   * Generates and renders route polyline between task pickup and delivery
   */
  public static createOrUpdateTaskRoute(
    taskId: string,
    pickupLat: number,
    pickupLng: number,
    deliveryLat: number,
    deliveryLng: number
  ): MapRoute {
    const origin = { latitude: pickupLat, longitude: pickupLng };
    const destination = { latitude: deliveryLat, longitude: deliveryLng };

    const polylineCoordinates = generateRoutePolyline(origin, destination);
    const metrics = calculateRouteMetrics(pickupLat, pickupLng, deliveryLat, deliveryLng, 'motorcycle');

    const route: MapRoute = {
      id: `route-${taskId}`,
      taskId,
      origin,
      destination,
      polylineCoordinates,
      distanceKm: metrics.estimatedRouteDistanceKm,
      etaMinutes: metrics.etaMinutes,
      colorHex: '#3B82F6',
    };

    this.routes.set(route.id, route);
    this.provider.renderRoute(route);

    this.emitEvent('route_update', route);
    console.log(`[MapEngine] Route created for Task #${taskId} (ETA: ${metrics.etaMinutes} mins, ${metrics.estimatedRouteDistanceKm} km).`);

    return route;
  }

  /**
   * Clears route polyline from map
   */
  public static clearTaskRoute(taskId: string): void {
    const routeId = `route-${taskId}`;
    if (this.routes.has(routeId)) {
      this.routes.delete(routeId);
      this.provider.clearRoute(routeId);
    }
  }

  /**
   * Handles map spatial re-indexing, clustering, and rendering pipeline
   */
  private static refreshMap(): void {
    if (!this.isInitialized) return;

    const allMarkers = Array.from(this.markers.values());
    const { visibleMarkers, clusters } = clusterMarkers(allMarkers, 1.5);

    this.provider.renderMarkers(visibleMarkers);
    if (clusters.length > 0) {
      this.provider.renderClusters(clusters);
    }
  }

  /**
   * Subscribes to real-time events from EventBus and GPS updates
   */
  private static attachRealtimeListeners(): void {
    eventBus.subscribe('TASK_ACCEPTED', (evt) => {
      if (evt.payload && evt.payload.taskId) {
        this.emitEvent('task_update', evt.payload);
      }
    });

    eventBus.subscribe('TASK_CREATED', (evt) => {
      if (evt.payload && evt.payload.taskId && evt.payload.pickupLat && evt.payload.deliveryLat) {
        this.createOrUpdateTaskRoute(
          evt.payload.taskId,
          evt.payload.pickupLat,
          evt.payload.pickupLng,
          evt.payload.deliveryLat,
          evt.payload.deliveryLng
        );
      }
    });
  }

  /**
   * Pub/Sub listener registration for UI map components
   */
  public static onMapEvent(callback: (event: MapEvent) => void): () => void {
    this.eventListeners.add(callback);
    return () => this.eventListeners.delete(callback);
  }

  private static emitEvent(type: MapEventType, payload: any): void {
    const event: MapEvent = {
      type,
      payload,
      timestamp: new Date().toISOString(),
    };
    this.eventListeners.forEach((listener) => listener(event));
  }

  /**
   * Returns current map bounds / viewport state
   */
  public static getViewport(): MapViewport {
    return this.currentViewport;
  }

  /**
   * Destroys engine instance cleanly
   */
  public static destroy(): void {
    this.provider.destroy();
    this.markers.clear();
    this.routes.clear();
    this.eventListeners.clear();
    this.isInitialized = false;
  }
}
