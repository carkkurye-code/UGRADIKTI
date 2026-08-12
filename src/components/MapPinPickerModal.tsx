import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X, Navigation, Check, MapPin, Loader2 } from 'lucide-react';
import { reverseGeocodeCoordinate, StructuredAddress } from '@/services/gpsLocationService';

interface MapPinPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (address: StructuredAddress) => void;
  initialLat?: number | null;
  initialLng?: number | null;
}

export function MapPinPickerModal({
  isOpen,
  onClose,
  onConfirm,
  initialLat,
  initialLng,
}: MapPinPickerModalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerInstanceRef = useRef<L.Marker | null>(null);

  const [currentLat, setCurrentLat] = useState<number>(initialLat || 40.7833);
  const [currentLng, setCurrentLng] = useState<number>(initialLng || 30.4000);
  const [isLoadingAddress, setIsLoadingAddress] = useState<boolean>(false);
  const [resolvedAddress, setResolvedAddress] = useState<StructuredAddress | null>(null);

  // Custom SVG map pin icon (monochrome UĞRA theme)
  const createPinIcon = () => {
    return L.divIcon({
      className: 'ugra-map-pin-icon',
      html: `
        <div style="position:relative; width:36px; height:36px; display:flex; align-items:center; justify-content:center;">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="#18181b" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.4));">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3" fill="#ffffff"/>
          </svg>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
    });
  };

  const updatePosition = async (lat: number, lng: number) => {
    setCurrentLat(lat);
    setCurrentLng(lng);
    setIsLoadingAddress(true);
    try {
      const structured = await reverseGeocodeCoordinate(lat, lng, 10);
      setResolvedAddress(structured);
    } catch (e) {
      console.error('Reverse geocode error:', e);
    } finally {
      setIsLoadingAddress(false);
    }
  };

  // Lock body scroll and ESC key handling
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Leaflet initialization
  useEffect(() => {
    if (!isOpen) return;

    const defaultLat = initialLat || 40.7833;
    const defaultLng = initialLng || 30.4000;

    setCurrentLat(defaultLat);
    setCurrentLng(defaultLng);

    updatePosition(defaultLat, defaultLng);

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const map = L.map(mapContainerRef.current, {
        center: [defaultLat, defaultLng],
        zoom: 16,
        zoomControl: false,
      });

      L.control.zoom({ position: 'topright' }).addTo(map);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([defaultLat, defaultLng], {
        draggable: true,
        icon: createPinIcon(),
      }).addTo(map);

      marker.on('dragend', () => {
        const position = marker.getLatLng();
        updatePosition(position.lat, position.lng);
      });

      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        updatePosition(lat, lng);
      });

      mapInstanceRef.current = map;
      markerInstanceRef.current = marker;

      map.invalidateSize();

      if (!initialLat && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            map.setView([lat, lng], 17);
            marker.setLatLng([lat, lng]);
            updatePosition(lat, lng);
          },
          () => {},
          { timeout: 5000, enableHighAccuracy: true }
        );
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (resolvedAddress) {
      onConfirm(resolvedAddress);
    } else {
      onConfirm({
        street: 'Sokak Belirtilmedi',
        district: 'Adapazarı',
        city: 'Sakarya',
        province: 'Sakarya',
        postal_code: '54100',
        place_id: `pin_${currentLat}_${currentLng}`,
        latitude: currentLat,
        longitude: currentLng,
        accuracy: 10,
        formatted_address: `Konum (${currentLat.toFixed(6)}, ${currentLng.toFixed(6)})`,
      });
    }
    onClose();
  };

  const handleRecenter = () => {
    if (navigator.geolocation && mapInstanceRef.current && markerInstanceRef.current) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        mapInstanceRef.current?.setView([lat, lng], 17);
        markerInstanceRef.current?.setLatLng([lat, lng]);
        updatePosition(lat, lng);
      });
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-md flex flex-col font-sans select-none animate-in fade-in duration-200 pointer-events-auto">
      {/* Top Header */}
      <div className="px-4 py-3 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between shrink-0 relative z-30 pointer-events-auto">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-white" />
          <span className="text-sm font-bold text-white tracking-wide">
            Haritadan Konum Seç
          </span>
        </div>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
          className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer outline-none relative z-40 pointer-events-auto"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Map Body Container */}
      <div className="relative flex-1 w-full bg-zinc-950 overflow-hidden z-0 pointer-events-auto">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Floating Recenter Button */}
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleRecenter();
          }}
          className="absolute bottom-4 right-4 z-20 p-3 rounded-full bg-zinc-900/90 border border-zinc-700 text-white shadow-lg hover:bg-zinc-800 transition-colors cursor-pointer flex items-center justify-center pointer-events-auto"
          title="Mevcut Konumuma Git"
        >
          <Navigation className="w-5 h-5" />
        </button>
      </div>

      {/* Bottom Panel */}
      <div className="p-4 bg-zinc-900 border-t border-zinc-800 shrink-0 space-y-3 relative z-30 pointer-events-auto">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
            Seçilen Adres
          </span>
          <div className="min-h-[42px] flex items-center justify-between gap-3 bg-zinc-950/80 border border-zinc-800/80 rounded-xl px-3.5 py-2">
            {isLoadingAddress ? (
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-200" />
                <span>Adres yükleniyor...</span>
              </div>
            ) : (
              <p className="text-xs font-semibold text-white leading-relaxed line-clamp-2 text-left">
                {resolvedAddress?.formatted_address || `Konum (${currentLat.toFixed(6)}, ${currentLng.toFixed(6)})`}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 relative z-40 pointer-events-auto">
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="py-2.5 px-4 rounded-xl border border-zinc-700 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-bold transition-all cursor-pointer relative z-50 pointer-events-auto"
          >
            İptal
          </button>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleConfirm();
            }}
            className="py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm relative z-50 pointer-events-auto"
          >
            <Check className="w-4 h-4 text-black" />
            <span>Konumu Onayla</span>
          </button>
        </div>
      </div>
    </div>
  );

  return modalContent;
}
