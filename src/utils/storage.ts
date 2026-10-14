import { Coordinates, MapId, SavedTarget, TacticalDrawing, MilSystem, TrajectoryArc, Language } from '../types/mortar';

const STORAGE_PREFIX = 'reforger_mortar_v2_';

export interface PersistedAppState {
  selectedMapId?: MapId;
  mortar?: Coordinates;
  target?: Coordinates;
  savedTargets?: SavedTarget[];
  drawings?: TacticalDrawing[];
  profileIndex?: number;
  customBallistics?: {
    velocity: number;
    gravity: number;
    minRange: number;
    maxRange: number;
  };
  settings?: {
    lang: Language;
    milSystem: MilSystem;
    trajectoryArc: TrajectoryArc;
    muted: boolean;
  };
}

export function loadPersistedState(): PersistedAppState {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}state`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Failed to load persisted state from localStorage:', err);
  }
  return {};
}

export function savePersistedState(partialState: Partial<PersistedAppState>): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = loadPersistedState();
    const updated = { ...existing, ...partialState };
    localStorage.setItem(`${STORAGE_PREFIX}state`, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to save state to localStorage:', err);
  }
}

export function clearPersistedState(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}state`);
  } catch (err) {
    console.warn('Failed to clear state from localStorage:', err);
  }
}
