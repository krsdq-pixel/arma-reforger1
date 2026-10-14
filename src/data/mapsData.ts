import { Landmark, BallisticProfile, MapId } from '../types/mortar';

export interface MapData {
  id: MapId;
  name: string;
  nameAr: string;
  size: number; // in meters (width and height)
  defaultCenter: [number, number];
  overviewUrl: string; // Verified real overview image
  tileTemplateUrl: string; // Verified tile template URL
  serverMaxZoom: number; // Base server zoom level (5 for all maps)
  nativeMaxZoom: number; // Highest zoom level with real tiles available
  maxZoom: number; // Max allowable user zoom (overscaled smoothly)
  minZoom: number; // Overview zoom level (0)
  initialZoom: number; // Initial zoom level for optimal viewing
  officialUrl: string;
  sourceCredit: string;
  landmarks: Landmark[];
}

// 35 Canonical Everon Locations extracted from Enfusion World Editor (Verified)
export const EVERON_LOCATIONS: Landmark[] = [
  { name: "Airport", nameAr: "المطار العسكري", x: 4893.46, y: 11800.709, alt: 18, type: 'military', isVerified: true },
  { name: "St Phillipe", nameAr: "سان فيليب", x: 4500.872, y: 10776.053, alt: 42, type: 'town', isVerified: true },
  { name: "Power Plant", nameAr: "محطة الطاقة", x: 5826.642, y: 9786.735, alt: 25, type: 'industrial', isVerified: true },
  { name: "St Pierre", nameAr: "سان بيير", x: 9689.432, y: 1558.166, alt: 35, type: 'town', isVerified: true },
  { name: "Meaux", nameAr: "موكس", x: 4517.52, y: 9467.668, alt: 95, type: 'town', isVerified: true },
  { name: "Tyrone", nameAr: "تايرون", x: 4948.837, y: 9075.68, alt: 105, type: 'town', isVerified: true },
  { name: "Andres Beacon", nameAr: "قمة أندريس", x: 6843.832, y: 8191.218, alt: 198, type: 'beacon', isVerified: true },
  { name: "Gravette", nameAr: "غرافيت", x: 4128.282, y: 7792.364, alt: 60, type: 'town', isVerified: true },
  { name: "Villeneuve", nameAr: "فيلنوف", x: 2847.008, y: 6339.848, alt: 30, type: 'town', isVerified: true },
  { name: "Morton", nameAr: "مورتون", x: 5137.254, y: 4009.941, alt: 65, type: 'town', isVerified: true },
  { name: "Lamentin", nameAr: "لامانتين", x: 1281.055, y: 5946.839, alt: 12, type: 'town', isVerified: true },
  { name: "Chotain", nameAr: "شوتين", x: 7087.74, y: 6011.904, alt: 38, type: 'town', isVerified: true },
  { name: "Montignac", nameAr: "مونتينياك", x: 4775.641, y: 7086.945, alt: 75, type: 'town', isVerified: true },
  { name: "Entre Deux", nameAr: "أنتر دو", x: 5760.571, y: 7061.821, alt: 85, type: 'town', isVerified: true },
  { name: "Provins", nameAr: "بروفينس", x: 5488.17, y: 6083.411, alt: 80, type: 'town', isVerified: true },
  { name: "Figari", nameAr: "فيغاري", x: 5256.366, y: 5341.263, alt: 62, type: 'town', isVerified: true },
  { name: "Camurac", nameAr: "كاموراك", x: 6594.162, y: 3116.684, alt: 45, type: 'town', isVerified: true },
  { name: "Quarry", nameAr: "المقلع الحجري", x: 8786.965, y: 3913.078, alt: 90, type: 'industrial', isVerified: true },
  { name: "Regina", nameAr: "ريجينا", x: 7188.38, y: 2312.382, alt: 85, type: 'town', isVerified: true },
  { name: "Durras", nameAr: "دوراس", x: 8826.12, y: 2746.123, alt: 50, type: 'town', isVerified: true },
  { name: "Levie", nameAr: "ليفي", x: 7456.592, y: 4737.094, alt: 140, type: 'town', isVerified: true },
  { name: "Kermovan", nameAr: "كيرموفان", x: 6359.376, y: 9668.684, alt: 55, type: 'town', isVerified: true },
  { name: "Farm", nameAr: "المزرعة المركزية", x: 5009.537, y: 9964.422, alt: 70, type: 'landmark', isVerified: true },
  { name: "Gorey", nameAr: "غوري", x: 4844.906, y: 8088.995, alt: 72, type: 'town', isVerified: true },
  { name: "Sawmill", nameAr: "المغسلة والمغارة", x: 3114.358, y: 5221.5, alt: 40, type: 'industrial', isVerified: true },
  { name: "Chotain Industrial", nameAr: "المنطقة الصناعية شوتين", x: 6455.525, y: 6487.396, alt: 48, type: 'industrial', isVerified: true },
  { name: "Hillside", nameAr: "التلال المشرفة", x: 6918, y: 4450, alt: 165, type: 'beacon', isVerified: true },
  { name: "Coastal Base Chotain", nameAr: "القاعدة الساحلية شوتين", x: 7444.065, y: 6697.595, alt: 10, type: 'military', isVerified: true },
  { name: "Military Base Levie", nameAr: "قاعدة ليفي العسكرية", x: 7476.739, y: 4301.884, alt: 155, type: 'military', isVerified: true },
  { name: "Military Hospital", nameAr: "المستشفى العسكري", x: 3904.698, y: 8450.042, alt: 68, type: 'military', isVerified: true },
  { name: "Coastal Base Lamentin", nameAr: "القاعدة الساحلية لامانتين", x: 1062.89, y: 6047.846, alt: 8, type: 'military', isVerified: true },
  { name: "Coastal Base Morton", nameAr: "القاعدة الساحلية مورتون", x: 4956.796, y: 3875.627, alt: 12, type: 'military', isVerified: true },
  { name: "Old Wood", nameAr: "الغابة القديمة", x: 3293.234, y: 4488.741, alt: 125, type: 'landmark', isVerified: true },
  { name: "Morton Valley", nameAr: "وادي مورتون", x: 4517.589, y: 4967.065, alt: 62, type: 'landmark', isVerified: true },
  { name: "Laruns", nameAr: "لارونس", x: 7429.288, y: 5318.843, alt: 95, type: 'town', isVerified: true }
];

