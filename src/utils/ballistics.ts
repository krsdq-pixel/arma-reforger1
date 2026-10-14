import { Coordinates, CalculationResult, BallisticProfile } from '../types/mortar';

/**
 * Calculates ballistics from battery (mortar) to target
 */
export function calculateBallistics(
  mortar: Coordinates,
  target: Coordinates,
  profile: {
    velocity: number;
    gravity: number;
    minRange: number;
    maxRange: number;
  }
): CalculationResult {
  const dx = target.x - mortar.x;
  const dy = target.y - mortar.y;
  const distance = Math.hypot(dx, dy); // 2D horizontal distance in meters
  const deltaH = target.alt - mortar.alt; // Elevation delta (meters)
  const slantDistance = Math.hypot(distance, deltaH);

  // Azimuth (degrees): 0 = North, 90 = East, 180 = South, 270 = West
  let azDeg = Math.atan2(dx, dy) * (180 / Math.PI);
  if (azDeg < 0) azDeg += 360;

  const azimuthMilNato = (azDeg * 6400) / 360;
  const azimuthMilSoviet = (azDeg * 6000) / 360;

  const v = profile.velocity;
  const g = profile.gravity;
  const minRange = profile.minRange;
  const maxRange = profile.maxRange;

  // Ballistic discriminant: v^4 - g * (g * d^2 + 2 * deltaH * v^2)
  const disc = Math.pow(v, 4) - g * (g * Math.pow(distance, 2) + 2 * deltaH * Math.pow(v, 2));

  let inRange = true;
  let isTooClose = false;
  let isTooFar = false;
  let errorMessage: string | undefined;
  let errorMessageAr: string | undefined;

  if (distance < minRange) {
    inRange = false;
    isTooClose = true;
    errorMessage = `Target is too close (Min range: ${minRange}m)`;
    errorMessageAr = `الهدف قريب جداً (أقل مدى: ${minRange}م)`;
  } else if (distance > maxRange || disc < 0) {
    inRange = false;
    isTooFar = true;
    errorMessage = `Target is out of maximum range (Max: ${maxRange}m)`;
    errorMessageAr = `الهدف خارج أقصى مدى للقذيفة (أقصى مدى: ${maxRange}م)`;
  } else if (distance === 0) {
    inRange = false;
    errorMessage = "Mortar and target coordinates are identical";
    errorMessageAr = "موقع الهاون والهدف متطابقان";
  }

  // Calculate angles if mathematically possible
  let highAngleRad = Math.PI / 4; // fallback 45 deg
  let lowAngleRad = Math.PI / 4;
  let highAngleTof = 0;
  let lowAngleTof = 0;
  let highApexAlt = mortar.alt;
  let lowApexAlt = mortar.alt;

  if (disc >= 0 && distance > 0) {
    const sqrtDisc = Math.sqrt(disc);
    
    // High arc (standard mortar trajectory)
    const tanHigh = (v * v + sqrtDisc) / (g * distance);
    highAngleRad = Math.atan(tanHigh);
    
    // Low arc (direct flat fire)
    const tanLow = (v * v - sqrtDisc) / (g * distance);
    lowAngleRad = Math.atan(tanLow);

    // Time of flight: t = d / (v * cos(theta))
    const cosHigh = Math.cos(highAngleRad);
    if (cosHigh > 0.0001) {
      highAngleTof = distance / (v * cosHigh);
    }
    const cosLow = Math.cos(lowAngleRad);
    if (cosLow > 0.0001) {
      lowAngleTof = distance / (v * cosLow);
    }

    // Apex altitude = mortar.alt + (v * sin(theta))^2 / (2 * g)
    const vYHigh = v * Math.sin(highAngleRad);
    highApexAlt = mortar.alt + (vYHigh * vYHigh) / (2 * g);

    const vYLow = v * Math.sin(lowAngleRad);
    lowApexAlt = mortar.alt + (vYLow * vYLow) / (2 * g);
  }

  // Convert to Mils & Degrees
  const highAngleDeg = highAngleRad * (180 / Math.PI);
  const highAngleMilNato = (highAngleRad * 6400) / (2 * Math.PI);
  const highAngleMilSoviet = (highAngleRad * 6000) / (2 * Math.PI);

  const lowAngleDeg = lowAngleRad * (180 / Math.PI);
  const lowAngleMilNato = (lowAngleRad * 6400) / (2 * Math.PI);
  const lowAngleMilSoviet = (lowAngleRad * 6000) / (2 * Math.PI);

  // Approximate circular error probable (CEP) dispersion: ~0.4% to 0.7% of range
  const dispersionRadius = Math.max(8, distance * 0.0055);

  return {
    distance,
    slantDistance,
    azimuthDeg: azDeg,
    azimuthMilNato,
    azimuthMilSoviet,
    deltaH,
    highAngleRad,
    highAngleDeg,
    highAngleMilNato,
    highAngleMilSoviet,
    highAngleTof,
    highApexAlt,
    lowAngleRad,
    lowAngleDeg,
    lowAngleMilNato,
    lowAngleMilSoviet,
    lowAngleTof,
    lowApexAlt,
    inRange,
    isTooClose,
    isTooFar,
    discriminant: disc,
    errorMessage,
    errorMessageAr,
    dispersionRadius
  };
}

