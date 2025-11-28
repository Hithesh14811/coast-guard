import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MapMarker {
  lat: number;
  lng: number;
  type: "live" | "lastKnown" | "predicted" | "pinned";
  popup?: string;
  accuracy?: number;
}

interface DriftPath {
  points: { lat: number; lng: number }[];
  color?: string;
}

interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number;
}

interface LeafletMapProps {
  center?: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  driftPaths?: DriftPath[];
  heatmapPoints?: HeatmapPoint[];
  showHeatmap?: boolean;
  showPaths?: boolean;
  className?: string;
  onMapReady?: (map: L.Map) => void;
  onMapClick?: (lat: number, lng: number) => void;
  allowClick?: boolean;
}

const defaultIcon = L.divIcon({
  className: "custom-marker",
  html: `<div class="w-6 h-6 bg-live rounded-full border-2 border-white shadow-lg animate-pulse"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const lastKnownIcon = L.divIcon({
  className: "custom-marker",
  html: `<div class="w-6 h-6 bg-drift rounded-full border-2 border-white shadow-lg opacity-80"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const predictedIcon = L.divIcon({
  className: "custom-marker",
  html: `<div class="w-4 h-4 bg-danger rounded-full border-2 border-white shadow-md opacity-60"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const pinnedIcon = L.divIcon({
  className: "custom-marker",
  html: `<div class="w-6 h-6 bg-ocean rounded-full border-2 border-white shadow-lg flex items-center justify-center"><div class="w-2 h-2 bg-white rounded-full"></div></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

export function LeafletMap({
  center = [13.0827, 80.2707],
  zoom = 10,
  markers = [],
  driftPaths = [],
  heatmapPoints = [],
  showHeatmap = true,
  showPaths = true,
  className = "",
  onMapReady,
  onMapClick,
  allowClick = false,
}: LeafletMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const pathsLayerRef = useRef<L.LayerGroup | null>(null);
  const heatmapLayerRef = useRef<L.LayerGroup | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center,
      zoom,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    pathsLayerRef.current = L.layerGroup().addTo(map);
    heatmapLayerRef.current = L.layerGroup().addTo(map);

    mapRef.current = map;
    setIsInitialized(true);

    if (onMapReady) {
      onMapReady(map);
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !isInitialized) return;

    const handleClick = (e: L.LeafletMouseEvent) => {
      if (allowClick && onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    };

    mapRef.current.on('click', handleClick);

    return () => {
      mapRef.current?.off('click', handleClick);
    };
  }, [allowClick, onMapClick, isInitialized]);

  useEffect(() => {
    if (!isInitialized || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    markers.forEach((marker) => {
      let icon;
      switch (marker.type) {
        case "live":
          icon = defaultIcon;
          break;
        case "lastKnown":
          icon = lastKnownIcon;
          break;
        case "pinned":
          icon = pinnedIcon;
          break;
        default:
          icon = predictedIcon;
      }

      const leafletMarker = L.marker([marker.lat, marker.lng], { icon });

      if (marker.popup) {
        leafletMarker.bindPopup(marker.popup);
      }

      markersLayerRef.current?.addLayer(leafletMarker);

      if (marker.accuracy && marker.accuracy > 0 && marker.type === "live") {
        const accuracyCircle = L.circle([marker.lat, marker.lng], {
          radius: marker.accuracy,
          color: '#22c55e',
          fillColor: '#22c55e',
          fillOpacity: 0.1,
          weight: 1,
        });
        markersLayerRef.current?.addLayer(accuracyCircle);
      }
    });
  }, [markers, isInitialized]);

  useEffect(() => {
    if (!isInitialized || !pathsLayerRef.current) return;

    pathsLayerRef.current.clearLayers();

    if (!showPaths) return;

    driftPaths.forEach((path, index) => {
      if (path.points.length < 2) return;

      const latLngs = path.points.map((p) => [p.lat, p.lng] as [number, number]);
      const polyline = L.polyline(latLngs, {
        color: path.color || `hsl(${(index * 30) % 360}, 70%, 50%)`,
        weight: 2,
        opacity: 0.6,
        dashArray: "5, 5",
      });

      pathsLayerRef.current?.addLayer(polyline);
    });
  }, [driftPaths, showPaths, isInitialized]);

  useEffect(() => {
    if (!isInitialized || !heatmapLayerRef.current) return;

    heatmapLayerRef.current.clearLayers();

    if (!showHeatmap || heatmapPoints.length === 0) return;

    heatmapPoints.forEach((point) => {
      const intensity = Math.min(1, Math.max(0.2, point.intensity));
      const radius = 8 + intensity * 12;
      const opacity = 0.3 + intensity * 0.4;

      const circle = L.circleMarker([point.lat, point.lng], {
        radius,
        fillColor: `rgb(245, ${Math.floor(158 - intensity * 100)}, ${Math.floor(11 + intensity * 50)})`,
        fillOpacity: opacity,
        stroke: false,
      });

      heatmapLayerRef.current?.addLayer(circle);
    });
  }, [heatmapPoints, showHeatmap, isInitialized]);

  useEffect(() => {
    if (!mapRef.current || !isInitialized) return;

    if (markers.length > 0) {
      const liveMarker = markers.find((m) => m.type === "live");
      if (liveMarker) {
        mapRef.current.setView([liveMarker.lat, liveMarker.lng], mapRef.current.getZoom());
      }
    }
  }, [markers, isInitialized]);

  return (
    <div
      ref={mapContainerRef}
      className={`w-full h-full min-h-[200px] ${className}`}
      data-testid="map-container"
    />
  );
}