// Arland Verified Locations
export const ARLAND_LOCATIONS: Landmark[] = [
  { name: "Arland Airfield", nameAr: "مطار أرلاند", x: 1840, y: 2480, alt: 15, type: 'military', isVerified: true },
  { name: "Beauregard", nameAr: "بوريغارد", x: 1350, y: 1920, alt: 35, type: 'town', isVerified: true },
  { name: "Military Camp", nameAr: "المعسكر العسكري", x: 1050, y: 2450, alt: 22, type: 'military', isVerified: true },
  { name: "Port Arland", nameAr: "ميناء أرلاند", x: 2100, y: 1300, alt: 5, type: 'coastal', isVerified: true },
  { name: "Ferry Terminal", nameAr: "محطة العبارة", x: 2400, y: 1150, alt: 8, type: 'coastal', isVerified: true },
  { name: "Radar Station", nameAr: "محطة الرادار", x: 2300, y: 3400, alt: 95, type: 'military', isVerified: true },
  { name: "Quarry", nameAr: "المقلع", x: 2600, y: 2600, alt: 60, type: 'industrial', isVerified: true },
  { name: "Relay Tower", nameAr: "برج الاتصالات", x: 1500, y: 3100, alt: 115, type: 'beacon', isVerified: true },
  { name: "North Lighthouse", nameAr: "المنارة الشمالية", x: 1700, y: 3750, alt: 20, type: 'coastal', isVerified: true },
  { name: "Arleville", nameAr: "أرليفيل", x: 3125.05, y: 2447.1, alt: 18, type: 'town', isVerified: true }
];

