export const translations = {
  ar: {
    appTitle: "حاسبة الهاون — أرما ريفورجر",
    subtitle: "نظام التوجيه والرمي المدفعي التكتيكي — إيفيرون، أرلاند، وكولغويف",
    mapEveron: "إيفيرون (Everon - 12.8 كم)",
    mapArland: "أرلاند (Arland - 4 كم)",
    mapKolguyev: "كولغويف (Kolguyev - 14 كم)",
    
    // Header & Controls
    selectMap: "الخريطة",
    language: "اللغة",
    milFormat: "نظام الميل",
    natoMil: "مستكشف ناتو (6400 ميل)",
    sovietMil: "مدفعي سوفييتي (6000 ميل)",
    degrees: "الدرجات (360°)",
    audioMute: "الصوت",
    audioOn: "مفعّل",
    audioOff: "مكتوم",
    
    // Mobile Navigation Tabs
    tabMap: "الخريطة التكتيكية",
    tabSolution: "حل الرمي",
    tabPositions: "المواقع والإعدادات",
    tabLogs: "الأهداف والمهمات",
    
    // Positions
    batterySection: "موقع الهاون (Firing Battery)",
    targetSection: "موقع الهدف (Fire Mission Target)",
    chooseLocation: "اختر موقعاً معلوماً…",
    easting: "الشرقيات (X)",
    northing: "الشماليات (Y)",
    altitude: "الارتفاع (م)",
    gridPlaceholder: "XXXX",
    subgridKeypad: "لوحة المربع الفرعي (Keypad 1-9)",
    
    // Interaction Buttons
    clickToSetMortar: "تحديد الهاون",
    clickToSetTarget: "تحديد الهدف",
    swapPositions: "تبديل الهاون والهدف",
    clearAll: "مسح الإحداثيات",
    centerMortar: "تمركز على الهاون",
    centerTarget: "تمركز على الهدف",
    fitMap: "عرض الخريطة كاملة",
    measureMode: "أداة قياس المسافة",
    
    // Tactical Drawings
    drawTool: "الرسم التكتيكي",
    drawLine: "خط تكتيكي",
    drawCircle: "دائرة خطر / قطاع",
    drawPoint: "نقطة اهتمام",
    clearDrawings: "مسح الرسومات",
    drawColor: "اللون",
    
    // Ballistics
    ballisticsTitle: "إعدادات القذيفة والشحنة",
    presetSelect: "المدفع والنوع",
    chargeLevel: "رقم الشحنة (Charge)",
    autoCharge: "اختيار الشحنة التلقائي",
    muzzleVel: "سرعة القذيفة (م/ث)",
    gravity: "الجاذبية (م/ث²)",
    minRange: "أدنى مدى (م)",
    maxRange: "أقصى مدى (م)",
    trajectoryArc: "مسار الإطلاق",
    highArc: "مسار عالي (High Arc - هاون)",
    lowArc: "مسار منخفض (Low Arc)",
    
    // Results
    solutionTitle: "حل الرمي والتوجيه (Firing Data)",
    bearing: "الاتجاه (Azimuth)",
    elevation: "زاوية الارتفاع (Elevation)",
    distance: "المسافة الأفقية",
    slantRange: "المسافة المائلة",
    timeOfFlight: "زمن وصول القذيفة (TOF)",
    elevationDiff: "فرق الارتفاع (ΔH)",
    apexHeight: "أقصى ارتفاع للقذيفة",
    dispersion: "دائرة الانتشار التقريبية",
    mils: "ميل",
    seconds: "ثانية",
    meters: "متر",
    
    // Status
    readyToFire: "جاهز للرماية — البيانات محسوبة بدقة",
    targetOutOfRange: "تحذير: الهدف خارج مدى القذيفة",
    targetTooClose: "تحذير: الهدف قريب جداً من الهاون",
    enterCoordsPrompt: "أدخل الإحداثيات أو اضغط على الخريطة لتحديد موقع الهاون والهدف.",
    
    // Live Mission Action
    fireRound: "أطلق قذيفة (Start Splash Timer)",
    splashTitle: "متابعة القذائف في الجو",
    roundsInAir: "قذائف قيد التحليق:",
    splashImpact: "ارتطام القذيفة! (SPLASH)",
    timeLeft: "متبقي:",
    abortAll: "إلغاء جميع المؤقتات",
    
    // Saved Targets & Mission Log
    saveTarget: "حفظ الهدف الحالي",
    targetNamePrompt: "اسم الهدف (مثال: محطة رادار، تقاطع طرق)",
    savedTargetsTitle: "سجل الأهداف والمهمات المحفوظة",
    noSavedTargets: "لا توجد أهداف محفوظة بعد.",
    copyMissionCard: "نسخ بيانات المهمة (للشات/الراديو)",
    copiedToast: "تم نسخ بيانات الرمي بنجاح!",
    loadTarget: "تطبيق",
    deleteTarget: "حذف",
    
    // Map overlays & Diagnostics
    toggleGrid: "الشبكة",
    toggleLabels: "التسميات",
    toggleRings: "دوائر المدى",
    toggleDiagnostics: "تشخيص الخريطة",
    cursorCoords: "إحداثيات المؤشر:",
    gridSquare: "المربع:",
    mapStatusLoading: "جاري تحميل بيانات الخريطة الأصلية…",
    mapStatusLoaded: "تم تحميل صور الخريطة الأصلية بنجاح",
    mapStatusError: "تعذر تحميل مورد الخريطة",
    mapRetry: "إعادة المحاولة",
    openOfficialMap: "فتح الخريطة الرسمية في نافذة جديدة",
    mapDiagnosticsTitle: "لوحة تشخيص مصدر الخريطة",
    sourceEndpoint: "رابط المصدر:",
    mapTilesLoaded: "الصور المحملة:",
    sourceLicense: "الحقوق والترخيص:",
    
    // Trajectory Profile
    profileTitle: "مقطع مسار المقذوف الرأسي (2D Trajectory Profile)",
    mortarBattery: "الهاون",
    impactTarget: "الهدف",
    groundLevel: "مستوى الأرض"
  },
  en: {
    appTitle: "Arma Reforger Mortar Calculator",
    subtitle: "Tactical Artillery Fire Direction System — Everon, Arland & Kolguyev",
    mapEveron: "Everon (12.8 km)",
    mapArland: "Arland (4 km)",
    mapKolguyev: "Kolguyev (14 km)",
    
    // Header & Controls
    selectMap: "Map",
    language: "Language",
    milFormat: "Mil System",
    natoMil: "NATO Artillery (6400 mils)",
    sovietMil: "Warsaw Pact (6000 mils)",
    degrees: "Degrees (360°)",
    audioMute: "Audio",
    audioOn: "Enabled",
    audioOff: "Muted",
    
    // Mobile Navigation Tabs
    tabMap: "Tactical Map",
    tabSolution: "Fire Solution",
    tabPositions: "Battery & Targets",
    tabLogs: "TRP & Missions",
    
    // Positions
    batterySection: "Firing Battery Grid (Mortar)",
    targetSection: "Fire Mission Grid (Target)",
    chooseLocation: "Choose landmark…",
    easting: "Easting (X)",
    northing: "Northing (Y)",
    altitude: "Alt (m)",
    gridPlaceholder: "XXXX",
    subgridKeypad: "Sub-grid Numpad (Keypad 1-9)",
    
    // Interaction Buttons
    clickToSetMortar: "Set Mortar",
    clickToSetTarget: "Set Target",
    swapPositions: "Swap Battery ⇄ Target",
    clearAll: "Clear Coordinates",
    centerMortar: "Center on Mortar",
    centerTarget: "Center on Target",
    fitMap: "Fit Map Extents",
    measureMode: "Ruler / Measure Tool",
    
    // Tactical Drawings
    drawTool: "Tactical Drawing",
    drawLine: "Tactical Line",
    drawCircle: "Hazard Circle / Sector",
    drawPoint: "Point of Interest",
    clearDrawings: "Clear Drawings",
    drawColor: "Color",
    
    // Ballistics
    ballisticsTitle: "Ballistics & Charge Settings",
    presetSelect: "Weapon & Caliber",
    chargeLevel: "Charge Level",
    autoCharge: "Auto-select Best Charge",
    muzzleVel: "Muzzle Velocity (m/s)",
    gravity: "Gravity (m/s²)",
    minRange: "Min Range (m)",
    maxRange: "Max Range (m)",
    trajectoryArc: "Trajectory Angle",
    highArc: "High Arc (Plunging Fire)",
    lowArc: "Low Arc (Flat)",
    
    // Results
    solutionTitle: "Firing Solution",
    bearing: "Azimuth (Bearing)",
    elevation: "Elevation (Sight)",
    distance: "Horizontal Distance",
    slantDistance: "Slant Range",
    timeOfFlight: "Time of Flight (TOF)",
    elevationDiff: "Height Delta (ΔH)",
    apexHeight: "Max Shell Apex Alt",
    dispersion: "Estimated CEP Spread",
    mils: "mils",
    seconds: "sec",
    meters: "m",
    
    // Status
    readyToFire: "Solution Ready — Fire Mission Computed",
    targetOutOfRange: "WARNING: Target is out of range",
    targetTooClose: "WARNING: Target is below minimum range",
    enterCoordsPrompt: "Enter 4-digit grid coordinates, select from landmarks, or click on the tactical map.",
    
    // Live Mission Action
    fireRound: "Fire Round (Start Splash Timer)",
    splashTitle: "Rounds In Flight",
    roundsInAir: "Airborne Rounds:",
    splashImpact: "ROUND IMPACT! (SPLASH)",
    timeLeft: "Time to Impact:",
    abortAll: "Abort All Timers",
    
    // Saved Targets & Mission Log
    saveTarget: "Save Current Target",
    targetNamePrompt: "Target Name (e.g. Radar Site, Crossroad B)",
    savedTargetsTitle: "Target Reference Points (TRP) & Log",
    noSavedTargets: "No saved targets in current session.",
    copyMissionCard: "Copy Fire Mission Text (Chat/Radio)",
    copiedToast: "Fire mission data copied to clipboard!",
    loadTarget: "Load",
    deleteTarget: "Delete",
    
    // Map overlays & Diagnostics
    toggleGrid: "Grid",
    toggleLabels: "Labels",
    toggleRings: "Range Rings",
    toggleDiagnostics: "Diagnostics",
    cursorCoords: "Cursor Coords:",
    gridSquare: "Grid Square:",
    mapStatusLoading: "Loading authentic map imagery…",
    mapStatusLoaded: "Authentic map imagery loaded successfully",
    mapStatusError: "Failed to load map imagery resource",
    mapRetry: "Retry Loading",
    openOfficialMap: "Open Official Map in New Tab",
    mapDiagnosticsTitle: "Map Source Diagnostics",
    sourceEndpoint: "Source Endpoint:",
    mapTilesLoaded: "Imagery Status:",
    sourceLicense: "Licensing & Attribution:",
    
    // Trajectory Profile
    profileTitle: "2D Ballistic Trajectory Cross-Section",
    mortarBattery: "Mortar",
    impactTarget: "Target",
    groundLevel: "Ground Baseline"
  }
};
