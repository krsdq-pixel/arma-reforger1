export type Language = 'ar' | 'en';
export type MilSystem = 'nato' | 'soviet' | 'deg';
export type TrajectoryArc = 'high' | 'low';
export type MapId = 'everon' | 'arland' | 'kolguyev';
export type InteractionMode = 'mortar' | 'target' | 'measure' | 'view' | 'draw_line' | 'draw_circle' | 'draw_point';

export interface Coordinates {
  x: number; // In meters (0 to map size)
  y: number; // In meters (0 to map size)
  alt: number; // Altitude above sea level in meters
  name?: string;
  isVerified?: boolean;
}

export interface Landmark {
  name: string;
  nameAr?: string;
  x: number;
  y: number;
  alt: number;
  type?: 'town' | 'military' | 'coastal' | 'industrial' | 'beacon' | 'landmark';
  isVerified: boolean;
}

export interface BallisticProfile {
  name: string;
  nameAr: string;
  weapon: 'M252_81mm' | '2B14_82mm' | 'custom';
  charge: number; // 0, 1, 2, 3, 4
  velocity: number; // m/s
  gravity: number; // m/s^2 (default 9.81)
  minRange: number; // meters
  maxRange: number; // meters
  caliber: string;
  faction: 'NATO' | 'WARSAW' | 'CUSTOM';
}

export interface CalculationResult {
  distance: number; // 2D horizontal distance in meters
  slantDistance: number; // 3D distance including elevation difference
  azimuthDeg: number; // 0-360 degrees
  azimuthMilNato: number; // 0-6400 mils
  azimuthMilSoviet: number; // 0-6000 mils
  deltaH: number; // Target alt - Mortar alt in meters
  
  // High arc (standard mortar fire)
  highAngleRad: number;
  highAngleDeg: number;
  highAngleMilNato: number;
  highAngleMilSoviet: number;
  highAngleTof: number; // seconds
  highApexAlt: number; // meters AMSL
  
  // Low arc (direct/assault fire)
  lowAngleRad: number;
  lowAngleDeg: number;
  lowAngleMilNato: number;
  lowAngleMilSoviet: number;
  lowAngleTof: number;
  lowApexAlt: number;
  
  // Status
  inRange: boolean;
  isTooClose: boolean;
  isTooFar: boolean;
  discriminant: number;
  errorMessage?: string;
  errorMessageAr?: string;
  
  // Dispersion estimate (approx 0.5% of range at optimal charge)
  dispersionRadius: number;
}

export interface SavedTarget {
  id: string;
  name: string;
  mapId: MapId;
  x: number;
  y: number;
  alt: number;
  notes?: string;
  timestamp: number;
}

export interface ActiveRound {
  id: string;
  targetName: string;
  fireTime: number;
  impactTime: number;
  tof: number;
  charge: number;
  bearing: number;
  elevation: number;
  hasSplashed: boolean;
}

export interface TacticalDrawing {
  id: string;
  mapId: MapId;
  type: 'line' | 'circle' | 'point' | 'text';
  color: string;
  points: [number, number][]; // coordinates in meters
  radius?: number; // for circle (meters)
  label?: string;
  timestamp: number;
}

export interface MapDiagnosticInfo {
  mapId: MapId;
  sourceUrl: string;
  status: 'idle' | 'loading' | 'loaded' | 'error';
  tilesLoadedCount: number;
  tilesErrorCount: number;
  errorMessage?: string;
  officialUrl: string;
  sourceCredit: string;
  resolution: string;
  gridExtents: string;
}
