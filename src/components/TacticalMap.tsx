import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Coordinates,
  CalculationResult,
  Language,
  InteractionMode,
  Landmark,
  TacticalDrawing,
  MapDiagnosticInfo
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Viewport transformation: pan and zoom
  const [zoom, setZoom] = useState<number>(0.05); // scale (pixels per meter)
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragTarget, setDragTarget] = useState<'mortar' | 'target' | 'viewport' | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  // Map Imagery Loading State (TASK 1 & TASK 2)
  const [mapImage, setMapImage] = useState<HTMLImageElement | null>(null);
  const [imageLoadingStatus, setImageLoadingStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('loading');
  const [imageErrorMessage, setImageErrorMessage] = useState<string | null>(null);
  const [retryCounter, setRetryCounter] = useState(0);

  // Diagnostics modal/drawer toggle (TASK 6)
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // Ruler measurement tool state
  const [measureStart, setMeasureStart] = useState<{ x: number; y: number } | null>(null);
  const [measureEnd, setMeasureEnd] = useState<{ x: number; y: number } | null>(null);

  // Active in-progress drawing
  const [drawingStart, setDrawingStart] = useState<{ x: number; y: number } | null>(null);
  const [drawingCurrent, setDrawingCurrent] = useState<{ x: number; y: number } | null>(null);
  const [drawingColor, setDrawingColor] = useState<string>('#ef4444');

  // Display toggles
  const [showGrid, setShowGrid] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showRings, setShowRings] = useState(true);

  // Touch tracking for mobile (TASK 5)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchPinchDistRef = useRef<number | null>(null);

  // Load Real Authentic Map Image (TASK 1 & 2)
  useEffect(() => {
    let isCancelled = false;
    setImageLoadingStatus('loading');
    setImageErrorMessage(null);

    const img = new Image();
    // Do not set crossOrigin to avoid CORS tainted canvas when drawing plain images
    img.src = mapData.overviewUrl;

    img.onload = () => {
      if (isCancelled) return;
      setMapImage(img);
      setImageLoadingStatus('loaded');
      setImageErrorMessage(null);
    };

    img.onerror = () => {
      if (isCancelled) return;
      setMapImage(null);
      setImageLoadingStatus('error');
      setImageErrorMessage(`Could not load map image from ${mapData.overviewUrl}. External server may be unreachable.`);
    };

    return () => {
      isCancelled = true;
    };
  }, [mapData.overviewUrl, retryCounter]);

  // Fit map on initial load or map change
  const fitMap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const scale = Math.min(width, height) / (mapData.size * 1.05);
    setZoom(scale);
    // Center the map in canvas
    const centerX = width / 2;
    const centerY = height / 2;
    setPan({
      x: centerX - (mapData.size / 2) * scale,
      y: centerY - (mapData.size / 2) * scale
    });
  }, [mapData.size]);

  useEffect(() => {
    fitMap();
  }, [fitMap]);

  // Coordinate Conversion: Screen to Map coordinates
  const screenToMap = useCallback((screenX: number, screenY: number) => {
    const mapX = (screenX - pan.x) / zoom;
    const mapY = mapData.size - ((screenY - pan.y) / zoom);
    return {
      x: Math.max(0, Math.min(mapData.size, mapX)),
      y: Math.max(0, Math.min(mapData.size, mapY))
    };
  }, [pan, zoom, mapData.size]);

  // Map to Screen coordinates
  const mapToScreen = useCallback((mapX: number, mapY: number) => {
    const screenX = pan.x + mapX * zoom;
    const screenY = pan.y + (mapData.size - mapY) * zoom;
    return { x: screenX, y: screenY };
  }, [pan, zoom, mapData.size]);

  // Nearest landmark elevation
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

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High DPI scaling
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // 1. Clear background
    ctx.fillStyle = '#090d13';
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    // 2. Real Map Image Rendering (TASK 1 & TASK 2)
    // Map bounding box in screen coordinates
    const tl = mapToScreen(0, mapData.size);
    const br = mapToScreen(mapData.size, 0);
    const mapRenderWidth = br.x - tl.x;
    const mapRenderHeight = br.y - tl.y;

    if (imageLoadingStatus === 'loaded' && mapImage) {
      try {
        // Draw real authentic terrain image aligned to coordinate space
        ctx.drawImage(mapImage, tl.x, tl.y, mapRenderWidth, mapRenderHeight);
      } catch {
        // In case of render exception
      }
    } else {
      // While loading or if error, render a clear muted backdrop with loading message
      ctx.fillStyle = '#121921';
      ctx.fillRect(tl.x, tl.y, mapRenderWidth, mapRenderHeight);
      ctx.strokeStyle = '#273544';
      ctx.strokeRect(tl.x, tl.y, mapRenderWidth, mapRenderHeight);
    }

    // Map border outline
    ctx.strokeStyle = 'rgba(74, 222, 128, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(tl.x, tl.y, mapRenderWidth, mapRenderHeight);

    // 3. Tactical Military Grid (1000m Major Grid + 100m Minor Grid)
    if (showGrid) {
      const step1000 = 1000;
      const step100 = 100;

      // Minor 100m lines when zoomed in
      if (zoom >= 0.08) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        for (let m = 0; m <= mapData.size; m += step100) {
          if (m % 1000 === 0) continue;
          const p1 = mapToScreen(m, 0);
          const p2 = mapToScreen(m, mapData.size);
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);

          const q1 = mapToScreen(0, m);
          const q2 = mapToScreen(mapData.size, m);
          ctx.moveTo(q1.x, q1.y);
          ctx.lineTo(q2.x, q2.y);
        }
        ctx.stroke();
      }

      // Major 1000m (1km) grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let m = 0; m <= mapData.size; m += step1000) {
        const p1 = mapToScreen(m, 0);
        const p2 = mapToScreen(m, mapData.size);
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);

        const q1 = mapToScreen(0, m);
        const q2 = mapToScreen(mapData.size, m);
        ctx.moveTo(q1.x, q1.y);
        ctx.lineTo(q2.x, q2.y);
      }
      ctx.stroke();

      // Grid index labels (e.g. "04", "05", "11")
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      for (let m = 0; m <= mapData.size; m += step1000) {
        const gridIndex = String(Math.floor(m / 1000)).padStart(2, '0');
        const posBottom = mapToScreen(m + 40, 50);
        const posLeft = mapToScreen(50, m + 40);

        if (posBottom.x >= 0 && posBottom.x <= displayWidth && posBottom.y >= 0 && posBottom.y <= displayHeight) {
          ctx.fillText(gridIndex, posBottom.x, posBottom.y);
        }
        if (posLeft.x >= 0 && posLeft.x <= displayWidth && posLeft.y >= 0 && posLeft.y <= displayHeight) {
          ctx.fillText(gridIndex, posLeft.x, posLeft.y);
        }
      }
    }

    // 4. Saved Tactical Drawings (TASK 4)
    if (drawings && drawings.length > 0) {
      drawings.forEach(d => {
        if (d.mapId !== mapData.id) return;
        ctx.save();
        ctx.strokeStyle = d.color;
        ctx.fillStyle = d.color;
        ctx.lineWidth = 2;

        if (d.type === 'line' && d.points.length >= 2) {
          ctx.beginPath();
          const p0 = mapToScreen(d.points[0][0], d.points[0][1]);
          ctx.moveTo(p0.x, p0.y);
          for (let i = 1; i < d.points.length; i++) {
            const pt = mapToScreen(d.points[i][0], d.points[i][1]);
            ctx.lineTo(pt.x, pt.y);
          }
          ctx.stroke();

          // Arrowhead
          if (d.points.length === 2) {
            const p1 = mapToScreen(d.points[1][0], d.points[1][1]);
            const angle = Math.atan2(p1.y - p0.y, p1.x - p0.x);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p1.x - 10 * Math.cos(angle - Math.PI / 6), p1.y - 10 * Math.sin(angle - Math.PI / 6));
            ctx.lineTo(p1.x - 10 * Math.cos(angle + Math.PI / 6), p1.y - 10 * Math.sin(angle + Math.PI / 6));
            ctx.closePath();
            ctx.fill();
          }
        } else if (d.type === 'circle' && d.points.length >= 1 && d.radius) {
          const center = mapToScreen(d.points[0][0], d.points[0][1]);
          const rPx = d.radius * zoom;
          ctx.beginPath();
          ctx.arc(center.x, center.y, rPx, 0, Math.PI * 2);
          ctx.fillStyle = `${d.color}15`;
          ctx.fill();
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        } else if (d.type === 'point' && d.points.length >= 1) {
          const pt = mapToScreen(d.points[0][0], d.points[0][1]);
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          if (d.label) {
            ctx.font = '10px "JetBrains Mono", monospace';
            ctx.fillText(d.label, pt.x + 8, pt.y + 4);
          }
        }
        ctx.restore();
      });
    }

    // 5. In-Progress Tactical Drawing
    if (drawingStart && drawingCurrent) {
      const p1 = mapToScreen(drawingStart.x, drawingStart.y);
      const p2 = mapToScreen(drawingCurrent.x, drawingCurrent.y);
      ctx.save();
      ctx.strokeStyle = drawingColor;
      ctx.fillStyle = drawingColor;
      ctx.lineWidth = 2;

      if (interactionMode === 'draw_line') {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.setLineDash([5, 3]);
        ctx.stroke();
      } else if (interactionMode === 'draw_circle') {
        const radiusMeters = Math.hypot(drawingCurrent.x - drawingStart.x, drawingCurrent.y - drawingStart.y);
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, radiusMeters * zoom, 0, Math.PI * 2);
        ctx.setLineDash([5, 3]);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 6. Range Rings around Mortar Battery
    if (showRings && mortar.x > 0 && mortar.y > 0) {
      const mScr = mapToScreen(mortar.x, mortar.y);
      const minRadiusPx = minRange * zoom;
      const maxRadiusPx = maxRange * zoom;

      // Minimum deadzone ring
      ctx.beginPath();
      ctx.arc(mScr.x, mScr.y, minRadiusPx, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 3]);
      ctx.stroke();

      // Maximum range envelope
      ctx.beginPath();
      ctx.arc(mScr.x, mScr.y, maxRadiusPx, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(16, 185, 129, 0.03)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      if (maxRadiusPx > 40) {
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(52, 211, 153, 0.9)';
        ctx.fillText(`MAX: ${maxRange}m`, mScr.x + 8, mScr.y - maxRadiusPx + 12);
        ctx.fillStyle = 'rgba(248, 113, 113, 0.9)';
        ctx.fillText(`MIN: ${minRange}m`, mScr.x + 8, mScr.y - minRadiusPx + 12);
      }
    }

    // 7. Fire Mission Trajectory Line
    if (mortar.x > 0 && mortar.y > 0 && target.x > 0 && target.y > 0) {
      const mScr = mapToScreen(mortar.x, mortar.y);
      const tScr = mapToScreen(target.x, target.y);

      ctx.beginPath();
      ctx.moveTo(mScr.x, mScr.y);
      ctx.lineTo(tScr.x, tScr.y);
      ctx.strokeStyle = solution?.inRange ? '#f59e0b' : '#ef4444';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 5]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Mid-point distance & bearing label tag
      if (solution) {
        const midX = (mScr.x + tScr.x) / 2;
        const midY = (mScr.y + tScr.y) / 2;
        const azText = `${solution.azimuthDeg.toFixed(1)}° (${solution.azimuthMilNato.toFixed(0)}mils)`;
        const distText = `${solution.distance.toFixed(0)}m`;

        ctx.font = '10px "JetBrains Mono", monospace';
        const tagText = `${distText} · ${azText}`;
        const tagWidth = ctx.measureText(tagText).width + 14;

        ctx.fillStyle = 'rgba(18, 18, 20, 0.9)';
        ctx.strokeStyle = solution.inRange ? '#d97706' : '#dc2626';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(midX - tagWidth / 2, midY - 18, tagWidth, 20, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = solution.inRange ? '#fef08a' : '#fca5a5';
        ctx.textAlign = 'center';
        ctx.fillText(tagText, midX, midY - 5);
        ctx.textAlign = 'start';
      }
    }

    // 8. Ruler Measure Tool
    if (measureStart && measureEnd) {
      const m1 = mapToScreen(measureStart.x, measureStart.y);
      const m2 = mapToScreen(measureEnd.x, measureEnd.y);
      const dist = Math.hypot(measureEnd.x - measureStart.x, measureEnd.y - measureStart.y);
      const angle = (Math.atan2(measureEnd.x - measureStart.x, measureEnd.y - measureStart.y) * 180 / Math.PI + 360) % 360;

      ctx.beginPath();
      ctx.moveTo(m1.x, m1.y);
      ctx.lineTo(m2.x, m2.y);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(m1.x, m1.y, 4, 0, Math.PI * 2);
      ctx.arc(m2.x, m2.y, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillStyle = '#bae6fd';
      ctx.fillText(`${dist.toFixed(0)}m / ${angle.toFixed(1)}°`, (m1.x + m2.x) / 2 + 5, (m1.y + m2.y) / 2 - 5);
    }

    // 9. Verified Landmarks and Locations (TASK 3)
    if (showLabels && mapData.landmarks) {
      const labelMinZoom = 0.035;
      for (const lm of mapData.landmarks) {
        const pt = mapToScreen(lm.x, lm.y);
        if (pt.x < -40 || pt.x > displayWidth + 40 || pt.y < -40 || pt.y > displayHeight + 40) continue;

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, lm.type === 'military' ? 4 : 3, 0, Math.PI * 2);
        ctx.fillStyle = lm.type === 'military' ? '#f87171' : lm.type === 'industrial' ? '#fbbf24' : '#6ee7b7';
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.stroke();

        if (zoom >= labelMinZoom) {
          const labelText = lang === 'ar' && lm.nameAr ? lm.nameAr : lm.name;
          ctx.font = '10px "Tajawal", "Plus Jakarta Sans", sans-serif';

          ctx.strokeStyle = '#09090b';
          ctx.lineWidth = 3;
          ctx.strokeText(labelText, pt.x + 6, pt.y + 3);

          ctx.fillStyle = '#f4f4f5';
          ctx.fillText(labelText, pt.x + 6, pt.y + 3);

          if (zoom >= 0.07) {
            ctx.font = '8px "JetBrains Mono", monospace';
            ctx.fillStyle = '#a1a1aa';
            ctx.fillText(`${lm.alt}m`, pt.x + 6, pt.y + 13);
          }
        }
      }
    }

    // 10. Battery Marker (🔴)
    if (mortar.x > 0 && mortar.y > 0) {
      const mScr = mapToScreen(mortar.x, mortar.y);
      ctx.beginPath();
      ctx.arc(mScr.x, mScr.y, 14, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(mScr.x, mScr.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#ef4444';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.strokeStyle = '#09090b';
      ctx.lineWidth = 3;
      ctx.strokeText(`🔴 ${t.mortarBattery}`, mScr.x + 10, mScr.y - 8);
      ctx.fillStyle = '#fca5a5';
      ctx.fillText(`🔴 ${t.mortarBattery}`, mScr.x + 10, mScr.y - 8);
    }

    // 11. Target Marker (🔵)
    if (target.x > 0 && target.y > 0) {
      const tScr = mapToScreen(target.x, target.y);

      if (solution?.dispersionRadius) {
        const dispPx = solution.dispersionRadius * zoom;
        ctx.beginPath();
        ctx.arc(tScr.x, tScr.y, Math.max(8, dispPx), 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(96, 165, 250, 0.6)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.beginPath();
      ctx.arc(tScr.x, tScr.y, 14, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(59, 130, 246, 0.25)';
      ctx.fill();

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(tScr.x - 12, tScr.y);
      ctx.lineTo(tScr.x + 12, tScr.y);
      ctx.moveTo(tScr.x, tScr.y - 12);
      ctx.lineTo(tScr.x + 12, tScr.y + 12);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(tScr.x, tScr.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#2563eb';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.strokeStyle = '#09090b';
      ctx.lineWidth = 3;
      ctx.strokeText(`🔵 ${t.impactTarget}`, tScr.x + 10, tScr.y - 8);
      ctx.fillStyle = '#93c5fd';
      ctx.fillText(`🔵 ${t.impactTarget}`, tScr.x + 10, tScr.y - 8);
    }

    ctx.restore();
  }, [
    mapData,
    mortar,
    target,
    solution,
    zoom,
    pan,
    showGrid,
    showLabels,
    showRings,
    measureStart,
    measureEnd,
    drawings,
    drawingStart,
    drawingCurrent,
    drawingColor,
    interactionMode,
    mapImage,
    imageLoadingStatus,
    mapToScreen,
    minRange,
    maxRange,
    lang,
    t
  ]);

  // Mouse Handlers (Desktop)
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const mapCoords = screenToMap(screenX, screenY);

    if (e.button === 0) {
      // Check marker dragging first
      if (mortar.x > 0 && Math.hypot(screenX - mapToScreen(mortar.x, mortar.y).x, screenY - mapToScreen(mortar.x, mortar.y).y) < 22) {
        setDragTarget('mortar');
        setIsDragging(true);
        setDragStart({ x: screenX, y: screenY });
        return;
      }

      if (target.x > 0 && Math.hypot(screenX - mapToScreen(target.x, target.y).x, screenY - mapToScreen(target.x, target.y).y) < 22) {
        setDragTarget('target');
        setIsDragging(true);
        setDragStart({ x: screenX, y: screenY });
        return;
      }

      if (interactionMode === 'measure') {
        setMeasureStart(mapCoords);
        setMeasureEnd(mapCoords);
        return;
      }

      if (interactionMode === 'draw_line' || interactionMode === 'draw_circle') {
        setDrawingStart(mapCoords);
        setDrawingCurrent(mapCoords);
        return;
      }

      if (interactionMode === 'draw_point') {
        onAddDrawing({
          id: Math.random().toString(36).substring(2, 9),
          mapId: mapData.id,
          type: 'point',
          color: drawingColor,
          points: [[mapCoords.x, mapCoords.y]],
          label: `${meterToGrid4(mapCoords.x)}-${meterToGrid4(mapCoords.y)}`,
          timestamp: Date.now()
        });
        return;
      }

      if (interactionMode === 'mortar') {
        const alt = getGroundElevation(mapCoords.x, mapCoords.y);
        onSetMortar({ x: mapCoords.x, y: mapCoords.y, alt });
        return;
      }

      if (interactionMode === 'target') {
        const alt = getGroundElevation(mapCoords.x, mapCoords.y);
        onSetTarget({ x: mapCoords.x, y: mapCoords.y, alt });
        return;
      }

      // Default viewport drag
      setIsDragging(true);
      setDragTarget('viewport');
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    } else if (e.button === 2) {
      e.preventDefault();
      const alt = getGroundElevation(mapCoords.x, mapCoords.y);
      onSetTarget({ x: mapCoords.x, y: mapCoords.y, alt });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const mapCoords = screenToMap(screenX, screenY);
    setCursorPos(mapCoords);

    if (interactionMode === 'measure' && measureStart) {
      setMeasureEnd(mapCoords);
      return;
    }

    if (drawingStart) {
      setDrawingCurrent(mapCoords);
      return;
    }

    if (!isDragging) return;

    if (dragTarget === 'viewport') {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    } else if (dragTarget === 'mortar') {
      const alt = getGroundElevation(mapCoords.x, mapCoords.y);
      onSetMortar({ x: mapCoords.x, y: mapCoords.y, alt });
    } else if (dragTarget === 'target') {
      const alt = getGroundElevation(mapCoords.x, mapCoords.y);
      onSetTarget({ x: mapCoords.x, y: mapCoords.y, alt });
    }
  };

  const handleMouseUp = () => {
    if (drawingStart && drawingCurrent) {
      if (interactionMode === 'draw_line') {
        onAddDrawing({
          id: Math.random().toString(36).substring(2, 9),
          mapId: mapData.id,
          type: 'line',
          color: drawingColor,
          points: [[drawingStart.x, drawingStart.y], [drawingCurrent.x, drawingCurrent.y]],
          timestamp: Date.now()
        });
      } else if (interactionMode === 'draw_circle') {
        const radiusMeters = Math.hypot(drawingCurrent.x - drawingStart.x, drawingCurrent.y - drawingStart.y);
        onAddDrawing({
          id: Math.random().toString(36).substring(2, 9),
          mapId: mapData.id,
          type: 'circle',
          color: drawingColor,
          points: [[drawingStart.x, drawingStart.y]],
          radius: radiusMeters,
          timestamp: Date.now()
        });
      }
      setDrawingStart(null);
      setDrawingCurrent(null);
    }
    setIsDragging(false);
    setDragTarget(null);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseScreenX = e.clientX - rect.left;
    const mouseScreenY = e.clientY - rect.top;

    const factor = e.deltaY < 0 ? 1.2 : 1 / 1.2;
    const newZoom = Math.max(0.015, Math.min(0.5, zoom * factor));

    const newPanX = mouseScreenX - (mouseScreenX - pan.x) * (newZoom / zoom);
    const newPanY = mouseScreenY - (mouseScreenY - pan.y) * (newZoom / zoom);

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  // Mobile Touch Handlers: 1-finger pan, 2-finger pinch-to-zoom (TASK 5)
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const screenX = touch.clientX - rect.left;
      const screenY = touch.clientY - rect.top;
      touchStartRef.current = { x: screenX, y: screenY };

      const mapCoords = screenToMap(screenX, screenY);
      setCursorPos(mapCoords);

      // Check if touching near Mortar or Target
      if (mortar.x > 0 && Math.hypot(screenX - mapToScreen(mortar.x, mortar.y).x, screenY - mapToScreen(mortar.x, mortar.y).y) < 28) {
        setDragTarget('mortar');
        setIsDragging(true);
        setDragStart({ x: screenX, y: screenY });
        return;
      }
      if (target.x > 0 && Math.hypot(screenX - mapToScreen(target.x, target.y).x, screenY - mapToScreen(target.x, target.y).y) < 28) {
        setDragTarget('target');
        setIsDragging(true);
        setDragStart({ x: screenX, y: screenY });
        return;
      }

      if (interactionMode === 'mortar') {
        const alt = getGroundElevation(mapCoords.x, mapCoords.y);
        onSetMortar({ x: mapCoords.x, y: mapCoords.y, alt });
        return;
      }
      if (interactionMode === 'target') {
        const alt = getGroundElevation(mapCoords.x, mapCoords.y);
        onSetTarget({ x: mapCoords.x, y: mapCoords.y, alt });
        return;
      }

      setIsDragging(true);
      setDragTarget('viewport');
      setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
    } else if (e.touches.length === 2) {
      // Pinch to zoom initialization
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      touchPinchDistRef.current = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    if (e.touches.length === 1 && isDragging) {
      const touch = e.touches[0];
      const screenX = touch.clientX - rect.left;
      const screenY = touch.clientY - rect.top;
      const mapCoords = screenToMap(screenX, screenY);
      setCursorPos(mapCoords);

      if (dragTarget === 'viewport') {
        setPan({
          x: touch.clientX - dragStart.x,
          y: touch.clientY - dragStart.y
        });
      } else if (dragTarget === 'mortar') {
        const alt = getGroundElevation(mapCoords.x, mapCoords.y);
        onSetMortar({ x: mapCoords.x, y: mapCoords.y, alt });
      } else if (dragTarget === 'target') {
        const alt = getGroundElevation(mapCoords.x, mapCoords.y);
        onSetTarget({ x: mapCoords.x, y: mapCoords.y, alt });
      }
    } else if (e.touches.length === 2 && touchPinchDistRef.current) {
      // Handle pinch zoom
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const factor = currentDist / touchPinchDistRef.current;

      const midScreenX = (t1.clientX + t2.clientX) / 2 - rect.left;
      const midScreenY = (t1.clientY + t2.clientY) / 2 - rect.top;

      const newZoom = Math.max(0.015, Math.min(0.5, zoom * factor));
      const newPanX = midScreenX - (midScreenX - pan.x) * (newZoom / zoom);
      const newPanY = midScreenY - (midScreenY - pan.y) * (newZoom / zoom);

      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
      touchPinchDistRef.current = currentDist;
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setDragTarget(null);
    touchStartRef.current = null;
    touchPinchDistRef.current = null;
  };

  // Center on coordinates helper
  const centerOnPoint = (mapX: number, mapY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const centerX = canvas.clientWidth / 2;
    const centerY = canvas.clientHeight / 2;
    setPan({
      x: centerX - mapX * zoom,
      y: centerY - (mapData.size - mapY) * zoom
    });
  };

  return (
    <div className="relative w-full h-[65vh] min-h-[380px] lg:h-[620px] bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800 shadow-2xl flex flex-col">
      {/* Top Map Toolbar (Responsive) */}
      <div className="absolute top-2 left-2 right-2 z-20 flex flex-wrap items-center justify-between gap-1.5 pointer-events-none">
        {/* Interaction Mode Buttons */}
        <div className="flex items-center gap-1 bg-zinc-900/90 border border-zinc-700/80 p-1 rounded-lg shadow-md pointer-events-auto backdrop-blur-xs">
          <button
            onClick={() => onSelectInteractionMode('mortar')}
            className={`min-h-[36px] px-2.5 py-1 text-xs font-semibold rounded flex items-center gap-1.5 transition-colors cursor-pointer ${
              interactionMode === 'mortar'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-400"></span>
            {t.clickToSetMortar}
          </button>
          <button
            onClick={() => onSelectInteractionMode('target')}
            className={`min-h-[36px] px-2.5 py-1 text-xs font-semibold rounded flex items-center gap-1.5 transition-colors cursor-pointer ${
              interactionMode === 'target'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            {t.clickToSetTarget}
          </button>
          <button
            onClick={() => {
              if (interactionMode === 'measure') {
                onSelectInteractionMode('view');
                setMeasureStart(null);
                setMeasureEnd(null);
              } else {
                onSelectInteractionMode('measure');
              }
            }}
            className={`min-h-[36px] px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
              interactionMode === 'measure'
                ? 'bg-sky-600 text-white'
                : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
            }`}
          >
            📏 {t.measureMode}
          </button>
        </div>

        {/* Tactical Drawing Tools Drawer Button */}
        <div className="flex items-center gap-1 bg-zinc-900/90 border border-zinc-700/80 p-1 rounded-lg shadow-md pointer-events-auto backdrop-blur-xs text-xs">
          <button
            onClick={() => onSelectInteractionMode(interactionMode === 'draw_line' ? 'view' : 'draw_line')}
            className={`min-h-[36px] px-2 py-1 rounded transition-colors cursor-pointer ${
              interactionMode === 'draw_line' ? 'bg-amber-600 text-white font-semibold' : 'text-zinc-300 hover:bg-zinc-800'
            }`}
            title={t.drawLine}
          >
            ✏️ {lang === 'ar' ? 'خط' : 'Line'}
          </button>
          <button
            onClick={() => onSelectInteractionMode(interactionMode === 'draw_circle' ? 'view' : 'draw_circle')}
            className={`min-h-[36px] px-2 py-1 rounded transition-colors cursor-pointer ${
              interactionMode === 'draw_circle' ? 'bg-amber-600 text-white font-semibold' : 'text-zinc-300 hover:bg-zinc-800'
            }`}
            title={t.drawCircle}
          >
            ⭕ {lang === 'ar' ? 'دائرة' : 'Circle'}
          </button>
          <button
            onClick={() => onSelectInteractionMode(interactionMode === 'draw_point' ? 'view' : 'draw_point')}
            className={`min-h-[36px] px-2 py-1 rounded transition-colors cursor-pointer ${
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
              className="px-1.5 py-1 text-[10px] text-zinc-400 hover:text-red-400 cursor-pointer"
              title={t.clearDrawings}
            >
              🗑️
            </button>
          )}
        </div>

        {/* View Controls & Diagnostics (TASK 6) */}
        <div className="flex items-center gap-1 bg-zinc-900/90 border border-zinc-700/80 p-1 rounded-lg shadow-md pointer-events-auto backdrop-blur-xs text-xs">
          <button
            onClick={() => setShowGrid(s => !s)}
            className={`min-h-[36px] px-2 py-1 rounded transition-colors cursor-pointer ${showGrid ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}
          >
            {t.toggleGrid}
          </button>
          <button
            onClick={() => setShowLabels(s => !s)}
            className={`min-h-[36px] px-2 py-1 rounded transition-colors cursor-pointer ${showLabels ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}
          >
            {t.toggleLabels}
          </button>
          <button
            onClick={() => setShowRings(s => !s)}
            className={`min-h-[36px] px-2 py-1 rounded transition-colors cursor-pointer ${showRings ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}
          >
            {t.toggleRings}
          </button>
          <span className="text-zinc-700">|</span>
          <button
            onClick={() => mortar.x && centerOnPoint(mortar.x, mortar.y)}
            className="min-h-[36px] px-2 py-1 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded cursor-pointer"
            title={t.centerMortar}
          >
            🎯
          </button>
          <button
            onClick={() => target.x && centerOnPoint(target.x, target.y)}
            className="min-h-[36px] px-2 py-1 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded cursor-pointer"
            title={t.centerTarget}
          >
            📍
          </button>
          <button
            onClick={fitMap}
            className="min-h-[36px] px-2 py-1 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded cursor-pointer font-bold"
            title={t.fitMap}
          >
            ⛶
          </button>
          <button
            onClick={() => setShowDiagnostics(s => !s)}
            className={`min-h-[36px] px-2 py-1 rounded transition-colors cursor-pointer ${
              imageLoadingStatus === 'error' ? 'bg-red-900 text-red-200' : showDiagnostics ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title={t.toggleDiagnostics}
          >
            ℹ️
          </button>
        </div>
      </div>

      {/* Map Canvas (Desktop Mouse & Mobile Touch Enabled) */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onContextMenu={e => e.preventDefault()}
        style={{ touchAction: 'none' }}
        className={`w-full h-full block select-none ${
          interactionMode === 'mortar' || interactionMode === 'target'
            ? 'cursor-crosshair'
            : interactionMode.startsWith('draw_')
            ? 'cursor-crosshair'
            : isDragging
            ? 'cursor-grabbing'
            : 'cursor-grab'
        }`}
      />

      {/* Loading Indicator Overlay */}
      {imageLoadingStatus === 'loading' && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 bg-zinc-900/90 border border-emerald-500/50 text-emerald-300 px-4 py-2 rounded-lg text-xs flex items-center gap-2 shadow-xl backdrop-blur-xs">
          <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <span>{t.mapStatusLoading}</span>
        </div>
      )}

      {/* Error State Banner with Retry and Official Link (TASK 1 & TASK 2) */}
      {imageLoadingStatus === 'error' && (
        <div className="absolute top-14 left-4 right-4 z-30 bg-red-950/95 border border-red-500 text-red-200 p-3 rounded-lg shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs backdrop-blur-xs">
          <div className="flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <div>
              <div className="font-bold">{t.mapStatusError}</div>
              <div className="text-[11px] text-red-300 mt-0.5">{imageErrorMessage}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setRetryCounter(c => c + 1)}
              className="px-3 py-1.5 bg-red-800 hover:bg-red-700 text-white font-medium rounded transition-colors cursor-pointer text-xs"
            >
              {t.mapRetry}
            </button>
            <a
              href={mapData.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-medium rounded transition-colors text-xs flex items-center gap-1"
            >
              <span>{t.openOfficialMap}</span>
              <span>↗</span>
            </a>
          </div>
        </div>
      )}

      {/* Zoom Controls (Bottom Right) */}
      <div className="absolute bottom-10 right-3 z-10 flex flex-col gap-1 bg-zinc-900/90 border border-zinc-700/80 rounded-lg shadow-lg p-1 backdrop-blur-xs">
        <button
          onClick={() => setZoom(z => Math.min(0.5, z * 1.25))}
          className="w-9 h-9 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-100 flex items-center justify-center font-bold text-lg cursor-pointer"
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={() => setZoom(z => Math.max(0.015, z / 1.25))}
          className="w-9 h-9 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-100 flex items-center justify-center font-bold text-lg cursor-pointer"
          title="Zoom Out"
        >
          -
        </button>
      </div>

      {/* Coordinate Status Bar (Bottom Left) */}
      <div className="absolute bottom-2 left-2 z-10 bg-zinc-950/85 border border-zinc-800 px-3 py-1 rounded-md text-[11px] font-mono text-zinc-300 shadow-md flex items-center gap-3 backdrop-blur-xs">
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
        <div className="absolute inset-x-2 bottom-12 z-30 bg-zinc-900/95 border border-zinc-700 rounded-lg p-3 text-xs text-zinc-200 shadow-2xl backdrop-blur-md max-h-60 overflow-y-auto">
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
              <strong className={imageLoadingStatus === 'loaded' ? 'text-emerald-400' : imageLoadingStatus === 'loading' ? 'text-amber-400' : 'text-red-400'}>
                {imageLoadingStatus === 'loaded' ? t.mapStatusLoaded : imageLoadingStatus === 'loading' ? t.mapStatusLoading : t.mapStatusError}
              </strong>
            </div>
            <div>
              <span className="text-zinc-400">Current Zoom:</span> <strong className="text-zinc-100">{(zoom * 1000).toFixed(1)} px/km</strong>
            </div>
            <div className="col-span-full">
              <span className="text-zinc-400">{t.sourceEndpoint}</span>{' '}
              <a href={mapData.overviewUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all">
                {mapData.overviewUrl}
              </a>
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
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium text-xs flex items-center gap-1.5 transition-colors"
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