// Kolguyev (Cain in Enfusion engine) Verified Locations from Enfusion Engine dataset
export const KOLGUYEV_LOCATIONS: Landmark[] = [
  { name: "Michurino", nameAr: "ميتشورينو", x: 3799.76, y: 3718.5, alt: 45, type: 'town', isVerified: true },
  { name: "Udarnik", nameAr: "أودارنيك", x: 4451.66, y: 3490.73, alt: 35, type: 'town', isVerified: true },
  { name: "Airport (Kolguyev)", nameAr: "مطار كولغويف", x: 2745.125, y: 5102.995, alt: 15, type: 'military', isVerified: true },
  { name: "Ugoldar", nameAr: "أوغولدار", x: 6626.811, y: 3904.949, alt: 50, type: 'town', isVerified: true },
  { name: "Gorshkovo", nameAr: "غورشوكوفو", x: 8455.566, y: 6532.005, alt: 60, type: 'town', isVerified: true },
  { name: "Meglerone", nameAr: "ميغليرون", x: 9838.421, y: 9468.243, alt: 40, type: 'town', isVerified: true },
  { name: "Kamensk", nameAr: "كامنسك", x: 11781.32, y: 10595.245, alt: 25, type: 'town', isVerified: true },
  { name: "Komsomolsk", nameAr: "كومسومولسك", x: 8654.635, y: 10165.034, alt: 30, type: 'town', isVerified: true },
  { name: "Mineraly", nameAr: "مينيرالي", x: 6254.172, y: 8034.669, alt: 85, type: 'town', isVerified: true },
  { name: "Sosnovy Mys", nameAr: "سوسنوفي ميس", x: 4379.185, y: 8070.589, alt: 75, type: 'town', isVerified: true },
  { name: "Zenit Mine", nameAr: "منجم زينيت", x: 3680.419, y: 7689.542, alt: 110, type: 'industrial', isVerified: true },
  { name: "Hamertin", nameAr: "هامرتين", x: 3317.594, y: 6841.789, alt: 70, type: 'town', isVerified: true },
  { name: "Krasnyy Oktyabr Mine", nameAr: "منجم كراسني أوكتوبر", x: 3709.403, y: 5286.237, alt: 95, type: 'industrial', isVerified: true },
  { name: "Coal Harbor", nameAr: "ميناء الفحم", x: 7500, y: 4500, alt: 5, type: 'coastal', isVerified: true },
  { name: "Villa", nameAr: "الفيلا الرئاسية", x: 1950.65, y: 7371.3, alt: 65, type: 'landmark', isVerified: true },
  { name: "Pyritka", nameAr: "بيريتكا", x: 4696.11, y: 7028.12, alt: 80, type: 'town', isVerified: true }
];

export const MAPS: Record<MapId, MapData> = {
  everon: {
    id: 'everon',
    name: 'Everon',
    nameAr: 'إيفيرون (Everon)',
    size: 12800,
    defaultCenter: [6400, 6400],
    overviewUrl: 'https://reforger.recoil.org/everon-512.jpg',
    tileTemplateUrl: 'https://reforger.recoil.org/map-tiles/everon/{z}/{x}/{y}/tile.jpg',
    serverMaxZoom: 5,
    nativeMaxZoom: 5,
    maxZoom: 7,
    minZoom: 0,
    initialZoom: 0,
    officialUrl: 'https://reforger.recoil.org/everon/',
    sourceCredit: 'EnfusionMapMaker by Nick Ludlam / Bohemia Interactive',
    landmarks: EVERON_LOCATIONS
  },
  arland: {
    id: 'arland',
    name: 'Arland',
    nameAr: 'أرلاند (Arland)',
    size: 4000,
    defaultCenter: [2000, 2000],
    overviewUrl: 'https://reforger.recoil.org/arland-512.jpg',
    tileTemplateUrl: 'https://reforger.recoil.org/map-tiles/arland/{z}/{x}/{y}/tile.jpg',
    serverMaxZoom: 5,
    nativeMaxZoom: 5,
    maxZoom: 7,
    minZoom: 0,
    initialZoom: 1,
    officialUrl: 'https://reforger.recoil.org/arland/',
    sourceCredit: 'EnfusionMapMaker by Nick Ludlam / Bohemia Interactive',
    landmarks: ARLAND_LOCATIONS
  },
  kolguyev: {
    id: 'kolguyev',
    name: 'Kolguyev',
    nameAr: 'كولغويف (Kolguyev)',
    size: 14000,
    defaultCenter: [7000, 7000],
    overviewUrl: 'https://reforger.recoil.org/kolguyev-512.jpg',
    tileTemplateUrl: 'https://reforger.recoil.org/map-tiles/cain/{z}/{x}/{y}/tile.jpg',
    serverMaxZoom: 5,
    nativeMaxZoom: 4,
    maxZoom: 7,
    minZoom: 0,
    initialZoom: 0,
    officialUrl: 'https://reforger.recoil.org/kolguyev/',
    sourceCredit: 'EnfusionMapMaker by Nick Ludlam / Bohemia Interactive',
    landmarks: KOLGUYEV_LOCATIONS
  }
};

