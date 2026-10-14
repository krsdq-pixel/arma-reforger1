import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Coordinates,
  Language,
  MilSystem,
  TrajectoryArc,
  InteractionMode,
  ActiveRound,
  SavedTarget,
  BallisticProfile,
  MapId,
  TacticalDrawing
} from './types/mortar';
import { MAPS, BALLISTIC_PROFILES } from './data/mapsData';
import {
  calculateBallistics,
  meterToGrid4,
  grid4ToMeter,
  findBestCharge,
  applyKeypadOffset
} from './utils/ballistics';
import { translations } from './utils/translations';
import { playMortarLaunchSound, playClickSound } from './utils/audio';
import { loadPersistedState, savePersistedState } from './utils/storage';
import { TacticalMap } from './components/TacticalMap';
import { TrajectoryProfile } from './components/TrajectoryProfile';
import { SplashTimer } from './components/SplashTimer';
import { NumpadSubgrid } from './components/NumpadSubgrid';
import { SavedTargetsModal } from './components/SavedTargetsModal';

export default function App() {
  // Load persisted initial state
  const initial = useMemo(() => loadPersistedState(), []);

  // Locale & Units
  const [lang, setLang] = useState<Language>(initial.settings?.lang || 'ar');
  const [milSystem, setMilSystem] = useState<MilSystem>(initial.settings?.milSystem || 'nato');
  const [trajectoryArc, setTrajectoryArc] = useState<TrajectoryArc>(initial.settings?.trajectoryArc || 'high');
  const [muted, setMuted] = useState(initial.settings?.muted ?? false);
  const [selectedMapId, setSelectedMapId] = useState<MapId>(initial.selectedMapId || 'everon');

  // Mobile View Tab state (for responsive layout on phones / Android)
  const [mobileTab, setMobileTab] = useState<'map' | 'solution' | 'positions' | 'logs'>('map');

  // Map and Coordinates
  const currentMap = MAPS[selectedMapId] || MAPS.everon;

  // Battery (Mortar)
  const [mortar, setMortar] = useState<Coordinates>(
    initial.mortar || {
      x: 4775.641,
      y: 7086.945,
      alt: 75,
      name: 'Montignac'
    }
  );

  // Target
  const [target, setTarget] = useState<Coordinates>(
    initial.target || {
      x: 7087.74,
      y: 6011.904,
      alt: 38,
      name: 'Chotain'
    }
  );

  // 4-digit grid input strings
  const [mortarXInput, setMortarXInput] = useState<string>(meterToGrid4(mortar.x));
  const [mortarYInput, setMortarYInput] = useState<string>(meterToGrid4(mortar.y));
  const [targetXInput, setTargetXInput] = useState<string>(meterToGrid4(target.x));
  const [targetYInput, setTargetYInput] = useState<string>(meterToGrid4(target.y));

  // Sync inputs when coordinates change
  useEffect(() => {
    if (mortar.x > 0) setMortarXInput(meterToGrid4(mortar.x));
    if (mortar.y > 0) setMortarYInput(meterToGrid4(mortar.y));
  }, [mortar.x, mortar.y]);

  useEffect(() => {
    if (target.x > 0) setTargetXInput(meterToGrid4(target.x));
    if (target.y > 0) setTargetYInput(meterToGrid4(target.y));
  }, [target.x, target.y]);

  // Ballistics Settings
  const [selectedProfileIndex, setSelectedProfileIndex] = useState<number>(initial.profileIndex ?? 2);
  const activeProfile = BALLISTIC_PROFILES[selectedProfileIndex] || BALLISTIC_PROFILES[2];

  const [velocity, setVelocity] = useState<number>(initial.customBallistics?.velocity ?? activeProfile.velocity);
  const [gravity, setGravity] = useState<number>(initial.customBallistics?.gravity ?? activeProfile.gravity);
  const [minRange, setMinRange] = useState<number>(initial.customBallistics?.minRange ?? activeProfile.minRange);
  const [maxRange, setMaxRange] = useState<number>(initial.customBallistics?.maxRange ?? activeProfile.maxRange);

  // Update profile
  const handleProfileChange = (idx: number) => {
    setSelectedProfileIndex(idx);
    const p = BALLISTIC_PROFILES[idx];
    if (p) {
      setVelocity(p.velocity);
      setGravity(p.gravity);
      setMinRange(p.minRange);
      setMaxRange(p.maxRange);
    }
  };

  // Map interaction mode
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('target');

  // Tactical Drawings & Annotations (TASK 4)
  const [drawings, setDrawings] = useState<TacticalDrawing[]>(initial.drawings || []);

  const handleAddDrawing = (drawing: TacticalDrawing) => {
    setDrawings(prev => [...prev, drawing]);
  };

  const handleClearDrawings = () => {
    setDrawings(prev => prev.filter(d => d.mapId !== selectedMapId));
  };

  // Active splash countdown timers
  const [activeRounds, setActiveRounds] = useState<ActiveRound[]>([]);

  // Saved targets list (TASK 4)
  const [savedTargets, setSavedTargets] = useState<SavedTarget[]>(
    initial.savedTargets || [
      { id: '1', mapId: 'everon', name: 'Andres Beacon (Radio Relay)', x: 6843.832, y: 8191.218, alt: 198, notes: 'Observation post', timestamp: Date.now() - 100000 },
      { id: '2', mapId: 'everon', name: 'Airport Runway Checkpoint', x: 4893.46, y: 11800.709, alt: 18, notes: 'Convoy choke point', timestamp: Date.now() - 50000 },
      { id: '3', mapId: 'kolguyev', name: 'Michurino Outpost', x: 3799.76, y: 3718.5, alt: 45, notes: 'Supply depot', timestamp: Date.now() - 30000 }
    ]
  );
  const [isSavedTargetsOpen, setIsSavedTargetsOpen] = useState(false);
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  // Subgrid Keypad toggles
  const [showMortarKeypad, setShowMortarKeypad] = useState(false);
  const [showTargetKeypad, setShowTargetKeypad] = useState(false);

  const t = translations[lang];

  // Set document dir when language changes
  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  // Persist State Changes to localStorage (TASK 4)
  useEffect(() => {
    savePersistedState({
      selectedMapId,
      mortar,
      target,
      savedTargets,
      drawings,
      profileIndex: selectedProfileIndex,
      customBallistics: { velocity, gravity, minRange, maxRange },
      settings: { lang, milSystem, trajectoryArc, muted }
    });
  }, [selectedMapId, mortar, target, savedTargets, drawings, selectedProfileIndex, velocity, gravity, minRange, maxRange, lang, milSystem, trajectoryArc, muted]);

  // Ballistic calculation
  const solution = useMemo(() => {
    if (!mortar.x || !mortar.y || !target.x || !target.y) return null;
    return calculateBallistics(
      mortar,
      target,
      { velocity, gravity, minRange, maxRange }
    );
  }, [mortar, target, velocity, gravity, minRange, maxRange]);

  // Handlers for manual grid inputs
  const handleMortarGridSubmit = () => {
    const x = grid4ToMeter(mortarXInput);
    const y = grid4ToMeter(mortarYInput);
    if (x > 0 && y > 0) {
      setMortar(prev => ({ ...prev, x, y, name: undefined }));
    }
  };

  const handleTargetGridSubmit = () => {
    const x = grid4ToMeter(targetXInput);
    const y = grid4ToMeter(targetYInput);
    if (x > 0 && y > 0) {
      setTarget(prev => ({ ...prev, x, y, name: undefined }));
    }
  };

  // Keypad subgrid offsets
  const handleMortarSubgrid = (keypadNum: number) => {
    const newX = applyKeypadOffset(mortar.x, keypadNum, 'x');
    const newY = applyKeypadOffset(mortar.y, keypadNum, 'y');
    setMortar(prev => ({ ...prev, x: newX, y: newY }));
    setShowMortarKeypad(false);
  };

  const handleTargetSubgrid = (keypadNum: number) => {
    const newX = applyKeypadOffset(target.x, keypadNum, 'x');
    const newY = applyKeypadOffset(target.y, keypadNum, 'y');
    setTarget(prev => ({ ...prev, x: newX, y: newY }));
    setShowTargetKeypad(false);
  };

  // Auto Best Charge Finder
  const handleAutoCharge = () => {
    if (!solution) return;
    const best = findBestCharge(solution.distance, solution.deltaH, BALLISTIC_PROFILES);
    if (best) {
      const idx = BALLISTIC_PROFILES.findIndex(p => p.name === best.name);
      if (idx !== -1) {
        handleProfileChange(idx);
      }
    }
  };

  // Swap Battery and Target positions
  const handleSwap = () => {
    playClickSound(muted);
    const temp = { ...mortar };
    setMortar({ ...target });
    setTarget(temp);
  };

  // Clear all
  const handleClear = () => {
    playClickSound(muted);
    setMortar({ x: 0, y: 0, alt: 0 });
    setTarget({ x: 0, y: 0, alt: 0 });
    setMortarXInput('');
    setMortarYInput('');
    setTargetXInput('');
    setTargetYInput('');
  };

  // Fire Mission / Splash Round
  const handleFireRound = () => {
    if (!solution || !solution.inRange) return;
    playMortarLaunchSound(muted);

    const tof = trajectoryArc === 'high' ? solution.highAngleTof : solution.lowAngleTof;
    const elev = milSystem === 'nato' ? solution.highAngleMilNato : milSystem === 'soviet' ? solution.highAngleMilSoviet : solution.highAngleDeg;
    const bearing = milSystem === 'nato' ? solution.azimuthMilNato : milSystem === 'soviet' ? solution.azimuthMilSoviet : solution.azimuthDeg;

    const newRound: ActiveRound = {
      id: Math.random().toString(36).substring(2, 9),
      targetName: target.name || `${meterToGrid4(target.x)}-${meterToGrid4(target.y)}`,
      fireTime: Date.now(),
      impactTime: Date.now() + tof * 1000,
      tof,
      charge: activeProfile.charge,
      bearing,
      elevation: elev,
      hasSplashed: false
    };

    setActiveRounds(prev => [newRound, ...prev]);
  };

  // Copy standard military fire mission text card
  const handleCopyMission = useCallback(() => {
    if (!solution) return;
    const azMil = milSystem === 'nato' ? solution.azimuthMilNato : solution.azimuthMilSoviet;
    const elevMil = trajectoryArc === 'high'
      ? (milSystem === 'nato' ? solution.highAngleMilNato : solution.highAngleMilSoviet)
      : (milSystem === 'nato' ? solution.lowAngleMilNato : solution.lowAngleMilSoviet);
    const tof = trajectoryArc === 'high' ? solution.highAngleTof : solution.lowAngleTof;

    const missionText = `[FIRE MISSION] Map: ${currentMap.name} | BTY: ${meterToGrid4(mortar.x)}-${meterToGrid4(mortar.y)} (${mortar.alt}m) -> TGT: ${meterToGrid4(target.x)}-${meterToGrid4(target.y)} (${target.alt}m) | RNG: ${solution.distance.toFixed(0)}m | AZ: ${solution.azimuthDeg.toFixed(1)}° (${azMil.toFixed(0)} mil) | ELEV: ${elevMil.toFixed(0)} mil | CHG: ${activeProfile.charge} | TOF: ${tof.toFixed(1)}s`;

    navigator.clipboard.writeText(missionText);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2500);
  }, [solution, milSystem, trajectoryArc, currentMap.name, mortar, target, activeProfile.charge]);

  // Saved targets handlers
  const handleSaveCurrentTarget = (name: string, notes?: string) => {
    const newTarget: SavedTarget = {
      id: Math.random().toString(36).substring(2, 9),
      mapId: selectedMapId,
      name,
      x: target.x,
      y: target.y,
      alt: target.alt,
      notes,
      timestamp: Date.now()
    };
    setSavedTargets(prev => [newTarget, ...prev]);
  };

  const handleSelectSavedTarget = (tgt: SavedTarget) => {
    if (tgt.mapId && tgt.mapId !== selectedMapId) {
      setSelectedMapId(tgt.mapId);
    }
    setTarget({
      x: tgt.x,
      y: tgt.y,
      alt: tgt.alt,
      name: tgt.name
    });
  };

  const handleDeleteSavedTarget = (id: string) => {
    setSavedTargets(prev => prev.filter(t => t.id !== id));
  };

  // Format elevation & azimuth based on chosen mil system
  const formattedBearing = useMemo(() => {
    if (!solution) return { primary: '---', secondary: '---' };
    if (milSystem === 'nato') {
      return {
        primary: `${solution.azimuthMilNato.toFixed(0)} mils`,
        secondary: `${solution.azimuthDeg.toFixed(1)}°`
      };
    } else if (milSystem === 'soviet') {
      return {
        primary: `${solution.azimuthMilSoviet.toFixed(0)} mils`,
        secondary: `${solution.azimuthDeg.toFixed(1)}°`
      };
    }
    return {
      primary: `${solution.azimuthDeg.toFixed(1)}°`,
      secondary: `${solution.azimuthMilNato.toFixed(0)} mils (NATO)`
    };
  }, [solution, milSystem]);

  const formattedElevation = useMemo(() => {
    if (!solution || !solution.inRange) return { primary: '---', secondary: '---' };
    const rad = trajectoryArc === 'high' ? solution.highAngleRad : solution.lowAngleRad;
    const deg = rad * (180 / Math.PI);
    const milNato = (rad * 6400) / (2 * Math.PI);
    const milSov = (rad * 6000) / (2 * Math.PI);

    if (milSystem === 'nato') {
      return {
        primary: `${milNato.toFixed(0)} mils`,
        secondary: `${deg.toFixed(1)}°`
      };
    } else if (milSystem === 'soviet') {
      return {
        primary: `${milSov.toFixed(0)} mils`,
        secondary: `${deg.toFixed(1)}°`
      };
    }
    return {
      primary: `${deg.toFixed(1)}°`,
      secondary: `${milNato.toFixed(0)} mils (NATO)`
    };
  }, [solution, milSystem, trajectoryArc]);

  // Map switch handler
  const handleMapSwitch = (newMapId: MapId) => {
    setSelectedMapId(newMapId);
    const m = MAPS[newMapId];
    if (m && m.landmarks.length >= 2) {
      setMortar({
        x: m.landmarks[0].x,
        y: m.landmarks[0].y,
        alt: m.landmarks[0].alt,
        name: m.landmarks[0].name
      });
      setTarget({
        x: m.landmarks[1].x,
        y: m.landmarks[1].y,
        alt: m.landmarks[1].alt,
        name: m.landmarks[1].name
      });
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* 2. Top Bar Contract: Brand Wordmark — 4-5 single line controls — Primary CTA */}
      <header className="border-b border-zinc-800 bg-zinc-900/90 backdrop-blur-md px-4 lg:px-8 py-3 shrink-0 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 sm:gap-6">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="text-lg sm:text-xl font-bold font-mono tracking-tight text-emerald-400 whitespace-nowrap">
              🎯 ARMA REFORGER MORTAR
            </span>
            <span className="hidden sm:inline-block text-[11px] font-mono text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
              {currentMap.name}
            </span>
          </div>

          {/* Zone 2: 4-5 single-line navigation controls */}
          <nav className="hidden md:flex items-center gap-3 text-xs font-medium text-zinc-400 shrink-0">
            {/* Map selector (Everon, Arland, Kolguyev) */}
            <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded p-0.5">
              <button
                onClick={() => handleMapSwitch('everon')}
                className={`min-h-[36px] px-2.5 py-1 rounded text-xs transition-colors cursor-pointer whitespace-nowrap ${
                  selectedMapId === 'everon' ? 'bg-zinc-800 text-emerald-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Everon
              </button>
              <button
                onClick={() => handleMapSwitch('arland')}
                className={`min-h-[36px] px-2.5 py-1 rounded text-xs transition-colors cursor-pointer whitespace-nowrap ${
                  selectedMapId === 'arland' ? 'bg-zinc-800 text-emerald-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Arland
              </button>
              <button
                onClick={() => handleMapSwitch('kolguyev')}
                className={`min-h-[36px] px-2.5 py-1 rounded text-xs transition-colors cursor-pointer whitespace-nowrap ${
                  selectedMapId === 'kolguyev' ? 'bg-zinc-800 text-emerald-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Kolguyev
              </button>
            </div>

            {/* Mil system toggle */}
            <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded p-0.5">
              <button
                onClick={() => setMilSystem('nato')}
                className={`min-h-[36px] px-2.5 py-1 rounded text-xs transition-colors cursor-pointer whitespace-nowrap ${
                  milSystem === 'nato' ? 'bg-zinc-800 text-emerald-400 font-semibold' : 'text-zinc-400'
                }`}
                title="NATO 6400 mils"
              >
                NATO 6400
              </button>
              <button
                onClick={() => setMilSystem('soviet')}
                className={`min-h-[36px] px-2.5 py-1 rounded text-xs transition-colors cursor-pointer whitespace-nowrap ${
                  milSystem === 'soviet' ? 'bg-zinc-800 text-amber-400 font-semibold' : 'text-zinc-400'
                }`}
                title="Warsaw 6000 mils"
              >
                Warsaw 6000
              </button>
              <button
                onClick={() => setMilSystem('deg')}
                className={`min-h-[36px] px-2.5 py-1 rounded text-xs transition-colors cursor-pointer whitespace-nowrap ${
                  milSystem === 'deg' ? 'bg-zinc-800 text-zinc-100 font-semibold' : 'text-zinc-400'
                }`}
                title="Standard Degrees"
              >
                Deg (°)
              </button>
            </div>

            {/* Language Switch */}
            <button
              onClick={() => setLang(l => (l === 'ar' ? 'en' : 'ar'))}
              className="min-h-[36px] px-2.5 py-1 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded text-xs font-semibold text-zinc-200 transition-colors cursor-pointer whitespace-nowrap"
            >
              {lang === 'ar' ? 'English (EN)' : 'العربية (AR)'}
            </button>

            {/* Audio Toggle */}
            <button
              onClick={() => setMuted(m => !m)}
              className="min-h-[36px] px-2 py-1 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded text-xs text-zinc-300 transition-colors cursor-pointer whitespace-nowrap"
              title={muted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {muted ? '🔇' : '🔊'}
            </button>

            {/* TRP Saved Targets Button */}
            <button
              onClick={() => setIsSavedTargetsOpen(true)}
              className="min-h-[36px] flex items-center gap-1.5 px-2.5 py-1 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded text-xs text-blue-400 hover:text-blue-300 transition-colors cursor-pointer whitespace-nowrap"
            >
              📋 {t.savedTargetsTitle} ({savedTargets.filter(st => st.mapId === selectedMapId).length})
            </button>
          </nav>

          {/* Zone 3: Primary Action CTA */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleFireRound}
              disabled={!solution || !solution.inRange}
              className="min-h-[40px] px-3.5 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5"
            >
              <span>💥</span>
              <span>{lang === 'ar' ? 'أطلق قذيفة' : 'FIRE ROUND'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Top Navigation & Tab Bar (TASK 5) */}
      <div className="md:hidden border-b border-zinc-800 bg-zinc-900 px-3 py-2 shrink-0 flex items-center justify-between gap-2 overflow-x-auto">
        {/* Map dropdown on mobile */}
        <select
          value={selectedMapId}
          onChange={e => handleMapSwitch(e.target.value as MapId)}
          className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-xs text-emerald-400 font-semibold focus:outline-hidden"
        >
          <option value="everon">Everon (12.8km)</option>
          <option value="arland">Arland (4km)</option>
          <option value="kolguyev">Kolguyev (14km)</option>
        </select>

        {/* Mobile Tabs */}
        <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded p-0.5 text-xs">
          <button
            onClick={() => setMobileTab('map')}
            className={`min-h-[36px] px-2 py-1 rounded font-medium ${mobileTab === 'map' ? 'bg-zinc-800 text-emerald-400 font-bold' : 'text-zinc-400'}`}
          >
            🗺️ {t.tabMap}
          </button>
          <button
            onClick={() => setMobileTab('solution')}
            className={`min-h-[36px] px-2 py-1 rounded font-medium ${mobileTab === 'solution' ? 'bg-zinc-800 text-amber-400 font-bold' : 'text-zinc-400'}`}
          >
            🎯 {t.tabSolution}
          </button>
          <button
            onClick={() => setMobileTab('positions')}
            className={`min-h-[36px] px-2 py-1 rounded font-medium ${mobileTab === 'positions' ? 'bg-zinc-800 text-blue-400 font-bold' : 'text-zinc-400'}`}
          >
            ⚙️ {t.tabPositions}
          </button>
        </div>

        {/* Mobile quick controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setLang(l => (l === 'ar' ? 'en' : 'ar'))}
            className="min-h-[36px] px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-300"
          >
            {lang === 'ar' ? 'EN' : 'AR'}
          </button>
          <button
            onClick={() => setIsSavedTargetsOpen(true)}
            className="min-h-[36px] px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-xs text-blue-400"
          >
            📋
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <main className="max-w-7xl mx-auto w-full p-3 sm:p-4 lg:p-6 flex-1 flex flex-col gap-4 sm:gap-6">
        {/* Solution Primary Readout Header Card (always visible on desktop, tabbed on mobile) */}
        <div className={`p-4 rounded-xl border transition-all ${
          mobileTab !== 'solution' ? 'hidden md:block' : 'block'
        } ${
          !solution
            ? 'bg-zinc-900/60 border-zinc-800 text-zinc-400'
            : solution.inRange
            ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200 shadow-lg shadow-emerald-950/20'
            : 'bg-red-950/30 border-red-500/40 text-red-200'
        }`}>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${
                !solution ? 'bg-zinc-600' : solution.inRange ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'
              }`} />
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-200 font-mono">
                {t.solutionTitle}
              </h2>
              {solution && (
                <span className="text-xs text-zinc-400 font-sans">
                  — {solution.inRange ? t.readyToFire : (solution.isTooClose ? t.targetTooClose : t.targetOutOfRange)}
                </span>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyMission}
                disabled={!solution}
                className="min-h-[36px] px-3 py-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium text-zinc-200 rounded border border-zinc-700 transition-colors cursor-pointer"
              >
                {copiedSuccess ? (lang === 'ar' ? '✓ تم النسخ' : '✓ Copied!') : t.copyMissionCard}
              </button>
              <button
                onClick={handleAutoCharge}
                disabled={!solution}
                className="min-h-[36px] px-3 py-1 bg-emerald-800 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium text-emerald-100 rounded border border-emerald-600 transition-colors cursor-pointer"
              >
                ⚡ {t.autoCharge}
              </button>
            </div>
          </div>

          {/* Solution Primary Readout Gauges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Azimuth / Bearing */}
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-lg p-2.5">
              <div className="text-[11px] font-medium text-zinc-400 mb-0.5">{t.bearing}</div>
              <div className="text-xl font-bold font-mono text-amber-400 tabular-nums">
                {formattedBearing.primary}
              </div>
              <div className="text-[10px] font-mono text-zinc-500 mt-0.5">
                {formattedBearing.secondary}
              </div>
            </div>

            {/* Elevation */}
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-lg p-2.5">
              <div className="text-[11px] font-medium text-zinc-400 mb-0.5">{t.elevation}</div>
              <div className="text-xl font-bold font-mono text-emerald-400 tabular-nums">
                {formattedElevation.primary}
              </div>
              <div className="text-[10px] font-mono text-zinc-500 mt-0.5">
                {formattedElevation.secondary} ({trajectoryArc === 'high' ? (lang === 'ar' ? 'مسار عالي' : 'High Arc') : (lang === 'ar' ? 'منخفض' : 'Low Arc')})
              </div>
            </div>

            {/* Distance */}
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-lg p-2.5">
              <div className="text-[11px] font-medium text-zinc-400 mb-0.5">{t.distance}</div>
              <div className="text-xl font-bold font-mono text-zinc-100 tabular-nums">
                {solution ? `${solution.distance.toFixed(0)}m` : '---'}
              </div>
              <div className="text-[10px] font-mono text-zinc-500 mt-0.5">
                {solution ? `${(solution.distance / 1000).toFixed(2)} km` : '---'}
              </div>
            </div>

            {/* Time of Flight (TOF) */}
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-lg p-2.5">
              <div className="text-[11px] font-medium text-zinc-400 mb-0.5">{t.timeOfFlight}</div>
              <div className="text-xl font-bold font-mono text-sky-400 tabular-nums">
                {solution && solution.inRange
                  ? `${(trajectoryArc === 'high' ? solution.highAngleTof : solution.lowAngleTof).toFixed(1)}s`
                  : '---'}
              </div>
              <div className="text-[10px] font-mono text-zinc-500 mt-0.5">
                {solution ? `CEP: ±${solution.dispersionRadius.toFixed(0)}m` : '---'}
              </div>
            </div>

            {/* Height Delta (ΔH) */}
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-lg p-2.5">
              <div className="text-[11px] font-medium text-zinc-400 mb-0.5">{t.elevationDiff}</div>
              <div className="text-xl font-bold font-mono text-zinc-200 tabular-nums">
                {solution ? `${solution.deltaH > 0 ? `+${solution.deltaH}` : solution.deltaH}m` : '---'}
              </div>
              <div className="text-[10px] font-mono text-zinc-500 mt-0.5">
                Slant: {solution ? `${solution.slantDistance.toFixed(0)}m` : '---'}
              </div>
            </div>

            {/* Active Shell & Charge */}
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-lg p-2.5">
              <div className="text-[11px] font-medium text-zinc-400 mb-0.5">{t.chargeLevel}</div>
              <div className="text-xl font-bold font-mono text-indigo-400 tabular-nums">
                CHG {activeProfile.charge}
              </div>
              <div className="text-[10px] font-mono text-zinc-500 mt-0.5">
                Vel: {velocity} m/s
              </div>
            </div>
          </div>
        </div>

        {/* 2-Column Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Positions & Ballistics (visible in desktop or mobile 'positions' tab) */}
          <div className={`lg:col-span-5 space-y-4 ${mobileTab !== 'positions' ? 'hidden md:block' : 'block'}`}>
            {/* Battery & Target Grid Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
              {/* Battery (Mortar) Card */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-sm relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500"></span>
                    <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wide">
                      {t.batterySection}
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      setInteractionMode('mortar');
                      setMobileTab('map');
                    }}
                    className={`min-h-[36px] text-xs px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                      interactionMode === 'mortar'
                        ? 'bg-red-600 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {lang === 'ar' ? 'تحديد بالخريطة' : 'Set on Map'}
                  </button>
                </div>

                {/* Preset Landmark Picker */}
                <select
                  value=""
                  onChange={e => {
                    const lm = currentMap.landmarks.find(l => l.name === e.target.value);
                    if (lm) {
                      setMortar({ x: lm.x, y: lm.y, alt: lm.alt, name: lm.name, isVerified: lm.isVerified });
                    }
                  }}
                  className="w-full min-h-[40px] bg-zinc-950 border border-zinc-700/80 rounded px-2.5 py-1.5 text-xs text-zinc-200 mb-3 focus:outline-hidden focus:border-red-500 cursor-pointer"
                >
                  <option value="">{t.chooseLocation}</option>
                  {currentMap.landmarks.map(lm => (
                    <option key={lm.name} value={lm.name}>
                      {lang === 'ar' && lm.nameAr ? lm.nameAr : lm.name} ({meterToGrid4(lm.x)}-{meterToGrid4(lm.y)} · {lm.alt}m)
                    </option>
                  ))}
                </select>

                {/* Coordinate Grid Inputs */}
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <div>
                    <label className="text-[10px] text-zinc-400 font-mono block mb-1">
                      {t.easting}
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="XXXX"
                      value={mortarXInput}
                      onChange={e => setMortarXInput(e.target.value)}
                      onBlur={handleMortarGridSubmit}
                      onKeyDown={e => e.key === 'Enter' && handleMortarGridSubmit()}
                      className="w-full min-h-[40px] bg-zinc-950 border border-zinc-700/80 rounded px-2 py-1.5 text-xs font-mono text-center text-zinc-100 focus:outline-hidden focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 font-mono block mb-1">
                      {t.northing}
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="YYYY"
                      value={mortarYInput}
                      onChange={e => setMortarYInput(e.target.value)}
                      onBlur={handleMortarGridSubmit}
                      onKeyDown={e => e.key === 'Enter' && handleMortarGridSubmit()}
                      className="w-full min-h-[40px] bg-zinc-950 border border-zinc-700/80 rounded px-2 py-1.5 text-xs font-mono text-center text-zinc-100 focus:outline-hidden focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 font-mono block mb-1">
                      {t.altitude}
                    </label>
                    <input
                      type="number"
                      value={mortar.alt}
                      onChange={e => setMortar(prev => ({ ...prev, alt: parseFloat(e.target.value) || 0 }))}
                      className="w-full min-h-[40px] bg-zinc-950 border border-zinc-700/80 rounded px-2 py-1.5 text-xs font-mono text-center text-zinc-100 focus:outline-hidden focus:border-red-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-2">
                  <span className="font-mono text-[11px]">
                    X: {mortar.x.toFixed(0)}m, Y: {mortar.y.toFixed(0)}m
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowMortarKeypad(s => !s)}
                    className="min-h-[36px] text-xs text-zinc-400 hover:text-white underline cursor-pointer"
                  >
                    {t.subgridKeypad}
                  </button>
                </div>

                {showMortarKeypad && (
                  <div className="mt-2 pt-2 border-t border-zinc-800">
                    <NumpadSubgrid
                      onSelectKeypad={handleMortarSubgrid}
                      lang={lang}
                      label={lang === 'ar' ? 'تعديل مربع الهاون' : 'Fine-tune Mortar Grid'}
                    />
                  </div>
                )}
              </div>

              {/* Quick Actions (Swap & Clear) */}
              <div className="flex items-center justify-between gap-2 py-1">
                <button
                  onClick={handleSwap}
                  className="flex-1 min-h-[40px] py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-medium text-zinc-300 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>⇄</span>
                  <span>{t.swapPositions}</span>
                </button>
                <button
                  onClick={handleClear}
                  className="min-h-[40px] px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-medium text-zinc-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                >
                  {t.clearAll}
                </button>
              </div>

              {/* Fire Mission Target Card */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-sm relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                    <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wide">
                      {t.targetSection}
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      setInteractionMode('target');
                      setMobileTab('map');
                    }}
                    className={`min-h-[36px] text-xs px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                      interactionMode === 'target'
                        ? 'bg-blue-600 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {lang === 'ar' ? 'تحديد بالخريطة' : 'Set on Map'}
                  </button>
                </div>

                {/* Preset Landmark Picker */}
                <select
                  value=""
                  onChange={e => {
                    const lm = currentMap.landmarks.find(l => l.name === e.target.value);
                    if (lm) {
                      setTarget({ x: lm.x, y: lm.y, alt: lm.alt, name: lm.name, isVerified: lm.isVerified });
                    }
                  }}
                  className="w-full min-h-[40px] bg-zinc-950 border border-zinc-700/80 rounded px-2.5 py-1.5 text-xs text-zinc-200 mb-3 focus:outline-hidden focus:border-blue-500 cursor-pointer"
                >
                  <option value="">{t.chooseLocation}</option>
                  {currentMap.landmarks.map(lm => (
                    <option key={lm.name} value={lm.name}>
                      {lang === 'ar' && lm.nameAr ? lm.nameAr : lm.name} ({meterToGrid4(lm.x)}-{meterToGrid4(lm.y)} · {lm.alt}m)
                    </option>
                  ))}
                </select>

                {/* Coordinate Grid Inputs */}
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <div>
                    <label className="text-[10px] text-zinc-400 font-mono block mb-1">
                      {t.easting}
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="XXXX"
                      value={targetXInput}
                      onChange={e => setTargetXInput(e.target.value)}
                      onBlur={handleTargetGridSubmit}
                      onKeyDown={e => e.key === 'Enter' && handleTargetGridSubmit()}
                      className="w-full min-h-[40px] bg-zinc-950 border border-zinc-700/80 rounded px-2 py-1.5 text-xs font-mono text-center text-zinc-100 focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 font-mono block mb-1">
                      {t.northing}
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="YYYY"
                      value={targetYInput}
                      onChange={e => setTargetYInput(e.target.value)}
                      onBlur={handleTargetGridSubmit}
                      onKeyDown={e => e.key === 'Enter' && handleTargetGridSubmit()}
                      className="w-full min-h-[40px] bg-zinc-950 border border-zinc-700/80 rounded px-2 py-1.5 text-xs font-mono text-center text-zinc-100 focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 font-mono block mb-1">
                      {t.altitude}
                    </label>
                    <input
                      type="number"
                      value={target.alt}
                      onChange={e => setTarget(prev => ({ ...prev, alt: parseFloat(e.target.value) || 0 }))}
                      className="w-full min-h-[40px] bg-zinc-950 border border-zinc-700/80 rounded px-2 py-1.5 text-xs font-mono text-center text-zinc-100 focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-2">
                  <span className="font-mono text-[11px]">
                    X: {target.x.toFixed(0)}m, Y: {target.y.toFixed(0)}m
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowTargetKeypad(s => !s)}
                    className="min-h-[36px] text-xs text-zinc-400 hover:text-white underline cursor-pointer"
                  >
                    {t.subgridKeypad}
                  </button>
                </div>

                {showTargetKeypad && (
                  <div className="mt-2 pt-2 border-t border-zinc-800">
                    <NumpadSubgrid
                      onSelectKeypad={handleTargetSubgrid}
                      lang={lang}
                      label={lang === 'ar' ? 'تعديل مربع الهدف' : 'Fine-tune Target Grid'}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Ballistics Profile & Parameters Box */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wide">
                  {t.ballisticsTitle}
                </h3>
                {/* Arc Toggle */}
                <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded p-0.5 text-[11px]">
                  <button
                    onClick={() => setTrajectoryArc('high')}
                    className={`min-h-[32px] px-2 py-0.5 rounded transition-colors cursor-pointer ${
                      trajectoryArc === 'high' ? 'bg-zinc-800 text-emerald-400 font-semibold' : 'text-zinc-400'
                    }`}
                  >
                    {t.highArc}
                  </button>
                  <button
                    onClick={() => setTrajectoryArc('low')}
                    className={`min-h-[32px] px-2 py-0.5 rounded transition-colors cursor-pointer ${
                      trajectoryArc === 'low' ? 'bg-zinc-800 text-amber-400 font-semibold' : 'text-zinc-400'
                    }`}
                  >
                    {t.lowArc}
                  </button>
                </div>
              </div>

              {/* Weapon / Charge Preset Selector */}
              <div className="mb-3">
                <label className="text-[11px] text-zinc-400 block mb-1">
                  {t.presetSelect}
                </label>
                <select
                  value={selectedProfileIndex}
                  onChange={e => handleProfileChange(parseInt(e.target.value))}
                  className="w-full min-h-[40px] bg-zinc-950 border border-zinc-700/80 rounded px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
                >
                  {BALLISTIC_PROFILES.map((p, idx) => (
                    <option key={idx} value={idx}>
                      {lang === 'ar' ? p.nameAr : p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ballistic Numeric Adjustments */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">
                    {t.muzzleVel}
                  </label>
                  <input
                    type="number"
                    value={velocity}
                    onChange={e => setVelocity(parseFloat(e.target.value) || 0)}
                    className="w-full min-h-[36px] bg-zinc-950 border border-zinc-700/80 rounded px-2 py-1 text-zinc-100 font-mono text-center"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">
                    {t.gravity}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={gravity}
                    onChange={e => setGravity(parseFloat(e.target.value) || 9.81)}
                    className="w-full min-h-[36px] bg-zinc-950 border border-zinc-700/80 rounded px-2 py-1 text-zinc-100 font-mono text-center"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">
                    {t.minRange}
                  </label>
                  <input
                    type="number"
                    value={minRange}
                    onChange={e => setMinRange(parseFloat(e.target.value) || 0)}
                    className="w-full min-h-[36px] bg-zinc-950 border border-zinc-700/80 rounded px-2 py-1 text-zinc-100 font-mono text-center"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">
                    {t.maxRange}
                  </label>
                  <input
                    type="number"
                    value={maxRange}
                    onChange={e => setMaxRange(parseFloat(e.target.value) || 0)}
                    className="w-full min-h-[36px] bg-zinc-950 border border-zinc-700/80 rounded px-2 py-1 text-zinc-100 font-mono text-center"
                  />
                </div>
              </div>
            </div>

            {/* Active Splash Timers list */}
            <SplashTimer
              activeRounds={activeRounds}
              onRemoveRound={id => setActiveRounds(prev => prev.filter(r => r.id !== id))}
              onClearAll={() => setActiveRounds([])}
              lang={lang}
              muted={muted}
            />
          </div>

          {/* RIGHT COLUMN: Tactical Map & Trajectory Profile (visible in desktop or mobile 'map' tab) */}
          <div className={`lg:col-span-7 space-y-4 ${mobileTab !== 'map' ? 'hidden md:block' : 'block'}`}>
            {/* Real Map Canvas with touch support */}
            <TacticalMap
              mapData={currentMap}
              mortar={mortar}
              target={target}
              solution={solution}
              onSetMortar={setMortar}
              onSetTarget={setTarget}
              interactionMode={interactionMode}
              onSelectInteractionMode={setInteractionMode}
              drawings={drawings}
              onAddDrawing={handleAddDrawing}
              onClearDrawings={handleClearDrawings}
              lang={lang}
              minRange={minRange}
              maxRange={maxRange}
            />

            {/* 2D Trajectory Cross-Section View */}
            <TrajectoryProfile
              mortar={mortar}
              target={target}
              solution={solution}
              velocity={velocity}
              gravity={gravity}
              lang={lang}
              arcType={trajectoryArc}
            />
          </div>
        </div>
      </main>

      {/* Target Reference Points (TRP) Modal */}
      <SavedTargetsModal
        isOpen={isSavedTargetsOpen}
        onClose={() => setIsSavedTargetsOpen(false)}
        savedTargets={savedTargets.filter(st => st.mapId === selectedMapId || !st.mapId)}
        onSelectTarget={handleSelectSavedTarget}
        onDeleteTarget={handleDeleteSavedTarget}
        onSaveCurrentTarget={handleSaveCurrentTarget}
        currentTarget={target}
        lang={lang}
      />

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950/80 px-4 sm:px-6 py-4 mt-8 text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-start">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span>Arma Reforger Mortar Calculator</span>
            <span>·</span>
            <span>Everon · Arland · Kolguyev</span>
            <span>·</span>
            <a href="https://reforger.recoil.org/" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:underline">
              reforger.recoil.org
            </a>
          </div>
          <div className="text-[11px] text-zinc-600">
            {lang === 'ar' ? 'أداة بالستية تكتيكية موثوقة' : 'Verified tactical ballistics & mapping for Arma Reforger'}
          </div>
        </div>
      </footer>
    </div>
  );
}
