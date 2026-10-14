import React, { useRef, useEffect, useState, useCallback } from 'react';
import L from 'leaflet';
import {
  Coordinates,
  CalculationResult,
  Language,
  InteractionMode,
  Landmark,
  TacticalDrawing
} from '../types/mortar';
import { MapData } from '../data/mapsData';
import { meterToGrid4 } from '../utils/ballistics';
import { translations } from '../utils/translations';

interface TacticalMapProps {
  mapData: MapData;
  mortar: Coordinates;
  target: Coordinates;
  solution: CalculationResult | null;
  onSetMortar: (coords: Coordinates) => void;
  onSetTarget: (coords: Coordinates) => void;
  interactionMode: InteractionMode;
  onSelectInteractionMode: (mode: InteractionMode) => void;
  drawings: TacticalDrawing[];
  onAddDrawing: (drawing: TacticalDrawing) => void;
  onClearDrawings: () => void;
  lang: Language;
  minRange: number;
  maxRange: number;
}

// Enfusion Engine Coordinate Reference System for Leaflet
const ENFUSION_SCALE_CONSTANT = 12.501;

const EnfusionCRS = L.Util.extend({}, L.CRS.Simple, {
  projection: L.Projection.LonLat,
  transformation: new L.Transformation(1 / ENFUSION_SCALE_CONSTANT, 0, -1 / ENFUSION_SCALE_CONSTANT, 0),
  scale(zoom: number) {
    return Math.pow(2, zoom);
  },
  zoom(scale: number) {
    return Math.log(scale) / Math.LN2;
  },
  distance(p1: L.LatLng, p2: L.LatLng) {
    const dx = p2.lng - p1.lng;
    const dy = p2.lat - p1.lat;
    return Math.sqrt(dx * dx + dy * dy);
  },
  infinite: true
}) as L.CRS;

// Custom TileLayer to handle EnfusionMapMaker inverted Y tile coordinates
class EnfusionTileLayer extends L.TileLayer {
  getTileUrl(coords: L.Coords): string {
    const invertedY = -(coords.y + 1);
    const tileCoords = {
      x: coords.x,
      y: invertedY,
      z: coords.z
    };
    return super.getTileUrl(tileCoords as unknown as L.Coords);
  }
}