/**
 * Format a coordinate component in meters to 4-digit grid string (e.g. 4893m -> "0489")
 * Each unit represents 10 meters in Arma Reforger 8-digit grid standard
 */
export function meterToGrid4(val: number): string {
  const gridVal = Math.max(0, Math.round(val / 10));
  return String(gridVal).padStart(4, '0');
}

/**
 * Parse a 4-digit grid string back to meters
 */
export function grid4ToMeter(str: string): number {
  const num = parseFloat(str);
  if (isNaN(num)) return 0;
  return num * 10;
}

/**
 * Generate discrete points along the flight trajectory for 2D profile rendering
 */
export function generateTrajectoryPoints(
  mortarAlt: number,
  targetAlt: number,
  distance: number,
  thetaRad: number,
  v: number,
  g: number,
  numSteps: number = 50
): { x: number; y: number; t: number }[] {
  if (distance <= 0) return [];
  
  const vx = v * Math.cos(thetaRad);
  const vy = v * Math.sin(thetaRad);
  const totalT = distance / vx;
  
  const points: { x: number; y: number; t: number }[] = [];
  
  for (let i = 0; i <= numSteps; i++) {
    const fraction = i / numSteps;
    const t = fraction * totalT;
    const x = fraction * distance;
    // Ballistic formula with gravity
    const y = mortarAlt + vy * t - 0.5 * g * t * t;
    points.push({ x, y, t });
  }

  // Ensure last point hits exact target altitude for drawing precision
  if (points.length > 0) {
    points[points.length - 1].y = targetAlt;
  }

  return points;
}

/**
 * Automatically determine the best mortar charge level (0-4) for a given distance
 */
export function findBestCharge(
  distance: number,
  deltaH: number,
  profiles: BallisticProfile[]
): BallisticProfile | null {
  // Filter only profiles where target is comfortably within [minRange, maxRange]
  const valid = profiles.filter(p => {
    const disc = Math.pow(p.velocity, 4) - p.gravity * (p.gravity * Math.pow(distance, 2) + 2 * deltaH * Math.pow(p.velocity, 2));
    return distance >= p.minRange + 30 && distance <= p.maxRange - 50 && disc >= 0;
  });

  if (valid.length === 0) {
    // If no safe margin, try any that can reach
    const possible = profiles.filter(p => {
      const disc = Math.pow(p.velocity, 4) - p.gravity * (p.gravity * Math.pow(distance, 2) + 2 * deltaH * Math.pow(p.velocity, 2));
      return distance >= p.minRange && distance <= p.maxRange && disc >= 0;
    });
    return possible[0] || null;
  }

  // Choose the one that yields the highest angle (closest to 1100-1300 mils, standard steep plunging fire)
  return valid[0];
}

/**
 * Numpad 1-9 subgrid offset (e.g. 1 is SW, 5 is center, 9 is NE in 100m square)
 */
export function applyKeypadOffset(baseMeters: number, keypadNum: number, axis: 'x' | 'y'): number {
  // 100m grid square divided into 3x3 (approx 33.3m each)
  // Keypad layout:
  // 7 8 9
  // 4 5 6
  // 1 2 3
  const col = ((keypadNum - 1) % 3); // 0, 1, 2 (West, Center, East)
  const row = Math.floor((keypadNum - 1) / 3); // 0, 1, 2 (South, Center, North)

  const offsetX = (col - 1) * 33.33;
  const offsetY = (row - 1) * 33.33;

  return axis === 'x' ? baseMeters + offsetX : baseMeters + offsetY;
}