// Realistic Arma Reforger Ballistic Profiles (Verified Game Physics)
export const BALLISTIC_PROFILES: BallisticProfile[] = [
  // M252 81mm NATO Mortar
  {
    name: "M252 81mm - Charge 0 (Close 60-450m)",
    nameAr: "M252 81مم (ناتو) — شحنة 0 (60 إلى 450 م)",
    weapon: "M252_81mm",
    charge: 0,
    velocity: 70,
    gravity: 9.81,
    minRange: 60,
    maxRange: 480,
    caliber: "81mm",
    faction: "NATO"
  },
  {
    name: "M252 81mm - Charge 1 (Short 150-1400m)",
    nameAr: "M252 81مم (ناتو) — شحنة 1 (150 إلى 1400 م)",
    weapon: "M252_81mm",
    charge: 1,
    velocity: 140,
    gravity: 9.81,
    minRange: 150,
    maxRange: 1450,
    caliber: "81mm",
    faction: "NATO"
  },
  {
    name: "M252 81mm - Charge 2 (Medium 200-2400m) [Standard]",
    nameAr: "M252 81مم (ناتو) — شحنة 2 (200 إلى 2400 م) [الافتراضي]",
    weapon: "M252_81mm",
    charge: 2,
    velocity: 200,
    gravity: 9.81,
    minRange: 200,
    maxRange: 2400,
    caliber: "81mm",
    faction: "NATO"
  },
  {
    name: "M252 81mm - Charge 3 (Long 400-3800m)",
    nameAr: "M252 81مم (ناتو) — شحنة 3 (400 إلى 3800 م)",
    weapon: "M252_81mm",
    charge: 3,
    velocity: 250,
    gravity: 9.81,
    minRange: 400,
    maxRange: 3800,
    caliber: "81mm",
    faction: "NATO"
  },
  {
    name: "M252 81mm - Charge 4 (Max 600-5500m)",
    nameAr: "M252 81مم (ناتو) — شحنة 4 (600 إلى 5500 م)",
    weapon: "M252_81mm",
    charge: 4,
    velocity: 300,
    gravity: 9.81,
    minRange: 600,
    maxRange: 5500,
    caliber: "81mm",
    faction: "NATO"
  },

  // 2B14 Podnos 82mm Soviet/Warsaw Pact Mortar
  {
    name: "2B14 Podnos 82mm - Charge 0 (60-450m)",
    nameAr: "2B14 بودنس 82مم (سوفييتي) — شحنة 0",
    weapon: "2B14_82mm",
    charge: 0,
    velocity: 70.5,
    gravity: 9.81,
    minRange: 60,
    maxRange: 470,
    caliber: "82mm",
    faction: "WARSAW"
  },
  {
    name: "2B14 Podnos 82mm - Charge 1 (150-1350m)",
    nameAr: "2B14 بودنس 82مم (سوفييتي) — شحنة 1",
    weapon: "2B14_82mm",
    charge: 1,
    velocity: 135,
    gravity: 9.81,
    minRange: 150,
    maxRange: 1380,
    caliber: "82mm",
    faction: "WARSAW"
  },
  {
    name: "2B14 Podnos 82mm - Charge 2 (200-2400m) [Standard]",
    nameAr: "2B14 بودنس 82مم (سوفييتي) — شحنة 2 [الافتراضي]",
    weapon: "2B14_82mm",
    charge: 2,
    velocity: 200,
    gravity: 9.81,
    minRange: 200,
    maxRange: 2400,
    caliber: "82mm",
    faction: "WARSAW"
  },
  {
    name: "2B14 Podnos 82mm - Charge 3 (400-3800m)",
    nameAr: "2B14 بودنس 82مم (سوفييتي) — شحنة 3",
    weapon: "2B14_82mm",
    charge: 3,
    velocity: 252,
    gravity: 9.81,
    minRange: 400,
    maxRange: 3850,
    caliber: "82mm",
    faction: "WARSAW"
  },
  {
    name: "2B14 Podnos 82mm - Charge 4 (600-5500m)",
    nameAr: "2B14 بودنس 82مم (سوفييتي) — شحنة 4",
    weapon: "2B14_82mm",
    charge: 4,
    velocity: 298,
    gravity: 9.81,
    minRange: 600,
    maxRange: 5500,
    caliber: "82mm",
    faction: "WARSAW"
  }
];