export const TacticalMap: React.FC<TacticalMapProps> = ({
  mapData,
  mortar,
  target,
  solution,
  onSetMortar,
  onSetTarget,
  interactionMode,
  onSelectInteractionMode,
  drawings,
  onAddDrawing,
  onClearDrawings,
  lang,
  minRange,
  maxRange
}) => {
  const t = translations[lang];
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<EnfusionTileLayer | null>(null);

  // Layers refs
  const gridLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const landmarksLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const drawingsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const trajectoryLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const rulerLayerGroupRef = useRef<L.LayerGroup | null>(null);

  // Markers refs
  const mortarMarkerRef = useRef<L.Marker | null>(null);
  const targetMarkerRef = useRef<L.Marker | null>(null);

  // Map Tile Loading State & Diagnostics
  const [tileLoadingStatus, setTileLoadingStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('loading');
  const [tilesLoadedCount, setTilesLoadedCount] = useState<number>(0);
  const [tilesErrorCount, setTilesErrorCount] = useState<number>(0);
  const [lastErrorMessage, setLastErrorMessage] = useState<string | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(0);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);

  // Cursor coordinates
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  // Measurement tool state
  const [measurePointA, setMeasurePointA] = useState<{ x: number; y: number } | null>(null);
  const [measurePointB, setMeasurePointB] = useState<{ x: number; y: number } | null>(null);

  // Active in-progress drawing
  const [drawingStart, setDrawingStart] = useState<{ x: number; y: number } | null>(null);
  const [drawingColor, setDrawingColor] = useState<string>('#ef4444');

  // Display toggles
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [showRings, setShowRings] = useState<boolean>(true);

  // Elevation calculation helper
  const getGroundElevation = useCallback((x: number, y: number) => {
    let nearest: Landmark | null = null;
    let minDist = Infinity;
    for (const lm of mapData.landmarks) {
      const d = Math.hypot(lm.x - x, lm.y - y);
      if (d < minDist) {
        minDist = d;
        nearest = lm;
      }
    }
    if (nearest && minDist < 2000) {
      const weight = Math.max(0, 1 - minDist / 2000);
      return Math.round(nearest.alt * weight + 20 * (1 - weight));
    }
    return 30; // Default elevation
  }, [mapData.landmarks]);

  // 1. Initialize Leaflet Map on Mount
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Map bounds in Enfusion coordinate space: [0, 0] to [size, size]
    // In LonLat CRS: lat = Northing (Y), lng = Easting (X)
    const southWest = L.latLng(0, 0);
    const northEast = L.latLng(mapData.size, mapData.size);
    const bounds = L.latLngBounds(southWest, northEast);

    const map = L.map(mapContainerRef.current, {
      crs: EnfusionCRS,
      center: bounds.getCenter(),
      zoom: 0,
      minZoom: 0,
      maxZoom: mapData.maxZoomLOD || 5,
      maxBounds: bounds.pad(0.3),
      maxBoundsViscosity: 0.8,
      zoomControl: false,
      attributionControl: false,
      bounceAtZoomLimits: false
    });

    leafletMapRef.current = map;

    // Layer groups
    gridLayerGroupRef.current = L.layerGroup().addTo(map);
    landmarksLayerGroupRef.current = L.layerGroup().addTo(map);
    drawingsLayerGroupRef.current = L.layerGroup().addTo(map);
    trajectoryLayerGroupRef.current = L.layerGroup().addTo(map);
    rulerLayerGroupRef.current = L.layerGroup().addTo(map);

    // Initial view
    map.fitBounds(bounds);
    setCurrentZoom(map.getZoom());

    map.on('zoomend', () => {
      setCurrentZoom(map.getZoom());
    });

    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      const x = Math.max(0, Math.min(mapData.size, e.latlng.lng));
      const y = Math.max(0, Math.min(mapData.size, e.latlng.lat));
      setCursorPos({ x, y });
    });

    return () => {
      map.remove();
      leafletMapRef.current = null;
    };
  }, [mapData.id, mapData.size, mapData.maxZoomLOD]);

  // 2. Load Multi-Level Real Map Tiles
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map) return;

    // Remove existing tile layer if any
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }

    setTileLoadingStatus('loading');
    setTilesLoadedCount(0);
    setTilesErrorCount(0);
    setLastErrorMessage(null);

    const southWest = L.latLng(0, 0);
    const northEast = L.latLng(mapData.size, mapData.size);
    const bounds = L.latLngBounds(southWest, northEast);

    const maxZoom = mapData.maxZoomLOD || 5;

    // Real multi-level EnfusionMapMaker tile layer
    const tileLayer = new EnfusionTileLayer(mapData.tileTemplateUrl, {
      maxZoom: maxZoom,
      minZoom: 0,
      // Invert zoom so Leaflet zoom 0 maps to LOD 5 (overview), and Leaflet zoom 5 maps to LOD 0 (high detail)
      zoomReverse: true,
      bounds: bounds,
      tileSize: 256,
      keepBuffer: 6
    });

    tileLayer.on('tileloadstart', () => {
      setTileLoadingStatus('loading');
    });

    tileLayer.on('tileload', () => {
      setTilesLoadedCount(c => c + 1);
      setTileLoadingStatus('loaded');
    });

    tileLayer.on('tileerror', (e) => {
      setTilesErrorCount(c => c + 1);
      const target = e.tile as HTMLImageElement;
      setLastErrorMessage(`Failed loading tile: ${target.src}`);
      // If majority of tiles fail, mark error state
      setTileLoadingStatus('error');
    });

    tileLayer.addTo(map);
    tileLayerRef.current = tileLayer;

    // Fit map bounds
    map.fitBounds(bounds);
  }, [mapData.id, mapData.tileTemplateUrl, mapData.size, mapData.maxZoomLOD]);

  // 3. Map Click & Interaction Handling
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map) return;

    const handleClick = (e: L.LeafletMouseEvent) => {
      const x = Math.max(0, Math.min(mapData.size, e.latlng.lng));
      const y = Math.max(0, Math.min(mapData.size, e.latlng.lat));
      const alt = getGroundElevation(x, y);

      if (interactionMode === 'mortar') {
        onSetMortar({ x, y, alt });
      } else if (interactionMode === 'target') {
        onSetTarget({ x, y, alt });
      } else if (interactionMode === 'measure') {
        if (!measurePointA) {
          setMeasurePointA({ x, y });
          setMeasurePointB({ x, y });
        } else {
          setMeasurePointB({ x, y });
        }
      } else if (interactionMode === 'draw_line') {
        if (!drawingStart) {
          setDrawingStart({ x, y });
        } else {
          onAddDrawing({
            id: Math.random().toString(36).substring(2, 9),
            mapId: mapData.id,
            type: 'line',
            color: drawingColor,
            points: [[drawingStart.x, drawingStart.y], [x, y]],
            timestamp: Date.now()
          });
          setDrawingStart(null);
        }
      } else if (interactionMode === 'draw_circle') {
        if (!drawingStart) {
          setDrawingStart({ x, y });
        } else {
          const radiusMeters = Math.hypot(x - drawingStart.x, y - drawingStart.y);
          onAddDrawing({
            id: Math.random().toString(36).substring(2, 9),
            mapId: mapData.id,
            type: 'circle',
            color: drawingColor,
            points: [[drawingStart.x, drawingStart.y]],
            radius: Math.max(50, radiusMeters),
            timestamp: Date.now()
          });
          setDrawingStart(null);
        }
      } else if (interactionMode === 'draw_point') {
        onAddDrawing({
          id: Math.random().toString(36).substring(2, 9),
          mapId: mapData.id,
          type: 'point',
          color: drawingColor,
          points: [[x, y]],
          label: `${meterToGrid4(x)}-${meterToGrid4(y)}`,
          timestamp: Date.now()
        });
      }
    };

    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [
    mapData.id,
    mapData.size,
    interactionMode,
    drawingStart,
    drawingColor,
    measurePointA,
    onSetMortar,
    onSetTarget,
    onAddDrawing,
    getGroundElevation
  ]);

  // 4. Update Battery (Mortar) and Target Markers
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map) return;

    // Mortar Marker
    if (mortar.x > 0 && mortar.y > 0) {
      const mortarLatLng = L.latLng(mortar.y, mortar.x);

      if (!mortarMarkerRef.current) {
        const icon = L.divIcon({
          className: '',
          html: `
            <div class="relative flex items-center justify-center w-8 h-8 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-auto">
              <div class="absolute inset-0 rounded-full bg-red-500/30 animate-ping"></div>
              <div class="w-6 h-6 rounded-full bg-red-600 border-2 border-white shadow-lg flex items-center justify-center text-[10px] font-bold text-white">
                🔴
              </div>
            </div>
          `,
          iconSize: [0, 0]
        });

        const marker = L.marker(mortarLatLng, {
          icon,
          draggable: true,
          zIndexOffset: 1000
        }).addTo(map);

        marker.on('drag', (e: L.LeafletEvent) => {
          const m = e.target as L.Marker;
          const pos = m.getLatLng();
          const alt = getGroundElevation(pos.lng, pos.lat);
          onSetMortar({ x: pos.lng, y: pos.lat, alt });
        });

        mortarMarkerRef.current = marker;
      } else {
        mortarMarkerRef.current.setLatLng(mortarLatLng);
      }
    } else if (mortarMarkerRef.current) {
      map.removeLayer(mortarMarkerRef.current);
      mortarMarkerRef.current = null;
    }

    // Target Marker
    if (target.x > 0 && target.y > 0) {
      const targetLatLng = L.latLng(target.y, target.x);

      if (!targetMarkerRef.current) {
        const icon = L.divIcon({
          className: '',
          html: `
            <div class="relative flex items-center justify-center w-8 h-8 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-auto">
              <div class="absolute inset-0 rounded-full bg-blue-500/30 animate-ping"></div>
              <div class="w-6 h-6 rounded-full bg-blue-600 border-2 border-white shadow-lg flex items-center justify-center text-xs font-bold text-white">
                🎯
              </div>
            </div>
          `,
          iconSize: [0, 0]
        });

        const marker = L.marker(targetLatLng, {
          icon,
          draggable: true,
          zIndexOffset: 1000
        }).addTo(map);

        marker.on('drag', (e: L.LeafletEvent) => {
          const m = e.target as L.Marker;
          const pos = m.getLatLng();
          const alt = getGroundElevation(pos.lng, pos.lat);
          onSetTarget({ x: pos.lng, y: pos.lat, alt });
        });

        targetMarkerRef.current = marker;
      } else {
        targetMarkerRef.current.setLatLng(targetLatLng);
      }
    } else if (targetMarkerRef.current) {
      map.removeLayer(targetMarkerRef.current);
      targetMarkerRef.current = null;
    }
  }, [mortar.x, mortar.y, target.x, target.y, onSetMortar, onSetTarget, getGroundElevation]);

  // 5. Update Firing Trajectory and Range Rings
  useEffect(() => {
    const trajectoryGroup = trajectoryLayerGroupRef.current;
    if (!trajectoryGroup) return;
    trajectoryGroup.clearLayers();

    // Range Rings around Mortar
    if (showRings && mortar.x > 0 && mortar.y > 0) {
      const mortarLatLng = L.latLng(mortar.y, mortar.x);

      // Deadzone Min Range circle (Red)
      L.circle(mortarLatLng, {
        radius: minRange,
        color: '#ef4444',
        weight: 1.5,
        dashArray: '4, 4',
        fillColor: '#ef4444',
        fillOpacity: 0.08
      }).addTo(trajectoryGroup);

      // Max Range Envelope circle (Emerald)
      L.circle(mortarLatLng, {
        radius: maxRange,
        color: '#10b981',
        weight: 2,
        dashArray: '6, 4',
        fillColor: '#10b981',
        fillOpacity: 0.04
      }).addTo(trajectoryGroup);
    }

    // Trajectory Line from Battery to Target
    if (mortar.x > 0 && mortar.y > 0 && target.x > 0 && target.y > 0) {
      const p1 = L.latLng(mortar.y, mortar.x);
      const p2 = L.latLng(target.y, target.x);

      const color = solution?.inRange ? '#f59e0b' : '#ef4444';

      L.polyline([p1, p2], {
        color: color,
        weight: 3,
        dashArray: '6, 6',
        opacity: 0.95
      }).addTo(trajectoryGroup);

      // Mid-point marker with bearing & distance
      if (solution) {
        const midLat = (mortar.y + target.y) / 2;
        const midLng = (mortar.x + target.x) / 2;
        const tagText = `${solution.distance.toFixed(0)}m · ${solution.azimuthDeg.toFixed(1)}° (${solution.azimuthMilNato.toFixed(0)}mils)`;

        const badgeIcon = L.divIcon({
          className: '',
          html: `
            <div class="px-2 py-0.5 rounded bg-zinc-950/90 border border-amber-500/70 text-amber-300 font-mono text-[10px] font-bold whitespace-nowrap -translate-x-1/2 -translate-y-1/2 shadow-lg">
              ${tagText}
            </div>
          `,
          iconSize: [0, 0]
        });

        L.marker([midLat, midLng], { icon: badgeIcon, interactive: false }).addTo(trajectoryGroup);
      }

      // Dispersion ring at target
      if (solution?.dispersionRadius) {
        L.circle(p2, {
          radius: solution.dispersionRadius,
          color: '#60a5fa',
          weight: 1.5,
          dashArray: '2, 2',
          fillColor: '#3b82f6',
          fillOpacity: 0.15
        }).addTo(trajectoryGroup);
      }
    }
  }, [mortar.x, mortar.y, target.x, target.y, minRange, maxRange, showRings, solution]);

  // 6. Tactical Military Grid Overlay (1000m & 100m)
  useEffect(() => {
    const gridGroup = gridLayerGroupRef.current;
    if (!gridGroup) return;
    gridGroup.clearLayers();

    if (!showGrid) return;

    const size = mapData.size;
    const step1000 = 1000;
    const step100 = 100;

    // Minor 100m lines when zoomed in
    if (currentZoom >= 2) {
      for (let m = 0; m <= size; m += step100) {
        if (m % 1000 === 0) continue;
        L.polyline([[0, m], [size, m]], { color: 'rgba(255, 255, 255, 0.08)', weight: 0.5, interactive: false }).addTo(gridGroup);
        L.polyline([[m, 0], [m, size]], { color: 'rgba(255, 255, 255, 0.08)', weight: 0.5, interactive: false }).addTo(gridGroup);
      }
    }

    // Major 1000m (1km) grid lines
    for (let m = 0; m <= size; m += step1000) {
      L.polyline([[0, m], [size, m]], { color: 'rgba(255, 255, 255, 0.22)', weight: 1.2, interactive: false }).addTo(gridGroup);
      L.polyline([[m, 0], [m, size]], { color: 'rgba(255, 255, 255, 0.22)', weight: 1.2, interactive: false }).addTo(gridGroup);

      // Grid index numbers (00, 01, 02 ... 12)
      const indexStr = String(Math.floor(m / 1000)).padStart(2, '0');
      const labelBottom = L.divIcon({
        className: '',
        html: `<div class="text-[9px] font-mono text-zinc-300 font-bold -translate-x-1/2 -translate-y-1/2 bg-black/60 px-0.5 rounded">${indexStr}</div>`,
        iconSize: [0, 0]
      });
      L.marker([60, m + 50], { icon: labelBottom, interactive: false }).addTo(gridGroup);
      L.marker([m + 50, 60], { icon: labelBottom, interactive: false }).addTo(gridGroup);
    }
  }, [mapData.size, showGrid, currentZoom]);

  // 7. Verified Landmarks & Labels
  useEffect(() => {
    const lmGroup = landmarksLayerGroupRef.current;
    if (!lmGroup) return;
    lmGroup.clearLayers();

    if (!showLabels) return;

    mapData.landmarks.forEach(lm => {
      const latLng = L.latLng(lm.y, lm.x);
      const labelText = lang === 'ar' && lm.nameAr ? lm.nameAr : lm.name;

      const markerColor = lm.type === 'military' ? '#f87171' : lm.type === 'industrial' ? '#fbbf24' : '#6ee7b7';

      const lmIcon = L.divIcon({
        className: '',
        html: `
          <div class="flex items-center gap-1.5 -translate-x-2 -translate-y-2 select-none pointer-events-auto">
            <div class="w-3.5 h-3.5 rounded-full border border-black shadow" style="background-color: ${markerColor}"></div>
            <div class="px-1.5 py-0.5 rounded bg-black/75 border border-zinc-700/60 text-zinc-100 font-sans text-[11px] font-semibold whitespace-nowrap shadow-md">
              ${labelText} <span class="text-[9px] font-mono text-zinc-400">(${lm.alt}m)</span>
            </div>
          </div>
        `,
        iconSize: [0, 0]
      });

      const m = L.marker(latLng, { icon: lmIcon }).addTo(lmGroup);
      m.on('click', () => {
        if (interactionMode === 'mortar') {
          onSetMortar({ x: lm.x, y: lm.y, alt: lm.alt, name: lm.name });
        } else {
          onSetTarget({ x: lm.x, y: lm.y, alt: lm.alt, name: lm.name });
        }
      });
    });
  }, [mapData.landmarks, showLabels, lang, interactionMode, onSetMortar, onSetTarget]);

  // 8. Saved Tactical Drawings (TASK 4)
  useEffect(() => {
    const drawGroup = drawingsLayerGroupRef.current;
    if (!drawGroup) return;
    drawGroup.clearLayers();

    drawings.forEach(d => {
      if (d.mapId !== mapData.id) return;

      if (d.type === 'line' && d.points.length >= 2) {
        const latLngs = d.points.map(p => L.latLng(p[1], p[0]));
        L.polyline(latLngs, { color: d.color, weight: 2.5 }).addTo(drawGroup);
      } else if (d.type === 'circle' && d.points.length >= 1 && d.radius) {
        const center = L.latLng(d.points[0][1], d.points[0][0]);
        L.circle(center, {
          radius: d.radius,
          color: d.color,
          weight: 1.5,
          dashArray: '4, 4',
          fillColor: d.color,
          fillOpacity: 0.12
        }).addTo(drawGroup);
      } else if (d.type === 'point' && d.points.length >= 1) {
        const pt = L.latLng(d.points[0][1], d.points[0][0]);
        const pointIcon = L.divIcon({
          className: '',
          html: `
            <div class="flex items-center gap-1 -translate-x-1.5 -translate-y-1.5">
              <div class="w-3 h-3 rounded-full border border-white" style="background-color: ${d.color}"></div>
              ${d.label ? `<div class="px-1 bg-black/80 text-[10px] text-zinc-200 rounded font-mono">${d.label}</div>` : ''}
            </div>
          `,
          iconSize: [0, 0]
        });
        L.marker(pt, { icon: pointIcon, interactive: false }).addTo(drawGroup);
      }
    });
  }, [drawings, mapData.id]);

  // 9. Measurement Ruler Tool
  useEffect(() => {
    const rulerGroup = rulerLayerGroupRef.current;
    if (!rulerGroup) return;
    rulerGroup.clearLayers();

    if (measurePointA && measurePointB) {
      const p1 = L.latLng(measurePointA.y, measurePointA.x);
      const p2 = L.latLng(measurePointB.y, measurePointB.x);
      const dist = Math.hypot(measurePointB.x - measurePointA.x, measurePointB.y - measurePointA.y);
      const angle = (Math.atan2(measurePointB.x - measurePointA.x, measurePointB.y - measurePointA.y) * 180 / Math.PI + 360) % 360;

      L.polyline([p1, p2], { color: '#38bdf8', weight: 2, dashArray: '4, 4' }).addTo(rulerGroup);

      const midLat = (measurePointA.y + measurePointB.y) / 2;
      const midLng = (measurePointA.x + measurePointB.x) / 2;

      const badge = L.divIcon({
        className: '',
        html: `
          <div class="px-2 py-0.5 rounded bg-sky-950/90 border border-sky-400 text-sky-200 font-mono text-[10px] font-bold whitespace-nowrap -translate-x-1/2 -translate-y-1/2 shadow-lg">
            ${dist.toFixed(0)}m · ${angle.toFixed(1)}°
          </div>
        `,
        iconSize: [0, 0]
      });

      L.marker([midLat, midLng], { icon: badge, interactive: false }).addTo(rulerGroup);
    }
  }, [measurePointA, measurePointB]);

  // Centering helpers
  const handleCenterMortar = () => {
    const map = leafletMapRef.current;
    if (!map || mortar.x <= 0) return;
    map.setView(L.latLng(mortar.y, mortar.x), Math.max(2, map.getZoom()));
  };

  const handleCenterTarget = () => {
    const map = leafletMapRef.current;
    if (!map || target.x <= 0) return;
    map.setView(L.latLng(target.y, target.x), Math.max(2, map.getZoom()));
  };

  const handleFitExtents = () => {
    const map = leafletMapRef.current;
    if (!map) return;
    const bounds = L.latLngBounds(L.latLng(0, 0), L.latLng(mapData.size, mapData.size));
    map.fitBounds(bounds);
  };

  return (
    <div className="relative w-full h-[65vh] min-h-[420px] lg:h-[630px] bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800 shadow-2xl flex flex-col">
      {/* Top Map Toolbar */}
      <div className="absolute top-2 left-2 right-2 z-500 flex flex-wrap items-center justify-between gap-1.5 pointer-events-none">
        {/* Interaction Mode Buttons */}
        <div className="flex items-center gap-1 bg-zinc-900/95 border border-zinc-700/80 p-1 rounded-lg shadow-xl pointer-events-auto backdrop-blur-md">
          <button
            onClick={() => onSelectInteractionMode('mortar')}
            className={`min-h-[38px] px-2.5 py-1 text-xs font-semibold rounded flex items-center gap-1.5 transition-colors cursor-pointer ${
              interactionMode === 'mortar'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
            {t.clickToSetMortar}
          </button>
          <button
            onClick={() => onSelectInteractionMode('target')}
            className={`min-h-[38px] px-2.5 py-1 text-xs font-semibold rounded flex items-center gap-1.5 transition-colors cursor-pointer ${
              interactionMode === 'target'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span>
            {t.clickToSetTarget}
          </button>
          <button
            onClick={() => {
              if (interactionMode === 'measure') {
                onSelectInteractionMode('view');
                setMeasurePointA(null);
                setMeasurePointB(null);
              } else {
                onSelectInteractionMode('measure');
              }
            }}
            className={`min-h-[38px] px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
              interactionMode === 'measure'
                ? 'bg-sky-600 text-white'
                : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
            }`}
          >
            📏 {t.measureMode}
          </button>
        </div>

        {/* Tactical Drawing Tools */}
        <div className="flex items-center gap-1 bg-zinc-900/95 border border-zinc-700/80 p-1 rounded-lg shadow-xl pointer-events-auto backdrop-blur-md text-xs">
          <button
            onClick={() => onSelectInteractionMode(interactionMode === 'draw_line' ? 'view' : 'draw_line')}
            className={`min-h-[38px] px-2 py-1 rounded transition-colors cursor-pointer ${
              interactionMode === 'draw_line' ? 'bg-amber-600 text-white font-semibold' : 'text-zinc-300 hover:bg-zinc-800'
            }`}
            title={t.drawLine}
          >
            ✏️ {lang === 'ar' ? 'خط' : 'Line'}
          </button>
          <button
            onClick={() => onSelectInteractionMode(interactionMode === 'draw_circle' ? 'view' : 'draw_circle')}
            className={`min-h-[38px] px-2 py-1 rounded transition-colors cursor-pointer ${
              interactionMode === 'draw_circle' ? 'bg-amber-600 text-white font-semibold' : 'text-zinc-300 hover:bg-zinc-800'
            }`}
            title={t.drawCircle}
          >
            ⭕ {lang === 'ar' ? 'دائرة' : 'Circle'}
          </button>
          <button
            onClick={() => onSelectInteractionMode(interactionMode === 'draw_point' ? 'view' : 'draw_point')}
            className={`min-h-[38px] px-2 py-1 rounded transition-colors cursor-pointer ${
              interactionMode === 'draw_point' ? 'bg-amber-600 text-white font-semibold' : 'text-zinc-300 hover:bg-zinc-800'
            }`}
            title={t.drawPoint}
          >
            📍 {lang === 'ar' ? 'نقطة' : 'Point'}
          </button>

          {/* Color choices */}
          <div className="flex items-center gap-1 px-1">
            {['#ef4444', '#3b82f6', '#10b981', '#f59e0b'].map(c => (
              <button
                key={c}
                onClick={() => setDrawingColor(c)}
                style={{ backgroundColor: c }}
                className={`w-4 h-4 rounded-full border ${drawingColor === c ? 'border-white scale-125' : 'border-zinc-700'} cursor-pointer`}
              />
            ))}
          </div>

          {drawings.length > 0 && (
            <button
              onClick={onClearDrawings}
              className="px-1.5 py-1 text-xs text-zinc-400 hover:text-red-400 cursor-pointer"
              title={t.clearDrawings}
            >
              🗑️
            </button>
          )}
        </div>

        {/* View Controls & Diagnostics (TASK 6) */}
        <div className="flex items-center gap-1 bg-zinc-900/95 border border-zinc-700/80 p-1 rounded-lg shadow-xl pointer-events-auto backdrop-blur-md text-xs">
          <button
            onClick={() => setShowGrid(s => !s)}
            className={`min-h-[38px] px-2 py-1 rounded transition-colors cursor-pointer ${showGrid ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}
          >
            {t.toggleGrid}
          </button>
          <button
            onClick={() => setShowLabels(s => !s)}
            className={`min-h-[38px] px-2 py-1 rounded transition-colors cursor-pointer ${showLabels ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}
          >
            {t.toggleLabels}
          </button>
          <button
            onClick={() => setShowRings(s => !s)}
            className={`min-h-[38px] px-2 py-1 rounded transition-colors cursor-pointer ${showRings ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}
          >
            {t.toggleRings}
          </button>
          <span className="text-zinc-700">|</span>
          <button
            onClick={handleCenterMortar}
            className="min-h-[38px] px-2 py-1 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded cursor-pointer"
            title={t.centerMortar}
          >
            🎯
          </button>
          <button
            onClick={handleCenterTarget}
            className="min-h-[38px] px-2 py-1 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded cursor-pointer"
            title={t.centerTarget}
          >
            📍
          </button>
          <button
            onClick={handleFitExtents}
            className="min-h-[38px] px-2 py-1 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded cursor-pointer font-bold"
            title={t.fitMap}
          >
            ⛶
          </button>
          <button
            onClick={() => setShowDiagnostics(s => !s)}
            className={`min-h-[38px] px-2 py-1 rounded transition-colors cursor-pointer ${
              tileLoadingStatus === 'error' ? 'bg-red-900 text-red-200' : showDiagnostics ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title={t.toggleDiagnostics}
          >
            ℹ️
          </button>
        </div>
      </div>

      {/* Leaflet Map DOM Container */}
      <div
        ref={mapContainerRef}
        className="w-full h-full bg-zinc-950 select-none z-0"
        style={{ touchAction: 'none' }}
      />

      {/* Loading Overlay Badge */}
      {tileLoadingStatus === 'loading' && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-500 bg-zinc-900/95 border border-emerald-500/60 text-emerald-300 px-4 py-2 rounded-lg text-xs flex items-center gap-2 shadow-2xl backdrop-blur-md">
          <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <span>{t.mapStatusLoading}</span>
        </div>
      )}

      {/* Error Banner with Retry and Official Link */}
      {tileLoadingStatus === 'error' && (
        <div className="absolute top-14 left-4 right-4 z-500 bg-red-950/95 border border-red-500 text-red-200 p-3 rounded-lg shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <div>
              <div className="font-bold">{t.mapStatusError}</div>
              <div className="text-[11px] text-red-300 mt-0.5">{lastErrorMessage || 'Tile server network issue.'}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={mapData.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[36px] px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-medium rounded transition-colors text-xs flex items-center gap-1"
            >
              <span>{t.openOfficialMap}</span>
              <span>↗</span>
            </a>
          </div>
        </div>
      )}

      {/* Zoom Controls (Bottom Right) */}
      <div className="absolute bottom-10 right-3 z-500 flex flex-col gap-1 bg-zinc-900/95 border border-zinc-700/80 rounded-lg shadow-xl p-1 backdrop-blur-md">
        <button
          onClick={() => leafletMapRef.current?.zoomIn()}
          className="w-9 h-9 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-100 flex items-center justify-center font-bold text-lg cursor-pointer"
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={() => leafletMapRef.current?.zoomOut()}
          className="w-9 h-9 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-100 flex items-center justify-center font-bold text-lg cursor-pointer"
          title="Zoom Out"
        >
          -
        </button>
      </div>

      {/* Coordinate Status Bar (Bottom Left) */}
      <div className="absolute bottom-2 left-2 z-500 bg-zinc-950/90 border border-zinc-800 px-3 py-1 rounded-md text-[11px] font-mono text-zinc-300 shadow-md flex items-center gap-3 backdrop-blur-md">
        {cursorPos ? (
          <>
            <span>{t.cursorCoords} <strong className="text-emerald-400">{meterToGrid4(cursorPos.x)}-{meterToGrid4(cursorPos.y)}</strong></span>
            <span className="text-zinc-600">|</span>
            <span>X: {cursorPos.x.toFixed(0)}m, Y: {cursorPos.y.toFixed(0)}m</span>
            <span className="text-zinc-600">|</span>
            <span>Alt: ~{getGroundElevation(cursorPos.x, cursorPos.y)}m</span>
          </>
        ) : (
          <span>{mapData.name} ({mapData.size}m × {mapData.size}m)</span>
        )}
      </div>

      {/* Map Diagnostics Panel (TASK 6) */}
      {showDiagnostics && (
        <div className="absolute inset-x-2 bottom-12 z-600 bg-zinc-900/95 border border-zinc-700 rounded-lg p-3 text-xs text-zinc-200 shadow-2xl backdrop-blur-md max-h-64 overflow-y-auto">
          <div className="flex items-center justify-between mb-2 border-b border-zinc-800 pb-1.5">
            <div className="font-bold uppercase tracking-wide text-zinc-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              {t.mapDiagnosticsTitle}
            </div>
            <button
              onClick={() => setShowDiagnostics(false)}
              className="text-zinc-400 hover:text-white text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
            <div>
              <span className="text-zinc-400">Map ID:</span> <strong className="text-zinc-100">{mapData.id} ({mapData.name})</strong>
            </div>
            <div>
              <span className="text-zinc-400">Terrain Dimensions:</span> <strong className="text-zinc-100">{mapData.size}m × {mapData.size}m</strong>
            </div>
            <div>
              <span className="text-zinc-400">{t.mapTilesLoaded}</span>{' '}
              <strong className={tileLoadingStatus === 'loaded' ? 'text-emerald-400' : tileLoadingStatus === 'loading' ? 'text-amber-400' : 'text-red-400'}>
                {tileLoadingStatus === 'loaded' ? t.mapStatusLoaded : tileLoadingStatus === 'loading' ? t.mapStatusLoading : t.mapStatusError}
              </strong>
            </div>
            <div>
              <span className="text-zinc-400">Leaflet Zoom Level:</span> <strong className="text-zinc-100">LOD {mapData.maxZoomLOD - currentZoom} (Leaflet {currentZoom})</strong>
            </div>
            <div>
              <span className="text-zinc-400">Loaded Tiles:</span> <strong className="text-emerald-400">{tilesLoadedCount}</strong>
            </div>
            <div>
              <span className="text-zinc-400">Tile Errors:</span> <strong className={tilesErrorCount > 0 ? 'text-red-400' : 'text-zinc-400'}>{tilesErrorCount}</strong>
            </div>
            <div className="col-span-full">
              <span className="text-zinc-400">Tile Pattern:</span>{' '}
              <span className="text-zinc-300 break-all">{mapData.tileTemplateUrl}</span>
            </div>
            <div className="col-span-full">
              <span className="text-zinc-400">{t.sourceLicense}</span>{' '}
              <span className="text-zinc-300">{mapData.sourceCredit}</span>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-zinc-800 flex justify-end">
            <a
              href={mapData.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[36px] px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium text-xs flex items-center gap-1.5 transition-colors"
            >
              <span>{t.openOfficialMap}</span>
              <span>↗</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
