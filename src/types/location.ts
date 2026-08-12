export interface LocationUpdate {
  assistantId: string;
  latitude: number;
  longitude: number;
  accuracy: number; // meters
  heading?: number; // degrees 0-360
  speed?: number; // m/s or km/h
  updatedAt: string;
  batteryLevel?: number; // percentage 0-100
}

export interface QueuedLocationUpdate extends LocationUpdate {
  queueId: string;
  retryCount: number;
}

export type GeofenceType = 'pickup_enter' | 'pickup_exit' | 'delivery_enter' | 'delivery_exit';

export interface GeofenceEvent {
  taskId: string;
  assistantId: string;
  geofenceType: GeofenceType;
  distanceMeters: number;
  timestamp: string;
}

export interface RouteMetrics {
  straightDistanceKm: number;
  estimatedRouteDistanceKm: number;
  etaMinutes: number;
  averageSpeedKmH: number;
}
