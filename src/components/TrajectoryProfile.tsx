import React from 'react';
import { CalculationResult, Coordinates, Language } from '../types/mortar';
import { generateTrajectoryPoints } from '../utils/ballistics';
import { translations } from '../utils/translations';

interface TrajectoryProfileProps {
  mortar: Coordinates;
  target: Coordinates;
  solution: CalculationResult | null;
  velocity: number;
  gravity: number;
  lang: Language;
  arcType: 'high' | 'low';
}

export const TrajectoryProfile: React.FC<TrajectoryProfileProps> = ({
  mortar,
  target,
  solution,
  velocity,
  gravity,
  lang,
  arcType
}) => {
  const t = translations[lang];

  if (!solution || solution.distance === 0 || !solution.inRange) {
    return (
      <div className="h-44 flex flex-col items-center justify-center bg-zinc-900/60 border border-zinc-800 rounded-lg text-zinc-500 text-xs text-center p-4">
        <div className="w-8 h-8 rounded-full border border-dashed border-zinc-700 flex items-center justify-center mb-2 text-zinc-600">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <span>{lang === 'ar' ? 'حدد موقعي الهاون والهدف داخل المدى لعرض المسار البالستي' : 'Set valid in-range Mortar and Target positions to preview trajectory arc'}</span>
      </div>
    );
  }

  const thetaRad = arcType === 'high' ? solution.highAngleRad : solution.lowAngleRad;
  const tof = arcType === 'high' ? solution.highAngleTof : solution.lowAngleTof;
  const apexAlt = arcType === 'high' ? solution.highApexAlt : solution.lowApexAlt;

  // Generate trajectory points
  const points = generateTrajectoryPoints(
    mortar.alt,
    target.alt,
    solution.distance,
    thetaRad,
    velocity,
    gravity,
    60
  );

  // SVG Dimension setup
  const svgWidth = 600;
  const svgHeight = 160;
  const padX = 45;
  const padY = 24;

  const minAlt = Math.min(0, mortar.alt, target.alt);
  const maxAlt = Math.max(apexAlt * 1.15, mortar.alt + 50, target.alt + 50);
  const altSpan = Math.max(50, maxAlt - minAlt);

  const scaleX = (x: number) => padX + (x / solution.distance) * (svgWidth - padX * 2);
  const scaleY = (alt: number) => svgHeight - padY - ((alt - minAlt) / altSpan) * (svgHeight - padY * 2);

  // Path string for the trajectory curve
  const pathD = points.length > 0
    ? `M ${scaleX(points[0].x)} ${scaleY(points[0].y)} ` +
      points.slice(1).map(p => `L ${scaleX(p.x)} ${scaleY(p.y)}`).join(' ')
    : '';

  // Ground polygon under trajectory
  const groundPolygon = `M ${scaleX(0)} ${scaleY(mortar.alt)} L ${scaleX(solution.distance)} ${scaleY(target.alt)} L ${scaleX(solution.distance)} ${svgHeight - 10} L ${scaleX(0)} ${svgHeight - 10} Z`;

  // Highest point for Apex label
  const apexPoint = points.reduce((prev, curr) => (curr.y > prev.y ? curr : prev), points[0] || { x: 0, y: 0, t: 0 });

  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3 overflow-hidden">
      <div className="flex items-center justify-between text-xs mb-2">
        <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          {t.profileTitle}
        </span>
        <div className="flex items-center gap-3 text-zinc-400 font-mono text-[11px]">
          <span>{lang === 'ar' ? 'القمة' : 'Apex'}: <strong className="text-amber-400 tabular-nums">{apexAlt.toFixed(0)}m</strong></span>
          <span>{lang === 'ar' ? 'الزمن' : 'TOF'}: <strong className="text-emerald-400 tabular-nums">{tof.toFixed(1)}s</strong></span>
        </div>
      </div>

      <div className="relative w-full">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto overflow-visible select-none">
          <defs>
            <linearGradient id="trajGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
            <linearGradient id="groundGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#27272a" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#18181b" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#065f46" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#065f46" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Background Grid Lines */}
          <line x1={padX} y1={svgHeight - padY} x2={svgWidth - padX} y2={svgHeight - padY} stroke="#3f3f46" strokeWidth="1" strokeDasharray="3 3" />
          <line x1={padX} y1={padY} x2={svgWidth - padX} y2={padY} stroke="#27272a" strokeWidth="1" strokeDasharray="2 4" />

          {/* Ground Terrain */}
          <path d={groundPolygon} fill="url(#groundGrad)" />
          <line
            x1={scaleX(0)}
            y1={scaleY(mortar.alt)}
            x2={scaleX(solution.distance)}
            y2={scaleY(target.alt)}
            stroke="#52525b"
            strokeWidth="1.5"
            strokeDasharray="4 2"
          />

          {/* Trajectory Shaded Fill */}
          {points.length > 0 && (
            <path
              d={`${pathD} L ${scaleX(solution.distance)} ${scaleY(target.alt)} L ${scaleX(0)} ${scaleY(mortar.alt)} Z`}
              fill="url(#skyGrad)"
            />
          )}

          {/* Parabolic Trajectory Curve */}
          <path
            d={pathD}
            fill="none"
            stroke="url(#trajGrad)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Apex Marker */}
          {apexPoint && (
            <g transform={`translate(${scaleX(apexPoint.x)}, ${scaleY(apexPoint.y)})`}>
              <circle r="3.5" fill="#f59e0b" />
              <line y1="0" y2="14" stroke="#f59e0b" strokeWidth="1" strokeDasharray="2 2" />
              <text y="-8" fill="#f59e0b" fontSize="10" fontWeight="600" textAnchor="middle" fontFamily="monospace">
                ▲ {apexAlt.toFixed(0)}m
              </text>
            </g>
          )}

          {/* Mortar Station (Left) */}
          <g transform={`translate(${scaleX(0)}, ${scaleY(mortar.alt)})`}>
            <circle r="5" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
            <text y="18" fill="#f87171" fontSize="9" fontWeight="600" textAnchor="middle" fontFamily="sans-serif">
              {t.mortarBattery} ({mortar.alt}m)
            </text>
          </g>

          {/* Target Impact (Right) */}
          <g transform={`translate(${scaleX(solution.distance)}, ${scaleY(target.alt)})`}>
            <circle r="5" fill="#3b82f6" stroke="#ffffff" strokeWidth="1.5" />
            <line x1="-7" y1="0" x2="7" y2="0" stroke="#60a5fa" strokeWidth="1.5" />
            <line x1="0" y1="-7" x2="0" y2="7" stroke="#60a5fa" strokeWidth="1.5" />
            <text y="18" fill="#60a5fa" fontSize="9" fontWeight="600" textAnchor="middle" fontFamily="sans-serif">
              {t.impactTarget} ({target.alt}m)
            </text>
          </g>

          {/* Distance Bar at bottom */}
          <text x={svgWidth / 2} y={svgHeight - 4} fill="#71717a" fontSize="10" textAnchor="middle" fontFamily="monospace">
            ↔ {solution.distance.toFixed(0)}m ({((solution.distance) / 1000).toFixed(2)} km) · ΔH: {solution.deltaH > 0 ? `+${solution.deltaH}` : solution.deltaH}m
          </text>
        </svg>
      </div>
    </div>
  );
};
