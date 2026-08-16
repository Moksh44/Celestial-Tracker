import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const loadingScreen = document.getElementById('loading-screen');
const progressBar = document.getElementById('loading-progress');
const loadingText = document.getElementById('loading-text');
const progressBarContainer = document.querySelector('.loading-bar-container');

const mutedTextColor = 'rgba(232, 232, 232, 0.55)';

let isDownloadingAssets = true;

THREE.DefaultLoadingManager.onProgress = function (url, itemsLoaded, itemsTotal) {
  if (progressBar && isDownloadingAssets) {
    progressBar.style.width = ((itemsLoaded / itemsTotal) * 100) + '%';
  }
  isDownloadingAssets = itemsLoaded < itemsTotal;
};

THREE.DefaultLoadingManager.onLoad = function () {
  isDownloadingAssets = false;
  if (progressBarContainer) {
    progressBarContainer.style.display = 'none';
  }
};

const loadWatcher = setInterval(() => {
  const liveWidget = document.getElementById('live-widget');
  const isApioffline = liveWidget && liveWidget.classList.contains('inactive');
  const isApiRebooting = liveWidget && liveWidget.classList.contains('rebooting');
  
  if (isApioffline) {
    clearInterval(loadWatcher); 
    if (loadingText) {
      loadingText.textContent = "Server is down, please try again later";
      loadingText.style.color = "#ff3333";
    }
    if (progressBarContainer) progressBarContainer.style.display = 'none'; 
    
    const recoveryWatcher = setInterval(() => {
      const widget = document.getElementById('live-widget');
      if (widget && (widget.classList.contains('rebooting') || widget.classList.contains('active'))) {
        clearInterval(recoveryWatcher);
        if (loadingText) {
          loadingText.textContent = "CONNECTION RESTORED. RELOADING";
          loadingText.style.color = mutedTextColor;
        }
        setTimeout(() => window.location.reload(), 1200); 
      }
    }, 1000);
    return; 
  }

  const requiredBodies = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'moon'];
  const allBodiesCreated = requiredBodies.every(name => planetMeshes[name] !== undefined);
  const assetsLoaded = allBodiesCreated && !isDownloadingAssets;

  if (assetsLoaded && everSucceeded) {
    clearInterval(loadWatcher); 
    if (loadingText) {
      loadingText.textContent = "ENVIRONMENT READY";
      loadingText.style.color = mutedTextColor;
    }
    setTimeout(() => {
      if (loadingScreen) loadingScreen.classList.add('fade-out');
    }, 800);
    return;
  }

  if (!isDownloadingAssets && !allBodiesCreated && isApiRebooting) {
    if (loadingText && loadingText.textContent !== "SERVER IS STARTING, PLEASE WAIT") {
      loadingText.textContent = "SERVER IS STARTING, PLEASE WAIT";
      loadingText.style.color = mutedTextColor;
    }
  }
}, 100);

// CONFIG
const SCENE_SCALE = 100;

// SIZE PRESETS
const SIZE_PRESETS = {
  preset1: {
    mercury: { size: 0.15, extraScale: 1 },
    venus:   { size: 0.25, extraScale: 1 },
    earth:   { size: 0.25, extraScale: 1 },
    mars:    { size: 0.18, extraScale: 1 },
    jupiter: { size: 0.8,  extraScale: 2 },
    saturn:  { size: 0.7,  extraScale: 2.5 },
    uranus:  { size: 0.6,  extraScale: 4 },
    neptune: { size: 0.6,  extraScale: 4 }
  },

  preset2: {
    mercury: { size: 0.08, extraScale: 1 },
    venus: { size: 0.19, extraScale: 1 },
    earth: { size: 0.2, extraScale: 1 },
    mars: { size: 0.11, extraScale: 1 },
    jupiter: { size: 2.2, extraScale: 1 },
    saturn: { size: 1.8, extraScale: 1 },
    uranus: { size: 0.8, extraScale: 1 },
    neptune: { size: 0.77, extraScale: 1 }
  }
};

let currentPreset = 'preset1';

// LIGHTING PRESETS
const LIGHTING_PRESETS = {
  realistic: {
    ambientIntensity: 0.18,
    ambientColor: 0x0a0a0a,
    name: "REALISTIC"
  },

  enhanced: {
    ambientIntensity: 0.85,
    ambientColor: 0x2a2a2a,
    name: "ENHANCED"
  },
  
  studio: {
    ambientIntensity: 0,
    ambientColor: 0,
    name: "STUDIO"
  }
};

let currentLightingMode = 'enhanced';


// Setup Scene
const canvas = document.querySelector('#app');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505); 
scene.fog = new THREE.FogExp2(0x000000, 0.00002);

const gridHelper = new THREE.GridHelper(10000, 50, 0x333333, 0x111111);
scene.add(gridHelper);

// Camera (Infinite Zoom Setup)
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000000);
camera.position.set(0, 150, 250);

const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

const isLowTier = isMobile && (
  (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || (navigator.deviceMemory && navigator.deviceMemory <= 3)
);

const dpr = isLowTier
? 1.0
: Math.min(window.devicePixelRatio, 2);

// Renderer 
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: !isMobile,
  logarithmicDepthBuffer: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(dpr);
renderer.toneMapping = THREE.ReinhardToneMapping;

// Post-Processing
const renderScene = new RenderPass(scene, camera);

// Multiply by DPR so the bloom doesn't smear the crisp planets
const bloomDivider = isLowTier ? 2 : 1;
const bloomPass = new UnrealBloomPass(
   new THREE.Vector2((window.innerWidth * dpr) / bloomDivider, (window.innerHeight * dpr) / bloomDivider),
  1.5, 0.4, 0.85
);
bloomPass.strength = 1.2; 
bloomPass.radius = 0.5;
bloomPass.threshold = 0.3;

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 5; 
controls.maxDistance = 50000;

const isTouchScreen = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

controls.zoomSpeed = isTouchScreen ? 1.5 : 4.0;
controls.panSpeed = 1.5;

controls.touches = {
  ONE: THREE.TOUCH.ROTATE,
  TWO: THREE.TOUCH.DOLLY_ROTATE
};

// Lights
const ambientLight = new THREE.AmbientLight(0x0a0a0a, 0.18);
scene.add(ambientLight);

const sunLight = new THREE.PointLight(0xfff5e6, 1.1, 0, 0);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

// Animation Loop
const clock = new THREE.Clock();

let runtimeLowTier = isLowTier;
let fpsCheckSamples = 0;
let fpsCheckAccum = 0;
let fpsCheckDone = false;
let badWindowCount = 0;


function checkRuntimePerformance(dt) {
  if (fpsCheckDone || isDownloadingAssets) return;
  fpsCheckAccum += dt;
  fpsCheckSamples++;
  if (fpsCheckSamples >= 180) {
    const avgDt = fpsCheckAccum / fpsCheckSamples;
    if (avgDt > 0.028 && !runtimeLowTier) {
      badWindowCount++;
      if (badWindowCount >= 2) {
        runtimeLowTier = true;
        applyLowTierDowngrade();
        fpsCheckDone = true;
      }
    } else {
      badWindowCount = 0;
    }
    fpsCheckSamples = 0;
    fpsCheckAccum = 0;
  }
}

// Earth rotation state
let earthRotationAngle = 0;
let earthRotAnchorTime = null;

const PLANET_SPIN_RATES = {
  mercury: (6.1385025 * Math.PI / 180) / 86400,
  venus:   (-1.4813688 * Math.PI / 180) / 86400,
  earth:   (2 * Math.PI) / 86164.0905,
  mars:    (350.89198226 * Math.PI / 180) / 86400,
  jupiter: (870.5360000 * Math.PI / 180) / 86400,
  saturn:  (810.7939024 * Math.PI / 180) / 86400,
  uranus:  (-501.1600928 * Math.PI / 180) / 86400,
  neptune: (536.3128492 * Math.PI / 180) / 86400
};


// DATA & OBJECTS
const API_URL = "https://celestial-tracker-api.onrender.com";
const ASSET_BASE = '.';

const solarSystem = new THREE.Group();

// SMART INITIALIZATION
let hasSeenReboot = false; 
let lastSeenAliveOrRebooting = Date.now();

async function fetchInitData(endpoint, maxRetries = 10) {
  let attempts = 0;

  while (attempts < maxRetries) {
    attempts++;
    try {
      const res = await fetch(`${API_URL}${endpoint}`);
      lastSeenAliveOrRebooting = Date.now();
      if (res.ok) {
        hasSeenReboot = false;
        return await res.json();
      }
   
      if ([502, 503, 504].includes(res.status)) {
        hasSeenReboot = true; 
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
      throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      const isHardOffline = !err.message.includes('HTTP');
      if (isHardOffline && !hasSeenReboot) throw err;
      if (attempts >= maxRetries) {
        console.error(`Max retries (${maxRetries}) reached for ${endpoint}`);
        throw err;
      }
      if (Date.now() - lastSeenAliveOrRebooting > 5000) throw err;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

scene.add(solarSystem);

const planetMeshes = {};
let moonMesh = null;
let moonOrbitLine = null;
const pickables = [];

// Inspect Mode Variabales
let isInspecting = false;
let inspectTarget = null;
let inspectRadius = 10;
let apsisEnabled = false;
let inspectApsisEnabled = false;
let pointerDownX = 0;
let pointerDownY = 0;

// Deep Space Mode
let isInDeepSpace = false;
let deepSpaceCamPos = new THREE.Vector3();
let deepSpaceCamTarget = new THREE.Vector3();
let _lastApsisMode = null;
let cachedApsisMarkers = [];
let _lastStarCamDist = -999;
let _lastLODLevel = -1;

// Dashboard state variables
let dashboardState = 'hidden';
const dashboardEl = document.getElementById('inspect-dashboard');
const dashboardMinBar = document.getElementById('dashboard-minimized');
let pinnedBodies = [];
const HUD_MAX = 3;
let deepSpaceEntryTime = null;
let pulsarCountInterval = null;
const prevCamPos = new THREE.Vector3();
const prevTarget = new THREE.Vector3();

const animFromPos = new THREE.Vector3();
const animToPos   = new THREE.Vector3();
const animFromTgt = new THREE.Vector3();
const animToTgt   = new THREE.Vector3();
let animT = 1;
let transitionDuration = 0.9;

const tmpTargetPosW = new THREE.Vector3();
const tmpDelta = new THREE.Vector3();
const _tmpProjected = new THREE.Vector3();
const tmpSphere = new THREE.Sphere();
const _box3 = new THREE.Box3();
let lastTargetPos = new THREE.Vector3();
const tmpSpinQuat = new THREE.Quaternion();
const tmpSpinAxis = new THREE.Vector3(0, 1, 0);

const ORBIT_BASE_OPACITY = 0.4;

function setAllOrbitOpacity(mult) {
  const o = ORBIT_BASE_OPACITY * mult;

  for (const mesh of Object.values(planetMeshes)) {
    const orbit = mesh?.userData?.orbit;
    if (!orbit) continue;
    orbit.material.opacity = o;
  }
  
  if (moonOrbitLine) {
    moonOrbitLine.material.opacity = o;
  }
}

function getNamedRoot(obj) {
  while (obj && !(obj.userData && obj.userData.name)) obj = obj.parent;
  return obj;
}

function startTransition(toPos, toTarget) {
  animFromPos.copy(camera.position);
  animFromTgt.copy(controls.target);
  animToPos.copy(toPos);
  animToTgt.copy(toTarget);
  animT = 0;
}

function enterInspect(targetMesh) {
  
  if (!isInspecting) {
    prevCamPos.copy(camera.position);
    prevTarget.copy(controls.target);

    document.getElementById('exit-inspect')?.style.setProperty('display', 'flex');
    document.getElementById('inspect-options-wrapper')?.style.setProperty('display', 'block');
    
    minimizeDashboard();
  
  }
  
  const bodyName = targetMesh.userData.name?.toLowerCase();
  if (bodyName) fetchNextEvent(bodyName);

  inspectTarget = targetMesh;
  isInspecting = true;
  inspectApsisEnabled = false;
  updatePinButtonState();


  _box3.setFromObject(inspectTarget);
  _box3.getBoundingSphere(tmpSphere);
  inspectRadius = tmpSphere.radius || 10;

  controls.minDistance = Math.max(tmpSphere.radius * 1.01, 0.5);

  inspectTarget.getWorldPosition(tmpTargetPosW);
  lastTargetPos.copy(tmpTargetPosW);

  const viewDir = camera.position.clone().sub(controls.target).normalize();
  const dist = Math.max(inspectRadius * 4.5, 25);

  const toPos = tmpTargetPosW.clone().addScaledVector(viewDir, dist);
  const toTarget = tmpTargetPosW.clone();

  startTransition(toPos, toTarget);

  document.getElementById('btn-toggle-autorotate')?.classList.add('active');
  document.getElementById('btn-toggle-apsis')?.classList.remove('active');

  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.15;
  setIconsVisible(iconsEnabled);
}

function exitInspect() {
  if (!isInspecting) return;

  isInspecting = false;
  inspectTarget = null;
  inspectApsisEnabled = false;

  startTransition(prevCamPos, prevTarget);

  controls.autoRotate = false;
  controls.minDistance = 5;
  setAllOrbitOpacity(1);

  document.getElementById('exit-inspect')?.style.setProperty('display', 'none');
  document.getElementById('inspect-options-wrapper')?.style.setProperty('display', 'none');
  
  document.getElementById('popover-inspect-options')?.classList.add('hidden');
  document.getElementById('btn-inspect-options')?.classList.remove('active');

  hideDashboard();
  setIconsVisible(iconsEnabled);
}

// Enter Deep Space Mode
function enterDeepSpaceMode() {

  transitionDuration = 3.5;

  const dsBtn = document.getElementById('btn-deep-space-toggle');
  if (dsBtn) dsBtn.style.display = 'none';
  
  deepSpaceCamPos.copy(camera.position);
  deepSpaceCamTarget.copy(controls.target);
  
  const direction = NEBULA_CENTER.clone().normalize();
  const startDistance = 1000;
  const toPos = direction.clone().multiplyScalar(NEBULA_CENTER.length() - startDistance);
  const toTarget = NEBULA_CENTER.clone();
  
  startTransition(toPos, toTarget);
  
  isInDeepSpace = true;

  stateBeforeDeepSpace = {
    polesEnabled,
    iconsEnabled,
    orbitsEnabled,
    gridVisible: gridHelper ? gridHelper.visible : true
  };
  
  fadeSolarSystem(0);

  if (neutronStarCore) neutronStarCore.visible = true;
  if (neutronCoreLight) neutronCoreLight.visible = true;

  if (magneticBeam) magneticBeam.visible = true;

  if (particleJets) particleJets.visible = true;

  if (ambientDust) ambientDust.visible = true;
  
  controls.target.copy(NEBULA_CENTER);
  controls.enablePan = false;
  
  const exitBtn = document.getElementById('exit-inspect');
  if (exitBtn) {
    exitBtn.style.display = 'flex';
  }

  const deepSpaceLabel = document.getElementById('deep-space-label');
  if (deepSpaceLabel) {
    deepSpaceLabel.classList.add('active');
  }
  
  markersEnabled = false;
  pulsarMarkerEnabled = false;
  
  const dashboard = document.getElementById('inspect-dashboard');
  if (dashboard) dashboard.style.display = 'none';
  
  showPulsarInfo();
}

// Exit Deep Space Mode
function exitDeepSpaceMode() {

  if (!isInDeepSpace) return;

  transitionDuration = 0.9;

  const dsBtn = document.getElementById('btn-deep-space-toggle');
  if (dsBtn) dsBtn.style.display = 'block';
  
  isInDeepSpace = false;

  if (neutronStarCore) neutronStarCore.visible = false;
  if (neutronCoreLight) neutronCoreLight.visible = false;

  if (magneticBeam) magneticBeam.visible = false;

  if (particleJets) particleJets.visible = false;

  if (ambientDust) {
    ambientDust.visible = false;
  }
  
  controls.enablePan = true;
  scene.background = new THREE.Color(0x050505);
  scene.fog = new THREE.FogExp2(0x000000, 0.00002);
  
  startTransition(deepSpaceCamPos, deepSpaceCamTarget);

  triggerHyperspaceJump(true);
  
  fadeSolarSystem(1);

  const dashboard = document.getElementById('inspect-dashboard');
  if (dashboard) {
    dashboard.style.display = '';
  }
  
  const exitBtn = document.getElementById('exit-inspect');
  if (exitBtn) {
    exitBtn.style.display = 'none';
  }

  const deepSpaceLabel = document.getElementById('deep-space-label');
  if (deepSpaceLabel) {
    deepSpaceLabel.classList.remove('active');
  }
  
  markersEnabled = true;
  pulsarMarkerEnabled = true;
  
  hidePulsarInfo();
}

// Fade solar system elements
function fadeSolarSystem(targetOpacity) {
    const isVisible = (targetOpacity > 0);
    for (const mesh of Object.values(planetMeshes)) {
      if (mesh) {
        if (isVisible) {
          mesh.visible = stateBeforeDeepSpace.iconsEnabled;
        } else {
          mesh.visible = false;
        }
          
        if (mesh.material) {
          mesh.material.opacity = targetOpacity;
          mesh.material.transparent = targetOpacity < 1;
          mesh.material.needsUpdate = true;
        }
      }
        
      const orbit = mesh?.userData?.orbit;
      if (orbit) {
        if (isVisible) {
          orbit.visible = stateBeforeDeepSpace.orbitsEnabled;
        } else {
          orbit.visible = false;
        }
      }
        
      const pole = mesh?.userData?.poleLine;
      if (pole) {
        if (isVisible) {
          pole.visible = stateBeforeDeepSpace.polesEnabled;
        } else {
          pole.visible = false;
        }
      }
    }
    
    if (sunMesh) {
      sunMesh.visible = isVisible;
    }
    
    if (moonMesh) {
      if (isVisible) {
        moonMesh.visible = stateBeforeDeepSpace.iconsEnabled;
      } else {
        moonMesh.visible = false;
      }
        
      if (moonMesh.material) {
        moonMesh.material.opacity = targetOpacity;
        moonMesh.material.transparent = targetOpacity < 1;
        moonMesh.material.needsUpdate = true;
      }
    }
    
    if (moonOrbitLine) {
      if (isVisible) {
        moonOrbitLine.visible = stateBeforeDeepSpace.orbitsEnabled;
      } else {
        moonOrbitLine.visible = false;
      }
    }
    
    if (gridHelper) {
      if (isVisible) {
        gridHelper.visible = stateBeforeDeepSpace.gridVisible;
      } else {
        gridHelper.visible = false;
      }
    }
}

// Show dashboard
function showDashboard() {
  if (!dashboardEl) return;
  dashboardState = 'maximized';
  dashboardEl.className = 'dashboard-maximized';
}

// Hide dashboard
function hideDashboard() {
  if (!dashboardEl) return;

  const maxPanel = document.getElementById('dashboard-maximized');
  const minBar = document.getElementById('dashboard-minimized');

  if (dashboardState === 'maximized' && maxPanel) {
    maxPanel.classList.add('closing');
    
    maxPanel.addEventListener('animationend', () => {
      dashboardState = 'hidden';
      dashboardEl.className = 'dashboard-hidden';
      maxPanel.classList.remove('closing');
    }, { once: true });
  } else if (dashboardState === 'minimized' && minBar) {
    minBar.classList.add('closing');
    minBar.addEventListener('animationend', () => {
      dashboardState = 'hidden';
      dashboardEl.className = 'dashboard-hidden';
      minBar.classList.remove('closing')
    }, { once: true});
  } else {
    dashboardState = 'hidden'
    dashboardEl.classList = 'dashboard-hidden';
  }
}

// Minimize to bar
function minimizeDashboard() {
  if (!dashboardEl) return;

  const maxPanel = document.getElementById('dashboard-maximized');
  
  if (dashboardState === 'maximized' && maxPanel) {
    maxPanel.classList.add('closing');

    maxPanel.addEventListener('animationend', () => {
      dashboardState = 'minimized';
      dashboardEl.className = 'dashboard-minimized';
      maxPanel.classList.remove('closing');
    }, { once: true});
  } else {
    dashboardState = 'minimized';
    dashboardEl.className = 'dashboard-minimized';
  }
}

// Maximize to full panel
function maximizeDashboard() {
  if (!dashboardEl) return;
  dashboardState = 'maximized';
  dashboardEl.className = 'dashboard-maximized';
}

// Fetch and display next event from API
function fetchNextEvent(name) {
  const box    = document.getElementById('upcoming-box');
  const evName = document.getElementById('upcoming-event-name');
  const evAngle = document.getElementById('upcoming-event-angle');
  const evDays = document.getElementById('upcoming-event-days');

  if (!box) return;

  // Show box with loading state
  box.style.display  = 'block';
  evName.textContent  = 'Scanning...';
  evAngle.textContent = '';
  evDays.textContent  = '';

  fetch(`${API_URL}/api/next_event/${name}`)
    .then(res => res.json())
    .then(data => {
      if (!data.event || data.event === 'None found' || data.days === null) {
        evName.textContent  = 'N/A';
        evAngle.textContent = '';
        evDays.textContent  = '';
        return;
      }

      const days   = data.days;
      const dayStr = days < 1
        ? `${Math.round(days * 24)}h`
        : `${Math.round(days)}d`;

      evName.textContent  = data.event;
      evAngle.textContent = data.elongation !== null ? `${data.elongation}°` : '';
      evDays.textContent  = `in ${dayStr}`;
    })
    .catch(() => {
      evName.textContent  = 'Unavailable';
      evAngle.textContent = '';
      evDays.textContent  = '';
    });
}

// Pulsar Info Panel

function showPulsarInfo() {

  if (pulsarCountInterval) {
    clearInterval(pulsarCountInterval);
    pulsarCountInterval = null;
  }

  deepSpaceEntryTime = Date.now();
  
  const countEl = document.getElementById('pulsar-pulse-count');
  if (countEl) countEl.textContent = '0';

  pulsarCountInterval = setInterval(() => {
    if (!deepSpaceEntryTime) return;
    
    const elapsed = Date.now() - deepSpaceEntryTime;      
    
    const count = Math.floor(elapsed / 89.33);           
    
    const countEl = document.getElementById('pulsar-pulse-count');
    if (countEl) countEl.textContent = count.toLocaleString();
  }, 250);
}

function hidePulsarInfo() {
  const panel = document.getElementById('pulsar-info-panel');
  if (panel) panel.style.display = 'none';

  if (pulsarCountInterval) {
    clearInterval(pulsarCountInterval);
    pulsarCountInterval = null;
  }
  deepSpaceEntryTime = null;
}

function formatDMS(decimalDegrees, isLatitude = false) {
  if (decimalDegrees === null || decimalDegrees === undefined) return 'N/A';
  
  const sign = decimalDegrees < 0 ? '-' : (isLatitude ? '+' : '');
  const absDeg = Math.abs(decimalDegrees);
  
  const d = Math.floor(absDeg);
  const minFloat = (absDeg - d) * 60;
  const m = Math.floor(minFloat);
  const s = Math.floor((minFloat - m) * 60);

  return `${sign}${d.toString().padStart(2, '0')}° ${m.toString().padStart(2, '0')}' ${s.toString().padStart(2, '0')}"`;
}

function formatLightTime(decimalMinutes) {
  if (decimalMinutes === null || decimalMinutes === undefined) return 'N/A';
  const m = Math.floor(decimalMinutes);
  const s = Math.floor((decimalMinutes - m) * 60);
  return `${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
}

function getHUDRows(name, data) {
  if (name === 'moon') {
    return [
      ['ORB',   formatDMS(data.orbit_progress_deg)],
      ['VEL',   data.velocity_km_s.toFixed(4) + ' km/s'],
      ['PHASE', `${data.phase.name} (${data.phase.illumination}%)`],
      ['CONST', data.constellation || 'N/A']
    ];
  } else if (name === 'earth') {
    return [
      ['LON',  formatDMS(data.physics.ecliptic_longitude)],
      ['VEL',  data.physics.speed_km_s.toFixed(3) + ' km/s'],
      ['SPIN', data.earth_spin_angle_deg !== null ? data.earth_spin_angle_deg.toFixed(2) + '°' : 'N/A']
    ];
  } else {
    return [
      ['LON',   formatDMS(data.physics.ecliptic_longitude)],
      ['VEL',   data.physics.speed_km_s.toFixed(3) + ' km/s'],
      ['ELONG', getElongationLabel(data.physics.elongation, name)],
      ['CONST', data.physics.constellation || 'N/A']
    ];
  }
}

function updateHUDCard(name, data) {
  const card = document.getElementById(`hud-card-${name}`);
  if (!card) return;
  const rows = getHUDRows(name, data);
  rows.forEach(([label, value], i) => {
    const vEl = card.querySelector(`[data-vi="${i}"]`);
    if (vEl) vEl.textContent = value;
  });
}

function createHUDCard(name, data) {
  if (document.getElementById(`hud-card-${name}`)) return;
  const rows = getHUDRows(name, data);
  const rowsHTML = rows.map(([label, value], i) => `
    <div class="hud-row">
      <span class="hud-label">${label}</span>
      <span class="hud-value" data-vi="${i}">${value}</span>
    </div>`).join('');

  const card = document.createElement('div');
  card.className = 'hud-card';
  card.id = `hud-card-${name}`;
  card.innerHTML = `
    <div class="hud-card-header">
      <span class="hud-card-name">${name.toUpperCase()}</span>
      <button class="hud-card-close" data-body="${name}">✕</button>
    </div>
    ${rowsHTML}`;

  card.querySelector('.hud-card-close').addEventListener('click', () => {
    removeHUDCard(name);
  });

  document.getElementById('hud-container').appendChild(card);
}

function removeHUDCard(name) {
  const card = document.getElementById(`hud-card-${name}`);
  if (card) card.remove();
  pinnedBodies = pinnedBodies.filter(b => b !== name);
  if (inspectTarget?.userData?.name?.toLowerCase() === name) {
    updatePinButtonState();
  }
}

function updatePinButtonState() {
  if (!inspectTarget) return;
  const name = inspectTarget.userData.name?.toLowerCase();
  const btn  = document.getElementById('btn-pin-hud');
  if (!btn) return;

  if (pinnedBodies.includes(name)) {
    btn.textContent  = 'PINNED';
    btn.classList.add('active');
    btn.disabled     = false;
    btn.style.opacity = '1';
  } else if (pinnedBodies.length >= HUD_MAX) {
    btn.textContent  = 'HUD FULL (3)';
    btn.classList.remove('active');
    btn.disabled     = true;
    btn.style.opacity = '0.4';
  } else {
    btn.textContent  = 'PIN';
    btn.classList.remove('active');
    btn.disabled     = false;
    btn.style.opacity = '1';
  }
}

// Generate elongation label
function getElongationLabel(elongation, planetName) {
  if (elongation === null || elongation === undefined) return 'N/A';
    
  const abs = Math.abs(elongation);
  const isEast = elongation > 0;
  const dir = isEast ? 'E' : 'W';
  const dmsStr = formatDMS(abs);

  if (planetName === 'mercury' || planetName === 'venus') {
    const maxElong = (planetName === 'mercury') ? 28 : 47;
    if (abs < 10) {
      return `${dmsStr} - Conjunction`;
    } else if (abs >= maxElong - 3) {
      const star = isEast ? 'Evening Star' : 'Morning Star';
      return `${dmsStr} ${dir} - ${star}`;
    } else {
      return `${dmsStr} ${dir}`;
    }
  } else {
    if (abs < 10) {
      return `${dmsStr} - Conjunction`;
    } else if (abs >= 85 && abs <= 95) {
      return `${dmsStr} ${dir} - Quadrature`;
    } else if (abs >= 170) {
      return `${dmsStr} - Opposition`;
    } else {
      return `${dmsStr} ${dir}`;
    }
  }
}

// Update dashboard info
function updateDashboardInfo(name, data) {
  document.getElementById('info-name').textContent = name.toUpperCase();
  
  // CASE 1: MOON
  if (name === 'moon') {
    document.getElementById('right-box-title').textContent = 'EARTH VIEW';
    document.getElementById('row-ra').style.display = 'block';
    document.getElementById('row-dec').style.display = 'block';
    document.getElementById('row-distance-earth').style.display = 'block';
    document.getElementById('row-elongation').style.display = 'block';
    document.getElementById('row-constellation').style.display = 'block';
    document.getElementById('row-inclination').style.display = 'block';
    document.getElementById('row-spin').style.display = 'none';
    document.getElementById('row-progress').style.display = 'none';
    document.getElementById('row-subsolar').style.display = 'none';
    document.getElementById('row-terminator').style.display = 'none';

    // Change labels to Moon-specific terms
    document.getElementById('label-longitude').textContent = 'Lon';
    document.getElementById('label-velocity').textContent = 'Vel';
    document.getElementById('label-distance').textContent = 'Sun Dist';
    document.getElementById('label-distance-earth').textContent = 'Earth Dist';
      
    // SHOW PHASE, HIDE LIGHT TIME
    const phaseRow = document.getElementById('phase-row');
    const lightTimeRow = document.getElementById('light-time-row');
    if (phaseRow) {
      phaseRow.style.display = 'block';
      document.getElementById('info-phase').textContent =
      `${data.phase.name} (${data.phase.illumination}%)`;
    }
    if (lightTimeRow) lightTimeRow.style.display = 'none';
    
    // LEFT BOX: CELESTIAL VIEW
    document.getElementById('info-longitude').textContent = formatDMS(data.longitude_deg);
    document.getElementById('info-velocity').textContent = data.velocity_km_s.toFixed(4);
    document.getElementById('info-inclination').textContent = formatDMS(data.orbit_latitude_deg, true);
    document.getElementById('info-distance').textContent = data.distance_from_sun_au.toFixed(3);
    document.getElementById('unit-distance').textContent = 'AU';
    
    // RIGHT BOX: EARTH VIEW
    const raH = Math.floor(data.ra_hours);
    const raM = Math.floor((data.ra_hours - raH) * 60);
    const raS = Math.floor(((data.ra_hours - raH) * 60 - raM) * 60);
    document.getElementById('info-ra').textContent = `${raH}h ${raM}m ${raS}s` ;
    document.getElementById('info-dec').textContent = formatDMS(data.dec_degrees, true);
    
    // MOON DISTANCE IN KM
    document.getElementById('info-distance-earth').textContent = data.distance_from_earth_km.toFixed(0) + ' km';
    document.getElementById('info-constellation').textContent = data.constellation || 'N/A';
    document.getElementById('info-elongation').textContent = getElongationLabel(data.elongation, 'moon');
  }
  
  // CASE 2: EARTH
  else if (name === 'earth') {
    // Restore standard planet labels
    document.getElementById('label-longitude').textContent = 'Lon';
    document.getElementById('label-velocity').textContent = 'Vel';
    document.getElementById('label-distance').textContent = 'Sun Dist';
    document.getElementById('label-distance-earth').textContent = 'Earth Dist';
      
    // HIDE PHASE, SHOW LIGHT TIME
    const phaseRow = document.getElementById('phase-row');
    const lightTimeRow = document.getElementById('light-time-row');
    if (phaseRow) phaseRow.style.display = 'none';
    if (lightTimeRow) lightTimeRow.style.display = 'block';
      
    // LEFT BOX: CELESTIAL VIEW
    document.getElementById('info-velocity').textContent = data.physics.speed_km_s.toFixed(2);
    document.getElementById('info-longitude').textContent = formatDMS(data.physics.ecliptic_longitude);
    document.getElementById('info-distance').textContent = data.physics.distance_au.toFixed(3);
    document.getElementById('unit-distance').textContent = 'AU';
    document.getElementById('info-light-time').textContent = formatLightTime(data.physics.light_time_minutes);
      
    // RIGHT BOX: EARTH VIEW
    document.getElementById('right-box-title').textContent = 'EARTH DATA';
    document.getElementById('row-ra').style.display = 'none';
    document.getElementById('row-dec').style.display = 'none';
    document.getElementById('row-distance-earth').style.display = 'none';
    document.getElementById('row-elongation').style.display = 'none';
    document.getElementById('row-constellation').style.display = 'none';
    document.getElementById('row-inclination').style.display = 'none';
    document.getElementById('row-spin').style.display = 'block';
    document.getElementById('row-progress').style.display = 'block';
    document.getElementById('row-subsolar').style.display = 'block';
    document.getElementById('row-terminator').style.display = 'block';

    // Fill Earth values
    if (data.earth_spin_angle_deg != null) {
      document.getElementById('info-earth-spin').textContent =
      data.earth_spin_angle_deg.toFixed(2);
    }

    if (data.earth_spin_progress_percent != null) {
      document.getElementById('info-earth-progress').textContent =
      data.earth_spin_progress_percent.toFixed(1);
    }

    if (data.subsolar) {
      const lat    = Math.abs(data.subsolar.latitude).toFixed(1);
      const lon    = Math.abs(data.subsolar.longitude).toFixed(1);
      const latDir = data.subsolar.latitude  >= 0 ? 'N' : 'S';
      const lonDir = data.subsolar.longitude >= 0 ? 'E' : 'W';
      document.getElementById('info-earth-subsolar').textContent =
      `${lat}°${latDir}, ${lon}°${lonDir}`;
    }
    
    if (data.terminator) {
      const sr    = Math.abs(data.terminator.sunrise_lon).toFixed(1);
      const ss    = Math.abs(data.terminator.sunset_lon).toFixed(1);
      const srDir = data.terminator.sunrise_lon >= 0 ? 'E' : 'W';
      const ssDir = data.terminator.sunset_lon  >= 0 ? 'E' : 'W';
      document.getElementById('info-earth-terminator').textContent =
      `↑${sr}°${srDir}  ↓${ss}°${ssDir}`;
    }
  }
  
  // CASE 3: OTHER PLANETS
  else {
    document.getElementById('right-box-title').textContent = 'EARTH VIEW';
    document.getElementById('row-ra').style.display = 'block';
    document.getElementById('row-dec').style.display = 'block';
    document.getElementById('row-distance-earth').style.display = 'block';
    document.getElementById('row-elongation').style.display = 'block';
    document.getElementById('row-constellation').style.display = 'block';
    document.getElementById('row-inclination').style.display = 'block';
    document.getElementById('row-spin').style.display = 'none';
    document.getElementById('row-progress').style.display = 'none';
    document.getElementById('row-subsolar').style.display = 'none';
    document.getElementById('row-terminator').style.display = 'none';
    // Restore standard planet labels
    document.getElementById('label-longitude').textContent = 'Lon';
    document.getElementById('label-velocity').textContent = 'Vel';
    document.getElementById('label-distance').textContent = 'Sun Dist';
    document.getElementById('label-distance-earth').textContent = 'Earth Dist';
      
    // HIDE PHASE, SHOW LIGHT TIME
    const phaseRow = document.getElementById('phase-row');
    const lightTimeRow = document.getElementById('light-time-row');
    if (phaseRow) phaseRow.style.display = 'none';
    if (lightTimeRow) lightTimeRow.style.display = 'block';
      
    // LEFT BOX: CELESTIAL VIEW
    document.getElementById('info-velocity').textContent = data.physics.speed_km_s.toFixed(2);
    document.getElementById('info-inclination').textContent = formatDMS(data.physics.ecliptic_latitude, true);
    document.getElementById('info-longitude').textContent = formatDMS(data.physics.ecliptic_longitude);
    document.getElementById('info-distance').textContent = data.physics.distance_au.toFixed(3);
    document.getElementById('unit-distance').textContent = 'AU';
    document.getElementById('info-light-time').textContent = formatLightTime(data.physics.light_time_minutes);
    
    // RIGHT BOX: EARTH VIEW
    const raH = Math.floor(data.physics.ra_hours);
    const raM = Math.floor((data.physics.ra_hours - raH) * 60);
    const raS = Math.floor(((data.physics.ra_hours - raH) * 60 - raM) * 60);
    document.getElementById('info-ra').textContent = `${raH}h ${raM}m ${raS}s`;
    document.getElementById('info-dec').textContent = formatDMS(data.physics.dec_degrees, true);
    
    // PLANET DISTANCE IN AU
    document.getElementById('info-distance-earth').textContent = data.physics.distance_from_earth_au.toFixed(3) + ' AU';
    document.getElementById('info-constellation').textContent = data.physics.constellation;
    document.getElementById('info-elongation').textContent = getElongationLabel(data.physics.elongation, name);
  }
  
  if (pinnedBodies.includes(name)) updateHUDCard(name, data);
}

function toggleInspectApsis() {
  if (!inspectTarget) return;
  
  inspectApsisEnabled = !inspectApsisEnabled;
  
  const btn = document.getElementById('btn-toggle-apsis');
  if (btn) {
    btn.classList.toggle('active', inspectApsisEnabled);
  }
}

document.getElementById('btn-pin-hud')?.addEventListener('click', () => {
  if (!inspectTarget) return;
  const name = inspectTarget.userData.name?.toLowerCase();
  const btn  = document.getElementById('btn-pin-hud');

  if (pinnedBodies.includes(name)) {
    removeHUDCard(name);
  } else {
    if (pinnedBodies.length >= HUD_MAX) return;
    pinnedBodies.push(name);
    const tempData = buildTempHUDData(name);
    createHUDCard(name, tempData);
  }
  updatePinButtonState();
});

function buildTempHUDData(name) {
  if (name === 'moon') {
    return {
      orbit_progress_deg: 0, velocity_km_s: 0,
      phase: { name: '...', illumination: '...' }, constellation: '...'
    };
  } else if (name === 'earth') {
    return { physics: { ecliptic_longitude: 0, speed_km_s: 0 }, earth_spin_angle_deg: 0 };
  } else {
    return { physics: { ecliptic_longitude: 0, speed_km_s: 0, elongation: 0, constellation: '...' } };
  }
}

const markerContainer = document.getElementById('planet-markers');
const markerNames = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'moon'];
const markers = {};
let markersEnabled = true;
const tmpV = new THREE.Vector3();

let stateBeforeDeepSpace = {
  polesEnabled: false,
  iconsEnabled: true,
  orbitsEnabled: true,
  gridVisible: true
};

// Pulsar Animation Core
const NEBULA_CENTER = getVelaPulsarPosition();

let neutronStarCore = null;
let neutronCoreLight = null;
const NEUTRON_CORE_RADIUS = 25;
const PULSAR_ROTATION_SPEED = { realistic: Math.PI * 30 };
let currentRotationSpeed = PULSAR_ROTATION_SPEED.realistic;

let magneticBeam = null;
const BEAM_TILT_ANGLE = Math.PI / 180;
const BEAM_LENGTH = 2000;
const BEAM_RADIUS = 4;

let particleJets = null;
const PARTICLE_COUNT = isLowTier ? 1000 : 3000;
const PARTICLE_SPEED = 150;
const PARTICLE_SIZE_MIN = 1.5;
const PARTICLE_SIZE_MAX = 4.0;

let ambientDust = null;
const DUST_COUNT = isLowTier ? 250 : 800;
const DUST_RANGE = 300;
const DUST_DRIFT_SPEED = 180;
const DUST_SIZE_MIN = 2.8;
const DUST_SIZE_MAX = 4.5;
let sharedParticleTexture = null;

function createMarker(name){
  if (!markerContainer) return;

  const el = document.createElement('div');
  el.className = 'planet-marker';
  el.dataset.name = name;

  el.innerHTML = `
    <div class="marker-label">${name}</div>
    <div class="marker-dot"></div>
  `;

  markerContainer.appendChild(el);
  el.style.left = '0px'; 
  el.style.top = '0px';
  markers[name] = el;
}

markerNames.forEach(createMarker);

const pulsarMarkers = {};
let pulsarMarkerEnabled = false;

createPulsarMarker();

const toggleBtn = document.getElementById('toggle-pointers');
if (toggleBtn) {
  toggleBtn.addEventListener('click', () => {
    markersEnabled = !markersEnabled;
    toggleBtn.classList.toggle('active', markersEnabled);
  });
}

const exitBtn = document.getElementById('exit-inspect');
if (exitBtn) {
  exitBtn.addEventListener('click', () => {
    if (isInDeepSpace) {
      exitDeepSpaceMode();
    } else if (isInspecting) {
      exitInspect();
    }
  });
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (isInDeepSpace) {
      exitDeepSpaceMode();
    } else if (isInspecting) {
      exitInspect();
    }
  }
});

let polesEnabled = false;
let iconsEnabled = true;
let orbitsEnabled = true;
const poleBtn = document.getElementById('toggle-poles');

function setPolesVisible(on) {
  for (const mesh of Object.values(planetMeshes)) {
    const pole = mesh?.userData?.poleLine;
    if (pole) pole.visible = on;
  }
}

function setIconsVisible(on) {
  for (const mesh of Object.values(planetMeshes)) {
    if (mesh) {
      if (!on && isInspecting && inspectTarget === mesh) {
        mesh.visible = true;
      } else {
        mesh.visible = on;
      }
    }
  }
}

let orbitAnimId = null;
let moonTrailAnimId = null;

function setOrbitsVisible(on) {
  if (orbitAnimId) cancelAnimationFrame(orbitAnimId);
  if (moonTrailAnimId) { cancelAnimationFrame (moonTrailAnimId); moonTrailAnimId = null; }

  const allOrbits = [];

  for (const mesh of Object.values(planetMeshes)) {
    if (mesh?.userData?.orbit) allOrbits.push(mesh.userData.orbit);
  }

  if (moonOrbitLine) allOrbits.push(moonOrbitLine);

  if (!on) {
    allOrbits.forEach(orbit => orbit.visible = false);
    return;
  }

    allOrbits.forEach(orbit => {
      orbit.visible = true;
      orbit.geometry.setDrawRange(0, 0);
    });

    let progress = 0;
    const animationSpeed = 0.02;
    function animateAllOrbits() {
      progress += animationSpeed;
      if (progress > 1) progress = 1;

      allOrbits.forEach(orbit => {
        const totalPoints = orbit.geometry.attributes.position.count;
        orbit.geometry.setDrawRange(0, Math.floor(totalPoints * progress));
      });

      if (progress < 1) {
        orbitAnimId = requestAnimationFrame(animateAllOrbits);
      }
    }
    animateAllOrbits();
}

if (poleBtn) {
  poleBtn.addEventListener('click', () => {
    polesEnabled = !polesEnabled;
    poleBtn.classList.toggle('active', polesEnabled);
    setPolesVisible(polesEnabled);
  });
}

const iconsBtn = document.getElementById('toggle-icons');
if (iconsBtn) {
  iconsBtn.addEventListener('click', () => {
    iconsEnabled = !iconsEnabled;
    iconsBtn.classList.toggle('active', iconsEnabled);
    setIconsVisible(iconsEnabled);
  });
}

const orbitsBtn = document.getElementById('toggle-orbits');
if (orbitsBtn) {
  orbitsBtn.addEventListener('click', () => {
    orbitsEnabled = !orbitsEnabled;
    orbitsBtn.classList.toggle('active', orbitsEnabled);
    setOrbitsVisible(orbitsEnabled);
  });
}

let uiVisible = true;

const UI_ELEMENTS = [
  () => document.getElementById('page-title'),
  () => document.getElementById('btn-deep-space-toggle'),
  () => document.getElementById('live-widget'),
  () => document.getElementById('utc-clock'),
  () => document.getElementById('toolbar-container'),
];

function setUIVisible(visible) {
  uiVisible = visible;
  UI_ELEMENTS.forEach(fn => {
    const el = fn();
    if (el) {
      if (el.id === 'btn-deep-space-toggle' && isInDeepSpace) {
        el.style.display = 'none';
      } else { 
        el.style.display = visible ? '' : 'none';
      }
    }
  });

  const exitBtn = document.getElementById('exit-inspect');
  if (exitBtn && (isInspecting || isInDeepSpace)) {
  exitBtn.style.display = visible ? 'flex' : 'none'; }

  const optionsWrapper = document.getElementById('inspect-options-wrapper');
  if (optionsWrapper && isInspecting) {
      optionsWrapper.style.display = visible ? 'block' : 'none';
      if (!visible) {
        document.getElementById('popover-inspect-options')?.classList.add('hidden');
        document.getElementById('btn-inspect-options')?.classList.remove('active');
      }
  }

  if (isInspecting) {
    if (visible) {
      if (dashboardState === 'maximized') maximizeDashboard();
      else if (dashboardState === 'minimized') minimizeDashboard();
      else maximizeDashboard();
    } else {
      hideDashboard();
    }
  }

  const deepLabel = document.getElementById('deep-space-label');
  if (deepLabel && isInDeepSpace) {
    if (visible) deepLabel.classList.add('active');
    else deepLabel.classList.remove('active');
  }

  const pulsarPanel = document.getElementById('pulsar-info-panel');
  if (pulsarPanel && isInDeepSpace) {
    pulsarPanel.style.display = visible ? 'block' : 'none';
  }

  const uiBtn = document.getElementById('btn-toggle-ui');
  if (uiBtn) uiBtn.classList.toggle('ui-hidden', !visible);
}

document.getElementById('btn-toggle-ui')?.addEventListener('click', () => {
  setUIVisible(!uiVisible);
});



const liveWidget = document.getElementById('live-widget');
const liveStatusText = liveWidget?.querySelector('.live-status-text');

let lastSuccessMs = 0;
let everSucceeded = false;

function setLiveState(state){
  if (!liveWidget) return;
  liveWidget.classList.remove('active','rebooting','inactive');
  liveWidget.classList.add(state);

  const textMap = {
    active: 'ONLINE',
    rebooting: 'REBOOTING',
    inactive: 'OFFLINE'
  };
  if (liveStatusText) liveStatusText.textContent = textMap[state];
}

setLiveState('rebooting');

// UTC Clock
function updateUTCClock() {
  const now = new Date();
  const hh  = String(now.getUTCHours()).padStart(2, '0');
  const min = String(now.getUTCMinutes()).padStart(2, '0');
  const ss  = String(now.getUTCSeconds()).padStart(2, '0');
  const el  = document.getElementById('utc-clock-time');
  if (el) el.textContent = `${hh}:${min}:${ss}`;
}

updateUTCClock();
setInterval(updateUTCClock, 1000);

// Create the Sun
const sunGeometry = new THREE.SphereGeometry(10, isLowTier ? 32 : 64, isLowTier ? 32 : 64);
const sunTexture = new THREE.TextureLoader().load(`${ASSET_BASE}/textures/sun.jpg`);
sunTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
const sunMaterial = new THREE.MeshBasicMaterial({ 
  map: sunTexture,
  color: 0xffffff 
});
const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
solarSystem.add(sunMesh);
sunMesh.userData = { name: 'sun' };
pickables.push(sunMesh);


function toJulianDate(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

function getJulianCenturiesT(date) {
  const JD = toJulianDate(date);
  return (JD - 2451545.0) / 36525.0;
}

function raDecToICRFVector(raDeg, decDeg) {
  const ra = THREE.MathUtils.degToRad(raDeg);
  const dec = THREE.MathUtils.degToRad(decDeg);
  const x = Math.cos(dec) * Math.cos(ra);
  const y = Math.cos(dec) * Math.sin(ra);
  const z = Math.sin(dec);

  return new THREE.Vector3(x, y, z).normalize();
}

function getVelaPulsarPosition() {
  const raDeg = 128.83608;
  const decDeg = -45.17645
  const PULSAR_DISTANCE = 50000;
  
  const pulsarICRF = raDecToICRFVector(raDeg, decDeg);
  
  const x = pulsarICRF.x * PULSAR_DISTANCE;
  const y = pulsarICRF.z * PULSAR_DISTANCE;
  const z = pulsarICRF.y * PULSAR_DISTANCE;
  
  return new THREE.Vector3(x, y, z);
}

function createNeutronStarCore() {
  const coreGeometry = new THREE.SphereGeometry(
    NEUTRON_CORE_RADIUS,
    isLowTier ? 48 : 128,
    isLowTier ? 48 : 128
  );
  
  const textureLoader = new THREE.TextureLoader();
  
  const coreMaterial = new THREE.MeshBasicMaterial({
  map: null,
  color: 0xffffff,
  transparent: false,
  toneMapped: true
  });
  
  textureLoader.load(
    `${ASSET_BASE}/textures/neutron_star.png`,
    (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      coreMaterial.map = texture;
      
      coreMaterial.needsUpdate = true;
    },
    undefined,
    (err) => {
      console.warn('❌ Neutron star texture missing, using blue color');
      coreMaterial.color.setHex(0x00ccff);
    }
  );
  
  neutronStarCore = new THREE.Mesh(coreGeometry, coreMaterial);
  
  neutronStarCore.position.copy(NEBULA_CENTER);
  
  neutronStarCore.visible = false;
  
  scene.add(neutronStarCore);
  
  neutronCoreLight = new THREE.PointLight(
    0x88ccff,
    2.5,
    500,
    2
  );
  
  neutronCoreLight.position.copy(NEBULA_CENTER);
  neutronCoreLight.visible = false;
  scene.add(neutronCoreLight);
}

function createMagneticBeam() {
  const beamGeometry = new THREE.CylinderGeometry(
    BEAM_RADIUS,
    BEAM_RADIUS,
    BEAM_LENGTH,
    32,
    1,
    true 
  );
  
  const beamMaterial = new THREE.MeshBasicMaterial({
    color: 0xaaeeff,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  
  magneticBeam = new THREE.Mesh(beamGeometry, beamMaterial);
  
  magneticBeam.position.copy(NEBULA_CENTER);
  
  magneticBeam.rotation.z = BEAM_TILT_ANGLE;
  
  magneticBeam.visible = false;
  
  scene.add(magneticBeam);
}

function createParticleJets() {
  const positions = [];
  const velocities = [];
  const sizes = [];
  const opacities = [];
  
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const isNorthJet = i < PARTICLE_COUNT / 2;
    
    let y;
    if (isNorthJet) {
      y = Math.random() * (BEAM_LENGTH / 2);
    } else {
      y = -Math.random() * (BEAM_LENGTH / 2); 
    }
    
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * BEAM_RADIUS * 0.8;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    
    positions.push(x, y, z);
    
    const spreadSpeed = 5;
    const flowDirection = isNorthJet ? 1 : -1;
    
    velocities.push(
      Math.cos(angle) * spreadSpeed,
      PARTICLE_SPEED * flowDirection,
      Math.sin(angle) * spreadSpeed
    );
    
    const size = PARTICLE_SIZE_MIN + Math.random() * (PARTICLE_SIZE_MAX - PARTICLE_SIZE_MIN);
    sizes.push(size);
    
    const opacity = 0.3 + Math.random() * 0.5;
    opacities.push(opacity);
  }
  
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('velocity', new THREE.Float32BufferAttribute(velocities, 3));
  geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
  geometry.setAttribute('opacity', new THREE.Float32BufferAttribute(opacities, 1));
  
  const material = new THREE.PointsMaterial({
    color: 0xaaeeff,
    size: 3,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
    map: sharedParticleTexture
  });
  
  particleJets = new THREE.Points(geometry, material);
  
  particleJets.position.copy(NEBULA_CENTER);
  
  particleJets.rotation.z = BEAM_TILT_ANGLE;
  
  particleJets.visible = false;
  
  scene.add(particleJets);
}

function createParticleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  
  const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.3, 'rgba(170, 238, 255, 0.8)');
  gradient.addColorStop(0.6, 'rgba(170, 238, 255, 0.3)');
  gradient.addColorStop(1, 'rgba(170, 238, 255, 0)');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 32, 32);
  
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

function createAmbientDust() {
  const positions = [];
  const velocities = [];
  const sizes = [];
  const opacities = [];

  for (let i = 0; i < DUST_COUNT; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const radius = Math.random() * DUST_RANGE;
    
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);
    
    positions.push(x, y, z);

    const vx = (Math.random() - 0.5) * DUST_DRIFT_SPEED;
    const vy = (Math.random() - 0.5) * DUST_DRIFT_SPEED;
    const vz = (Math.random() - 0.5) * DUST_DRIFT_SPEED;
    
    velocities.push(vx, vy, vz);

    const size = DUST_SIZE_MIN + Math.random() * (DUST_SIZE_MAX - DUST_SIZE_MIN);
    sizes.push(size);

    const opacity = 0.15 + Math.random() * 0.35;
    opacities.push(opacity);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('velocity', new THREE.Float32BufferAttribute(velocities, 3));
  geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
  geometry.setAttribute('opacity', new THREE.Float32BufferAttribute(opacities, 1));

  const material = new THREE.PointsMaterial({
    color: 0xccddff,
    size: 1.5,
    transparent: true,
    opacity: 0.4,
    blending: THREE.NormalBlending,
    depthWrite: false,
    sizeAttenuation: true,
    map: sharedParticleTexture
  });

  ambientDust = new THREE.Points(geometry, material);

  ambientDust.position.copy(NEBULA_CENTER);

  ambientDust.visible = false;

  scene.add(ambientDust);
}

function updatePlanetMarkers() {
  if (!markerContainer) return;
  
  if (markersEnabled) {
    for (const name of markerNames) {
      const mesh = planetMeshes[name];
      const el = markers[name];
      if (!mesh || !el) continue;

      if (name === 'moon') {
        const isInspectingEarth = isInspecting && inspectTarget?.userData?.name === 'earth';
        if (!isInspectingEarth) {
          el.style.display = 'none';
          continue;
        }
      }
      
      const baseRadius = mesh.geometry.parameters.radius || 10;
      const actualWorldRadius = baseRadius * mesh.scale.y;
      mesh.getWorldPosition(tmpV);
      tmpV.y += actualWorldRadius; 
      _tmpProjected.copy(tmpV).project(camera);

      const onScreen = _tmpProjected.z < 1 && _tmpProjected.z > -1;
      if (!onScreen) {
        el.style.display = 'none';
        continue;
      }

      const x = (_tmpProjected.x * 0.5 + 0.5) * window.innerWidth;
      let y = (-_tmpProjected.y * 0.5 + 0.5) * window.innerHeight;

      y -= 20;
      el.style.display = 'flex';
      el.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
    }
  } else {
    for (const name of markerNames) {
      if (markers[name]) markers[name].style.display = 'none';
    }
  }

  if (pulsarMarkerEnabled) {
    const pulsarPos = NEBULA_CENTER;
    const el = pulsarMarkers['vela-pulsar'];
    if (el) {
      _tmpProjected.copy(pulsarPos).project(camera);
      const onScreen = (_tmpProjected.z > -1 && _tmpProjected.z < 1);
      if (!onScreen) {
          el.style.display = 'none';
      } else {
        const x = (_tmpProjected.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-_tmpProjected.y * 0.5 + 0.5) * window.innerHeight;
        el.style.display = 'flex';
        el.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
      }
    }
  } else {
    if (pulsarMarkers['vela-pulsar']) {
      pulsarMarkers['vela-pulsar'].style.display = 'none';
    }
  }
}

function getCurrentApsisMode() {
  if (isInDeepSpace) return 'none';
  if (apsisEnabled) return 'global';
  if (inspectApsisEnabled && inspectTarget) return 'inspect-' + inspectTarget.userData.name;
  return 'none';
}

function updateApsisMarkers() {
  const apsisContainer = document.getElementById('apsis-markers');
  if (!apsisContainer) return;

  const currentMode = getCurrentApsisMode();

  if (currentMode !== _lastApsisMode) {
    apsisContainer.innerHTML = '';
    cachedApsisMarkers = [];
    _lastApsisMode = currentMode;

    if (currentMode === 'global') {
      for (const mesh of Object.values(planetMeshes)) {
        const orbit = mesh?.userData?.orbit;
        if (!orbit || !orbit.userData.perihelionPos) continue;
        createApsisElements(orbit.userData.perihelionPos, orbit.userData.aphelionPos, mesh.userData.name, apsisContainer);
      }
    } else if (currentMode.startsWith('inspect-')) {
      const targetName = inspectTarget.userData.name;
      if (targetName === 'moon' && moonOrbitLine?.userData.perihelionPos) {
        createApsisElements(moonOrbitLine.userData.perihelionPos, moonOrbitLine.userData.aphelionPos, 'moon', apsisContainer);
      } else {
        const orbit = inspectTarget.userData.orbit;
        if (orbit?.userData.perihelionPos) {
          createApsisElements(orbit.userData.perihelionPos, orbit.userData.aphelionPos, targetName, apsisContainer);
        }
      }
    }
  }

  if (currentMode === 'none') return;

  updateApsisPositions(apsisContainer);
}

function createApsisElements(periPos, aphelPos, bodyName, container) {
  const isMoon = bodyName === 'moon';

  const periEl = document.createElement('div');
  periEl.className = 'apsis-marker perihelion';
  periEl.dataset.bodyName = bodyName;
  periEl.dataset.type = 'peri';
  periEl.innerHTML = `<div class="apsis-label">${isMoon ? 'PERIGEE' : 'PERIHELION'}</div><div class="apsis-dot"></div>`;
  container.appendChild(periEl);
  periEl.style.left = '0px';
  periEl.style.top = '0px';

  const aphelEl = document.createElement('div');
  aphelEl.className = 'apsis-marker aphelion';
  aphelEl.dataset.bodyName = bodyName;
  aphelEl.dataset.type = 'aphel';
  aphelEl.innerHTML = `<div class="apsis-label">${isMoon ? 'APOGEE' : 'APHELION'}</div><div class="apsis-dot"></div>`;
  container.appendChild(aphelEl);
  aphelEl.style.left = '0px';
  aphelEl.style.top = '0px';
  cachedApsisMarkers.push(periEl, aphelEl);
}

function updateApsisPositions(container) {
  cachedApsisMarkers.forEach(el => {
    const bodyName = el.dataset.bodyName;
    const type = el.dataset.type;

    let pos3D;
    if (bodyName === 'moon' && moonOrbitLine) {
      pos3D = type === 'peri' ? moonOrbitLine.userData.perihelionPos : moonOrbitLine.userData.aphelionPos;
    } else {
      const mesh = planetMeshes[bodyName];
      const orbit = mesh?.userData?.orbit;
      pos3D = type === 'peri' ? orbit?.userData.perihelionPos : orbit?.userData.aphelionPos;
    }

    if (!pos3D) { el.style.display = 'none'; return; }

    _tmpProjected.copy(pos3D).project(camera);
    const onScreen = _tmpProjected.z > -1 && _tmpProjected.z < 1;

    if (!onScreen) {
      el.style.display = 'none';
    } else {
      const x = (_tmpProjected.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-_tmpProjected.y * 0.5 + 0.5) * window.innerHeight;
      el.style.display = 'flex';
      el.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
    }
  });
}

function applyLowTierDowngrade() {
  console.warn('Low performance detected — downgrading render settings.');
  renderer.setPixelRatio(1.0);
  composer.setPixelRatio(1.0);
  const w = window.innerWidth / 2;
  const h = window.innerHeight / 2;
  bloomPass.setSize(w, h);
}

async function addMoon() {
  let earthReady = false;
    
  const earthMesh = planetMeshes['earth'];
  if (!earthMesh) {
    console.warn("⚠️ Earth not ready yet, retrying Moon load in 1 second...");
    setTimeout(addMoon, 1000);
    return;
  }
    
  await new Promise(resolve => {
    let attempts = 0;
    const maxAttempts = 100;
      const check = setInterval(() => {
        attempts++;
          if (earthMesh.position.lengthSq() > 0) { 
            clearInterval(check); 
            earthReady = true;
            resolve();
          } else if (attempts >= maxAttempts) {
            clearInterval(check);
            console.warn("Earth telemetry, timedout. Moon skipped.")
            resolve();
          }
      }, 100);
  });

  if (!earthReady) return;

  try {
    const orbitData = await fetchInitData(`/api/moon/orbit`);
    const positions = [];

    let totalDist = 0;
    orbitData.points.forEach(p => {
    const dist = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
    totalDist += dist;
    });
    const avgDist = totalDist / orbitData.points.length;

    const VISUAL_SCALE = 15 / avgDist;

    orbitData.points.forEach(p => {
      positions.push(
        p.x * VISUAL_SCALE,
        p.z * VISUAL_SCALE,
        p.y * VISUAL_SCALE
      );
    });

    if (positions.length > 0) {
      positions.push(positions[0], positions[1], positions[2]);
    }

    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array(positions);
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

    const totalPoints = positions.length / 3;
    geometry.setDrawRange(0, 0);

    const matLine = new THREE.LineBasicMaterial({
      color: 0x444444,
      opacity: 0.4,
      transparent: true,
      linewidth: 1,
      depthTest: true,
      depthWrite: false
    });
    
    moonOrbitLine = new THREE.Line(geometry, matLine);
    moonOrbitLine.renderOrder = 1;
    
    moonOrbitLine.position.copy(earthMesh.position);

    const toLocal = (p) => new THREE.Vector3(
      p.x * VISUAL_SCALE,
      p.z * VISUAL_SCALE,
      p.y * VISUAL_SCALE
    );

    moonOrbitLine.userData.perihelionPos = toLocal(orbitData.perigee);
    moonOrbitLine.userData.aphelionPos   = toLocal(orbitData.apogee);
    moonOrbitLine.userData.planetName    = 'moon';
    
    const moonRadius = 1.08;
    const moonGeo = new THREE.SphereGeometry(moonRadius, isLowTier ? 32 : 64, isLowTier ? 32 : 64);
    moonGeo.rotateY(-Math.PI / 2);
    
    const textureLoader = new THREE.TextureLoader();
    const moonMat = new THREE.MeshStandardMaterial({
      map: null,
      color: 0xffffff,
      roughness: 1.0,
      metalness: 0.0
    });
    
    textureLoader.load(
      `${ASSET_BASE}/textures/moon.jpg`,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
        moonMat.map = tex;
        moonMat.needsUpdate = true;
      },
      undefined,
      () => {
        console.warn("⚠️ Moon texture missing.");
        moonMat.color.setHex(0xaaaaaa);
      }
    );
    
    moonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonMesh.userData = { name: 'moon', orbitLine: moonOrbitLine };
    planetMeshes['moon'] = moonMesh;
    pickables.push(moonMesh);
    
    solarSystem.add(moonOrbitLine);
    solarSystem.add(moonMesh);
    moonOrbitLine.userData.visualScale = VISUAL_SCALE;
    
    let currentDrawCount = 0;
    const drawspeed = 5.5;

    function animateTrail() {
      currentDrawCount += drawspeed;

      if (currentDrawCount > totalPoints) {
        currentDrawCount = totalPoints;
      }

      moonOrbitLine.geometry.setDrawRange(0, Math.floor(currentDrawCount));
      if (currentDrawCount < totalPoints) {
        moonTrailAnimId = requestAnimationFrame(animateTrail);
      } else {
        moonTrailAnimId = null;
      }
    }

    moonTrailAnimId = requestAnimationFrame(animateTrail);
  } catch (err) {
    console.warn("Cannot load Moon data", err.message);
  }
}

const _OBLIQUITY_RAD = THREE.MathUtils.degToRad(23.4392911);
const _COS_E = Math.cos(_OBLIQUITY_RAD);
const _SIN_E = Math.sin(_OBLIQUITY_RAD);

function icrfToSceneVector(v) {
  const ex = v.x;
  const ey = v.y * _COS_E + v.z * _SIN_E;
  const ez = -v.y * _SIN_E + v.z * _COS_E;

  return new THREE.Vector3(ex, ez, ey).normalize();
}

function getPoleRaDec(name, T) {
  if (name === 'mercury') {
    return { 
      ra: 281.0103 - 0.0328 * T, 
      dec: 61.4155 - 0.0049 * T 
    };
  }
  
  if (name === 'venus') {
    return { 
      ra: 272.76, 
      dec: 67.16 
    };
  }
  
  if (name === 'earth') {
    return { 
      ra: 0.0 - 0.641 * T,
      dec: 90.0 - 0.557 * T
    };
  }
  
  if (name === 'mars') {
    return { 
      ra: 317.681 - 0.106 * T, 
      dec: 52.887 - 0.061 * T 
    };
  }
  
  if (name === 'jupiter') {
    return { 
      ra: 268.057 - 0.006 * T, 
      dec: 64.495 + 0.002 * T 
    };
  }
  
  if (name === 'saturn') {
    return { 
      ra: 40.589 - 0.036 * T, 
      dec: 83.537 - 0.004 * T 
    };
  }
  
  if (name === 'uranus') {
    return { 
      ra: 257.311, 
      dec: -15.175 
    };
  }
  
  if (name === 'neptune') {
    const N = 357.85 + 52.316 * T;
    return { 
      ra: 299.36 + 0.70 * Math.sin(THREE.MathUtils.degToRad(N)), 
      dec: 43.46 - 0.51 * Math.cos(THREE.MathUtils.degToRad(N)) 
    };
  }
  
  return null;
}


function applyIAUAxisOrientation(planetMesh, name) {
  const T = getJulianCenturiesT(new Date());
  const pole = getPoleRaDec(name, T);
  if (!pole) return;

  if (name === 'earth') {
    const poleICRF = raDecToICRFVector(pole.ra, pole.dec);
    const poleScene = icrfToSceneVector(poleICRF);
    planetMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), poleScene);
    return;
  }

  const ra  = THREE.MathUtils.degToRad(pole.ra);
  const dec = THREE.MathUtils.degToRad(pole.dec);

  const poleICRF = raDecToICRFVector(pole.ra, pole.dec);
  const poleScene = icrfToSceneVector(poleICRF);
  planetMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), poleScene);

  const N_icrf = new THREE.Vector3(-Math.sin(ra), Math.cos(ra), 0);
  const nodeScene = icrfToSceneVector(N_icrf);

  const currentX = new THREE.Vector3(1, 0, 0).applyQuaternion(planetMesh.quaternion);

  const nodeInPlane = nodeScene.clone()
  .addScaledVector(poleScene, -poleScene.dot(nodeScene))
  .normalize();

  const cosAngle = Math.max(-1, Math.min(1, currentX.dot(nodeInPlane)));
  let correctionAngle = Math.acos(cosAngle);

  const cross = new THREE.Vector3().crossVectors(currentX, nodeInPlane);
  if (cross.dot(poleScene) < 0) correctionAngle = -correctionAngle;

  const corrQuat = new THREE.Quaternion().setFromAxisAngle(poleScene, correctionAngle);
  planetMesh.quaternion.premultiply(corrQuat);
}

function addPoleLineToPlanet(planetMesh) {
  const r = planetMesh.geometry.parameters.radius;

  const points = [
    new THREE.Vector3(0, -r * 4, 0),
    new THREE.Vector3(0,  r * 4, 0),
  ];

  const geo = new THREE.BufferGeometry().setFromPoints(points);

  const mat = new THREE.LineBasicMaterial({
    color: 0x333333,
    transparent: true,
    opacity: 1.60,
    depthTest: true,
    depthWrite: false
  });

  const line = new THREE.Line(geo, mat);
  line.renderOrder = 2;
  line.visible = polesEnabled;

  planetMesh.add(line);
  planetMesh.userData.poleLine = line;
}

const _shadowWorldPos   = new THREE.Vector3();
const _shadowRingNormal = new THREE.Vector3();
const _shadowUpSource   = new THREE.Vector3(0, 1, 0);

function updateRingShadowUniforms(name) {
  const mesh = planetMeshes[name];
  if (!mesh) return;

  const planetShader = mesh.userData.shadowShader;
  const ringMesh     = mesh.userData.ringMesh;
  const ringShader   = ringMesh?.material?.userData?.ringShader;

  if (!planetShader && !ringShader) return;

  mesh.getWorldPosition(_shadowWorldPos);

  _shadowRingNormal.copy(_shadowUpSource)
  .applyQuaternion(mesh.quaternion)
  .normalize();

  const s = mesh.scale.x;

  if (planetShader) {
    planetShader.uniforms.uPlanetCenter.value.copy(_shadowWorldPos);
    planetShader.uniforms.uRingNormal.value.copy(_shadowRingNormal);
    planetShader.uniforms.uRingInner.value = mesh.userData.baseRingInner * s;
    planetShader.uniforms.uRingOuter.value = mesh.userData.baseRingOuter * s;
  }

  if (ringShader) {
    ringShader.uniforms.uPlanetCenter.value.copy(_shadowWorldPos);
    ringShader.uniforms.uPlanetRadius.value = mesh.userData.planetBaseRadius * s;
  }
}


async function addBody(name, colorHex, size, extraScale = 1) {
  try {
    const pathData = await fetchInitData(`/api/orbit/${name}`);
    const positions = [];

    pathData.points.forEach(p => {
      positions.push(p[0] * SCENE_SCALE, p[2] * SCENE_SCALE, p[1] * SCENE_SCALE);
    });
    positions.push(positions[0], positions[1], positions[2]);

    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array(positions);
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    const matLine = new THREE.LineBasicMaterial({ 
      color: 0x444444, 
      opacity: 0.4, 
      transparent: true,
      linewidth: 1,
      depthTest: true, 
      depthWrite: false
    });
    const orbitLine = new THREE.Line(geometry, matLine);
    orbitLine.renderOrder = 1;
    solarSystem.add(orbitLine);
    const toScene = (p) => new THREE.Vector3(
      (p.x ?? p[0]) * SCENE_SCALE,
      (p.z ?? p[2]) * SCENE_SCALE,
      (p.y ?? p[1]) * SCENE_SCALE
    );
    orbitLine.userData.perihelionPos = toScene(pathData.perihelion);
    orbitLine.userData.aphelionPos   = toScene(pathData.aphelion);
    orbitLine.userData.planetName    = name;

    const VISUAL_SCALE = 20 * extraScale; 

    const segments = isLowTier ? 32 : 64;
    const planetGeo = new THREE.SphereGeometry(size * VISUAL_SCALE, segments, segments);
    const textureLoader = new THREE.TextureLoader();

    const planetMat = new THREE.MeshStandardMaterial({
      map: null,
      color: 0xffffff,
      roughness: 1.0,
      metalness: 0.0,
      emissive: 0x000000,
      emissiveIntensity: 0
    });

    if (name !== 'earth') {
      textureLoader.load(
        `${ASSET_BASE}/textures/${name}.jpg`,
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
          planetMat.map = tex;
          planetMat.needsUpdate = true;
        },
        undefined,
        () => {
          console.warn(`[ERR] ${name} texture missing. Using color fallback.`);
          planetMat.map = null;
          planetMat.color.setHex(colorHex);
          planetMat.needsUpdate = true;
        }
      );
    }

    const planetMesh = new THREE.Mesh(planetGeo, planetMat);
    planetMeshes[name] = planetMesh;
    planetMesh.userData = { name, orbit: orbitLine };
    pickables.push(planetMesh);

    planetMesh.userData.baseSize = size;
    planetMesh.userData.baseExtraScale = extraScale;
    planetMesh.userData.currentVisualScale = size * 20 * extraScale;

    if (name === 'earth') {
      const dayTexture = textureLoader.load(`${ASSET_BASE}/textures/earth.jpg`, tex => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
        planetMesh.material.needsUpdate = true;
      });

      planetMesh.material = new THREE.MeshStandardMaterial({
        map: dayTexture,
        roughness: 0.8,
        metalness: 0.0,
      });

      planetMesh.userData.sunWorldDir = new THREE.Vector3(0, 0, 1);
    }

    planetMesh.renderOrder = 2;
    applyIAUAxisOrientation(planetMesh, name);

    planetMesh.userData.baseQuat = planetMesh.quaternion.clone();
  
    addPoleLineToPlanet(planetMesh);
    if (['saturn', 'uranus', 'neptune'].includes(name)) {

      const ringConfig = {
        saturn:  { inner: 1.2, outer: 2.2, texture: `${ASSET_BASE}/textures/saturn_ring.png`,  opacity: 0.8, color: 0xffffff },
        uranus: { inner: 1.45, outer: 2.05, texture: null, opacity: 0.22, color: 0x2e2e2e },
        neptune: { inner: 1.702, outer: 2.558, texture: null, opacity: 0.30, color: 0x1a1f2e }
      };

      const config = ringConfig[name];

      const innerRadius = size * VISUAL_SCALE * config.inner;
      const outerRadius = size * VISUAL_SCALE * config.outer;
      const ringGeo = new THREE.RingGeometry(innerRadius, outerRadius, 512);

      const pos = ringGeo.attributes.position;
      const v3 = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        v3.fromBufferAttribute(pos, i);
        const r = (v3.length() - innerRadius) / (outerRadius - innerRadius);
        ringGeo.attributes.uv.setXY(i, Math.max(0, Math.min(1, r)), 1);
      }

      function makeUranusInnerRingTex() {
        const W = 2048, H = 2;
        const c = document.createElement('canvas');
        c.width = W; c.height = H;
        const ctx = c.getContext('2d');
        ctx.clearRect(0, 0, W, H);

        const bands = [
          [0.000, 0.163, 0.007, 0.45],
          [0.313, 0.315, 0.032, 0.06],
          [0.339, 0.341, 0.028, 0.06],
          [0.361, 0.363, 0.026, 0.06],
          [0.498, 0.504, 0.052, 0.12],
          [0.559, 0.565, 0.044, 0.12],
          [0.660, 0.662, 0.024, 0.08],
          [0.689, 0.691, 0.028, 0.08],
          [0.732, 0.736, 0.034, 0.08],
          [0.845, 0.847, 0.016, 0.06],
          [0.910, 0.928, 0.110, 0.05],
        ];

        for (const [u0, u1, alpha, softFrac] of bands) {
          const x0 = u0 * W, x1 = u1 * W;
          const bandW = Math.max(x1 - x0, 3);
          const midX = (x0 + x1) / 2;
          const halfW = bandW / 2;
          const softPx = Math.max(halfW * softFrac, 1.5);
          const gx0 = midX - halfW - softPx;
          const gx1 = midX + halfW + softPx;
          const tw = gx1 - gx0;
          const s0 = Math.max(0.001, softPx / tw);
          const s1 = Math.min(0.999, 1 - softPx / tw);
          const grad = ctx.createLinearGradient(gx0, 0, gx1, 0);
          grad.addColorStop(0,   'rgba(255,255,255,0)');
          grad.addColorStop(s0,  `rgba(255,255,255,${alpha})`);
          grad.addColorStop(s1,  `rgba(255,255,255,${alpha})`);
          grad.addColorStop(1,   'rgba(255,255,255,0)');
          ctx.fillStyle = grad;
          ctx.fillRect(gx0, 0, tw, H);
        }

        const tex = new THREE.CanvasTexture(c);
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
        tex.needsUpdate = true;
        return tex;
      }

      function makeNeptuneAlphaTex() {
        const W = 2048, H = 2;
        const c = document.createElement('canvas');
        c.width = W; c.height = H;
        const ctx = c.getContext('2d');
        ctx.clearRect(0, 0, W, H);

        const bands = [
        [0.000, 0.052,  0.008, 0.35],
        [0.536, 0.541,  0.045, 0.12],
        [0.541, 0.745,  0.004, 0.02],
        [0.745, 0.750,  0.015, 0.12],
        [0.998, 1.000,  0.10,  0.08],
     ];

      for (const [ u0, u1, alpha, softFrac ] of bands) {
        const x0    = u0 * W;
        const x1    = u1 * W;
        const bandW = Math.max(x1 - x0, 3);
        const midX  = (x0 + x1) / 2;
        const halfW = bandW / 2;
        const soft  = Math.max(halfW * softFrac, 1.5);
        const gx0   = midX - halfW - soft;
        const gx1   = midX + halfW + soft;
        const tw    = gx1 - gx0;
        const s0    = Math.max(0.001, soft / tw);
        const s1    = Math.min(0.999, 1 - soft / tw);

        const grad  = ctx.createLinearGradient(gx0, 0, gx1, 0);
        grad.addColorStop(0,  `rgba(255,255,255,0)`);
        grad.addColorStop(s0, `rgba(255,255,255,${alpha})`);
        grad.addColorStop(s1, `rgba(255,255,255,${alpha})`);
        grad.addColorStop(1,  `rgba(255,255,255,0)`);

        ctx.fillStyle = grad;
        ctx.fillRect(gx0, 0, tw, H);
      }

      const tex = new THREE.CanvasTexture(c);
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      tex.needsUpdate = true;
      return tex;
    }

    const ringAlphaTex = (name === 'neptune') ? makeNeptuneAlphaTex() : name === 'uranus' ? makeUranusInnerRingTex() :
    textureLoader.load(config.texture, (tex) => {
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    });

    let ringMat;
    if (name === 'neptune' || name === 'uranus') {
      ringMat = new THREE.MeshStandardMaterial({
        color:       config.color,
        side:        THREE.DoubleSide,
        transparent: true,
        opacity:     config.opacity,
        alphaMap:    ringAlphaTex,
        depthWrite:  false
      });
    } else {
      ringMat = new THREE.MeshStandardMaterial({
        map:         ringAlphaTex,
        color:       config.color,
        side:        THREE.DoubleSide,
        transparent: true,
        opacity:     config.opacity,
        depthWrite:  false
      });
    }

    planetMesh.userData.baseRingInner    = innerRadius;
    planetMesh.userData.baseRingOuter    = outerRadius;
    planetMesh.userData.planetBaseRadius = innerRadius / config.inner;

    planetMesh.material.onBeforeCompile = (shader) => {
      shader.uniforms.uPlanetCenter = { value: new THREE.Vector3() };
      shader.uniforms.uRingNormal   = { value: new THREE.Vector3(0, 1, 0) };
      shader.uniforms.uRingInner    = { value: innerRadius };
      shader.uniforms.uRingOuter    = { value: outerRadius };
      shader.uniforms.uRingAlphaMap = { value: ringAlphaTex };
      shader.uniforms.uShadowStrength = { value: 1.0 };

      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
        varying vec3 vWorldPos_rs;`
      );

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vWorldPos_rs = (modelMatrix * vec4(position, 1.0)).xyz;`
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>
        varying vec3      vWorldPos_rs;
        uniform vec3      uPlanetCenter;
        uniform vec3      uRingNormal;
        uniform float     uRingInner;
        uniform float     uRingOuter;
        uniform sampler2D uRingAlphaMap;
        uniform float     uShadowStrength;`
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
        {
          vec3  Q          = vWorldPos_rs;
          vec3  toSun      = normalize(-Q);
          vec3  surfNormal = normalize(Q - uPlanetCenter);
          float NdotL      = dot(surfNormal, toSun);

          // smoothstep: 0 on night side, ramps to 1 over 4.6° at terminator, 1 on day side
          // shadow depth scales with how much sunlight was available to block — physically correct
          float litBlend = smoothstep(0.0, 0.001, NdotL);

          if (litBlend > 0.0) {
            float denom = dot(toSun, uRingNormal);
            if (abs(denom) > 0.001) {
              float t = dot(uPlanetCenter - Q, uRingNormal) / denom;
              if (t > 0.01) {
                vec3  hit  = Q + t * toSun;
                float dist = length(hit - uPlanetCenter);
                if (dist >= uRingInner && dist <= uRingOuter) {
                  float u       = (dist - uRingInner) / (uRingOuter - uRingInner);
                  vec4  tx      = texture2D(uRingAlphaMap, vec2(clamp(u, 0.0, 1.0), 0.5));
                  float density = tx.a;
                  gl_FragColor.rgb *= (1.0 - density * 0.88 * litBlend * uShadowStrength);
                }
              }
            }
          }
        }`
      );
      planetMesh.userData.shadowShader = shader;
    };

    ringMat.onBeforeCompile = (shader) => {
      shader.uniforms.uPlanetCenter = { value: new THREE.Vector3() };
      shader.uniforms.uPlanetRadius = { value: innerRadius / config.inner };
      shader.uniforms.uShadowStrength  = { value: 1.0 };

      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
        varying vec3 vWorldPos_ring;`
      );

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vWorldPos_ring = (modelMatrix * vec4(position, 1.0)).xyz;`
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>
        varying vec3  vWorldPos_ring;
        uniform vec3  uPlanetCenter;
        uniform float uPlanetRadius;
        uniform float uShadowStrength;`
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
        {
          vec3  Q    = vWorldPos_ring;
          vec3  D    = normalize(-Q);
          vec3  oc   = Q - uPlanetCenter;
          float b    = dot(D, oc);
          float cv   = dot(oc, oc) - uPlanetRadius * uPlanetRadius;
          float disc = b * b - cv;

          if (disc >= 0.0 && (-b - sqrt(disc)) > 0.05) {
            float shadowDarkness = mix(1.0, 0.08, uShadowStrength);
            gl_FragColor.rgb *= shadowDarkness;
          }
        }`
      );

      ringMat.userData.ringShader = shader;
    };

    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;

    if (name === 'uranus') {
        const outerRingDefs = [
        { inner: 2.512, outer: 2.661, color: 0x6b2a14, opacity: 0.018, isTriangle: false },
        { inner: 3.490, outer: 4.156, color: 0x1a3a99, opacity: 0.012, isTriangle: true  },
      ];

      for (const def of outerRingDefs) {
        const baseR = planetMesh.geometry.parameters.radius;
        const iR = baseR * def.inner;
        const oR = baseR * def.outer;

        const oGeo = new THREE.RingGeometry(iR, oR, 256);

        const oPos = oGeo.attributes.position;
        const ov3 = new THREE.Vector3();
        for (let i = 0; i < oPos.count; i++) {
          ov3.fromBufferAttribute(oPos, i);
          const r = (ov3.length() - iR) / (oR - iR);
          oGeo.attributes.uv.setXY(i, Math.max(0, Math.min(1, r)), 1);
        }

        const aW = 512, aH = 2;
        const aC = document.createElement('canvas');
        aC.width = aW; aC.height = aH;
        const aCtx = aC.getContext('2d');
        aCtx.clearRect(0, 0, aW, aH);
        const ag = aCtx.createLinearGradient(0, 0, aW, 0);
        if (def.isTriangle) {
          ag.addColorStop(0.00, 'rgba(255,255,255,0)');
          ag.addColorStop(0.12, 'rgba(255,255,255,0.25)');
          ag.addColorStop(0.50, 'rgba(255,255,255,1)');
          ag.addColorStop(0.88, 'rgba(255,255,255,0.25)');
          ag.addColorStop(1.00, 'rgba(255,255,255,0)');
        } else {
          ag.addColorStop(0.00, 'rgba(255,255,255,0)');
          ag.addColorStop(0.18, 'rgba(255,255,255,1)');
          ag.addColorStop(0.82, 'rgba(255,255,255,1)');
          ag.addColorStop(1.00, 'rgba(255,255,255,0)');
        }
      
        aCtx.fillStyle = ag;
        aCtx.fillRect(0, 0, aW, aH);
        const aTex = new THREE.CanvasTexture(aC);
        aTex.needsUpdate = true;

        const oMat = new THREE.MeshStandardMaterial({
          color: def.color,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: def.opacity,
          alphaMap: aTex,
          depthWrite: false,
        });

        const oMesh = new THREE.Mesh(oGeo, oMat);
        oMesh.rotation.x = -Math.PI / 2;
        planetMesh.add(oMesh);
      }
    }
    planetMesh.add(ringMesh);
    planetMesh.userData.ringMesh = ringMesh;
  }
  solarSystem.add(planetMesh);
  } catch (err) {
    console.warn(` Failed to load "${name}":`, err.message);
  }
}

function applySizePreset(presetName) {
  if (!SIZE_PRESETS[presetName]) {
    console.error(`Preset "${presetName}" not found!`);
    return;
  }
    
  const preset = SIZE_PRESETS[presetName];
  currentPreset = presetName;
    
  for (const [planetName, planetMesh] of Object.entries(planetMeshes)) {
    if (!preset[planetName]) continue;
    
    const { size, extraScale } = preset[planetName];
    const VISUAL_SCALE = 20 * extraScale;
    const newRadius = size * VISUAL_SCALE;
    
    const currentRadius = planetMesh.geometry.parameters.radius;
    const scaleFactor = newRadius / currentRadius;
    
    planetMesh.scale.setScalar(scaleFactor);
    
    planetMesh.userData.currentVisualScale = newRadius;
  }
    
}

function applyLightingMode(modeName) {
  if (!LIGHTING_PRESETS[modeName]) return;
  
  const mode = LIGHTING_PRESETS[modeName];
  currentLightingMode = modeName;
  
  const allMeshes = [...Object.values(planetMeshes)];
  if (moonMesh) allMeshes.push(moonMesh);

  const shadowStrength = (modeName === 'studio') ? 0.0 : 1.0;
  for (const mesh of allMeshes) {
    if (mesh?.userData?.shadowShader) {
      mesh.userData.shadowShader.uniforms.uShadowStrength.value = shadowStrength;
  }
    if (mesh?.userData?.ringMesh?.userData?.ringShader) {
      mesh.userData.ringMesh.userData.ringShader.uniforms.uShadowStrength.value = shadowStrength;
    }
  }
    
  if (modeName === 'studio') {
    ambientLight.intensity = 0;

    allMeshes.forEach(parentMesh => {
      parentMesh.traverse(mesh => {
        if (mesh.isMesh) {
          if (!mesh.userData.standardMat) {
              mesh.userData.standardMat = mesh.material;
          }
          
          if (!mesh.userData.basicMat) {
            const origMat = mesh.userData.standardMat;                        
            const safeColor = origMat.color.clone().multiplyScalar(0.28);
            
            mesh.userData.basicMat = new THREE.MeshBasicMaterial({
              map: origMat.map,
              color: safeColor,
              transparent: origMat.transparent,     
              opacity: origMat.opacity,             
              side: origMat.side,                   
              alphaMap: origMat.alphaMap            
            });
          }
          mesh.material = mesh.userData.basicMat;
          mesh.material.needsUpdate = true;
        }
      });
    });
  } else {
    ambientLight.intensity = mode.ambientIntensity;
    ambientLight.color.setHex(mode.ambientColor);

    allMeshes.forEach(parentMesh => {
      parentMesh.traverse(mesh => {
      if (mesh.isMesh && mesh.userData.standardMat) {
          mesh.material = mesh.userData.standardMat;
          mesh.material.needsUpdate = true;
        }
      });
    });
  }
}

async function updateAllTelemetry() {
  try {
    const res = await fetch(`${API_URL}/api/telemetry/batch`);
    lastSeenAliveOrRebooting = Date.now();
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const allData = await res.json();

    for (const [name, data] of Object.entries(allData)) {
      if (name === 'moon' || name === 'error') continue;

      const mesh = planetMeshes[name];
      if (!mesh || !data.position) continue;

      mesh.position.set(
        data.position.x * SCENE_SCALE,
        data.position.z * SCENE_SCALE, 
        data.position.y * SCENE_SCALE
      );

      if (name === 'earth' && data.subsolar) {
        const sunDir = mesh.position.clone().negate().normalize();
        const sunAzimuth = Math.atan2(sunDir.z, sunDir.x);
        const subLon_rad = THREE.MathUtils.degToRad(data.subsolar.longitude);
                
        earthRotationAngle = -subLon_rad - sunAzimuth;
        earthRotAnchorTime = Date.now();
                
        if (!mesh.userData.sunWorldDir) mesh.userData.sunWorldDir = new THREE.Vector3();
        mesh.userData.sunWorldDir.copy(sunDir);
      }

      if (name !== 'earth' && data.spin_angle_deg !== undefined) {
        mesh.userData.apiSpinAngle = THREE.MathUtils.degToRad(data.spin_angle_deg);
        mesh.userData.rotAnchorTime = Date.now();
      }

      if (isInspecting && inspectTarget?.userData?.name === name) {
        updateDashboardInfo(name, data);
      }

      if (pinnedBodies.includes(name)) {
        updateHUDCard(name, data);
      }
    }

    const moonData = allData['moon'];
    const earthMesh = planetMeshes['earth'];
        
    if (moonData && moonMesh && earthMesh && moonOrbitLine) {

      const vScale = moonOrbitLine.userData.visualScale || 15;

      const localX = moonData.position.x * vScale;
      const localY = moonData.position.z * vScale;
      const localZ = moonData.position.y * vScale;

      if (!moonMesh.userData.targetPos) {
        moonMesh.userData.targetPos = new THREE.Vector3();
        moonMesh.position.set(
          earthMesh.position.x + localX,
          earthMesh.position.y + localY,
          earthMesh.position.z + localZ
        )
      }
      
      moonMesh.userData.targetPos.set(
        earthMesh.position.x + localX,
        earthMesh.position.y + localY,
        earthMesh.position.z + localZ
      );
            
      moonOrbitLine.position.copy(earthMesh.position);
      if (moonOrbitLine.userData.perihelionPos) {
        if (!moonOrbitLine.userData.localPeriPos) {
          moonOrbitLine.userData.localPeriPos = moonOrbitLine.userData.perihelionPos.clone();
          moonOrbitLine.userData.localAphelPos = moonOrbitLine.userData.aphelionPos.clone();
        }

        moonOrbitLine.userData.perihelionPos = moonOrbitLine.userData.localPeriPos.clone().add(earthMesh.position);
        moonOrbitLine.userData.aphelionPos = moonOrbitLine.userData.localAphelPos.clone().add(earthMesh.position);
      }

      earthMesh.getWorldPosition(tmpTargetPosW);
      moonMesh.up.set(0, 1, 0).applyEuler(solarSystem.rotation);
      moonMesh.lookAt(tmpTargetPosW);

      if (isInspecting && inspectTarget === moonMesh) {
        updateDashboardInfo('moon', moonData);
      }

      if (pinnedBodies.includes('moon')) {
        updateHUDCard('moon', moonData);
      }
    }

    lastSuccessMs = Date.now();
    hasSeenReboot = false;
    everSucceeded = true;
    setLiveState('active');

  } catch (err) {
    const now = Date.now();
    const isHardOffline = !err.message.includes('HTTP');
        
    if (!isHardOffline) {
      hasSeenReboot = true; 
      lastSeenAliveOrRebooting = now;
    }

    if (isHardOffline && !hasSeenReboot && !everSucceeded) {
      setLiveState('inactive');
    } else {
      if (now - lastSeenAliveOrRebooting > 5000) {
        setLiveState('inactive');
      } else {
        setLiveState('rebooting');
      }
    }
  }

  setTimeout(updateAllTelemetry, 1000);
}


// Inner planets: Standard scale
addBody('mercury', 0xaaaaaa, 0.15);
addBody('venus',   0xffcc00, 0.25);
addBody('earth',   0x2233ff, 0.25);
addBody('mars',    0xff3300, 0.18);
addBody('jupiter', 0xd2b48c, 0.8, 2);
addBody('saturn',  0xf4d03f, 0.7, 2.5); 
addBody('uranus',  0x73c6b6, 0.6, 4);
addBody('neptune', 0x2e86c1, 0.6, 4);
addMoon();
updateAllTelemetry();

applyLightingMode(currentLightingMode);

createStars();
sharedParticleTexture = createParticleTexture();
createNeutronStarCore();
createMagneticBeam();
createParticleJets();
createAmbientDust();
animate();

// EVENT LISTENERS
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);

  const currentDpr = runtimeLowTier
  ? 1.0
  : Math.min(window.devicePixelRatio, 2);

  renderer.setPixelRatio(currentDpr);
  
  composer.setSize(window.innerWidth, window.innerHeight);
  composer.setPixelRatio(currentDpr);

  const currentBloomDivider = runtimeLowTier ? 2 : 1;
  bloomPass.setSize(
    (window.innerWidth * currentDpr) / currentBloomDivider,
    (window.innerHeight * currentDpr) / currentBloomDivider
  );

  const hsCanvas = document.getElementById('hyperspace-canvas');
  if (hsCanvas) {
    const hsCtx = hsCanvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    
    hsCanvas.width = window.innerWidth * dpr;
    hsCanvas.height = window.innerHeight * dpr;
    
    hsCtx.setTransform(1, 0, 0, 1, 0, 0); 
    hsCtx.scale(dpr, dpr);
  }
});

// Raycaster and Mouse Setup
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let currentHoveredOrbit = null;
const label = document.getElementById('planet-label');

let _lastCursor = 'default';
function setCursor(val) {
  if (val !== _lastCursor) {
    document.body.style.cursor = val;
    _lastCursor = val;
  }
}


window.addEventListener('pointermove', (event) => {

  if (event.pointerType ==='touch') {
    if (label) label.style.display = 'none';
    if (currentHoveredOrbit) {
      currentHoveredOrbit.material.color.setHex(0x444444);
      currentHoveredOrbit.material.opacity = 0.4;
      currentHoveredOrbit.renderOrder = 1;
      currentHoveredOrbit = null;
    }
    setCursor('default');
    return;
  }
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  if (isInDeepSpace) {
    if (label) label.style.display = 'none';
    setCursor('default');
    return;
  }
  
  const intersects = raycaster.intersectObjects(pickables, true);

  let foundPlanet = false;

  if (currentHoveredOrbit) {
    currentHoveredOrbit.material.color.setHex(0x444444);
    currentHoveredOrbit.material.opacity = 0.4;
    currentHoveredOrbit.renderOrder = 1;
    currentHoveredOrbit = null;
  }

  for (let hit of intersects) {
    if (hit.object.type === 'Mesh') {
      foundPlanet = true;
      
      if (label) {
        label.style.display = 'block';
        label.style.left = event.clientX + 15 + 'px';
        label.style.top = event.clientY + 15 + 'px';
        let obj = hit.object;
        while (obj && !(obj.userData && obj.userData.name)) obj = obj.parent;
        const name = (obj && obj.userData && obj.userData.name) ? obj.userData.name : 'sun';

        label.innerText = name.toUpperCase();
      }

      if (!isInspecting) {
        const root = getNamedRoot(hit.object);
        const name = root?.userData?.name;
        
        if (name === 'moon' && moonOrbitLine) {
          moonOrbitLine.material.color.setHex(0xe8e8e8)
          moonOrbitLine.material.opacity = 1.0;
          moonOrbitLine.renderOrder = 100;
          currentHoveredOrbit = moonOrbitLine;
        } else {
          const orbit = root?.userData?.orbit;
          if (orbit) {
            orbit.material.color.setHex(0xe8e8e8)
            orbit.material.opacity = 1.0;
            orbit.renderOrder = 100;
            currentHoveredOrbit = orbit;
          }
        }
      }

      setCursor('pointer');
      break; 
    }
  }

  if (!foundPlanet) {
    if (label) label.style.display = 'none';
    setCursor('default');
  }
});

canvas.addEventListener('pointerdown', (event) => {
  pointerDownX = event.clientX;
  pointerDownY = event.clientY;
});

canvas.addEventListener('pointerup', (event) => {
  const dx = event.clientX - pointerDownX;
  const dy = event.clientY - pointerDownY;
  
  if (Math.sqrt(dx * dx + dy * dy) > 6) return; 

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  if (isInDeepSpace) {
    if (neutronStarCore && neutronStarCore.visible) {
      const hits = raycaster.intersectObject(neutronStarCore);
      if (hits.length > 0) {
        const panel = document.getElementById('pulsar-info-panel');
        if (panel) {
          panel.style.display = (panel.style.display === 'block') ? 'none' : 'block';
        }
      }
    }
    return;
  }

  if (!iconsEnabled) return;

  const hits = raycaster.intersectObjects(pickables, true);

  if (!hits.length) return;

  const root = getNamedRoot(hits[0].object);
  if (!root?.userData?.name) return;

  if (root.userData.name === 'sun') {
    exitInspect();
    return;
  }

  if (!isInspecting || inspectTarget !== root) {
    enterInspect(root);
  }
});

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  checkRuntimePerformance(dt);

  if (moonMesh && moonMesh.userData.targetPos) {
    const lerpfactor = 1 - Math.exp(-5 * dt);
    moonMesh.position.lerp(moonMesh.userData.targetPos, lerpfactor);

    if (planetMeshes['earth']) {
      planetMeshes['earth'].getWorldPosition(tmpTargetPosW);
      moonMesh.up.set(0, 1, 0);
      moonMesh.lookAt(tmpTargetPosW);
    }
  }

  const _curCamDist = camera.position.length();
  if (Math.abs(_curCamDist - _lastStarCamDist) > 10) {
    updateStarVisibility();
    _lastStarCamDist = _curCamDist;
  }

  for (const [name, mesh] of Object.entries(planetMeshes)) {
    if (!mesh || !mesh.userData.baseQuat) continue;

    if (name === 'earth' && earthRotAnchorTime !== null) {
      const dtSec = (Date.now() - earthRotAnchorTime) / 1000;
      const currentSpin = earthRotationAngle + PLANET_SPIN_RATES['earth'] * dtSec;
      tmpSpinQuat.setFromAxisAngle(tmpSpinAxis, currentSpin);
      mesh.quaternion.copy(mesh.userData.baseQuat).multiply(tmpSpinQuat);

    } else if (mesh.userData.rotAnchorTime !== undefined) {
      
      const dtSec = (Date.now() - mesh.userData.rotAnchorTime) / 1000;
      const speed = PLANET_SPIN_RATES[name] || 0;
      const currentSpin = mesh.userData.apiSpinAngle + (speed * dtSec);
      tmpSpinQuat.setFromAxisAngle(tmpSpinAxis, currentSpin);
      mesh.quaternion.copy(mesh.userData.baseQuat).multiply(tmpSpinQuat);
    }
  }

  if (animT < 1) {
    animT = Math.min(1, animT + dt / transitionDuration);
    const k = animT * animT * (3 - 2 * animT);
    camera.position.lerpVectors(animFromPos, animToPos, k);
    controls.target.lerpVectors(animFromTgt, animToTgt, k);
  }

  if (isInDeepSpace && neutronStarCore) {
    let revealProgress = 0;
    if (animT > 0.5) {
      revealProgress = (animT - 0.5) / 0.5; 
    }

    const easeScale = revealProgress * revealProgress * revealProgress;
    const currentScale = Math.max(0.001, easeScale);
    neutronStarCore.scale.setScalar(currentScale);
    if (magneticBeam) magneticBeam.scale.setScalar(currentScale);
    if (particleJets) particleJets.scale.setScalar(currentScale);
    if (ambientDust) ambientDust.scale.setScalar(currentScale);
  }

  if (isInspecting && inspectTarget) {
    inspectTarget.getWorldPosition(tmpTargetPosW);
    tmpDelta.copy(tmpTargetPosW).sub(lastTargetPos);
    camera.position.add(tmpDelta);
    controls.target.copy(tmpTargetPosW);
    lastTargetPos.copy(tmpTargetPosW);
    const d = camera.position.distanceTo(controls.target);
    const near0 = inspectRadius * 2.0;
    const near1 = inspectRadius * 9.0;
    let t = (d - near0) / (near1 - near0);
    t = Math.max(0, Math.min(1, t));
    setAllOrbitOpacity(t);
  }

  controls.update(dt);
  updatePlanetMarkers();

  if (isInDeepSpace && neutronStarCore && neutronStarCore.visible) {
    neutronStarCore.rotation.y += currentRotationSpeed * dt;
    if (magneticBeam) {
      magneticBeam.rotation.y += currentRotationSpeed * dt;
    }
  }

  if (isInDeepSpace && particleJets && particleJets.visible) {
    particleJets.rotation.y += currentRotationSpeed * dt;
    const positions = particleJets.geometry.attributes.position.array;
    const velocities = particleJets.geometry.attributes.velocity.array;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const isNorthJet = i < PARTICLE_COUNT / 2;
      positions[i3] += velocities[i3] * dt;
      positions[i3 + 1] += velocities[i3 + 1] * dt;
      positions[i3 + 2] += velocities[i3 + 2] * dt;

      if (isNorthJet) {
        if (positions[i3 + 1] > BEAM_LENGTH / 2) {
          positions[i3 + 1] = 0;
          const angle = Math.random() * Math.PI * 2;
          const radius = Math.random() * BEAM_RADIUS * 0.8;
          positions[i3] = Math.cos(angle) * radius;
          positions[i3 + 2] = Math.sin(angle) * radius;
        }
      } else {
        if (positions[i3 + 1] < -BEAM_LENGTH / 2) {
          positions[i3 + 1] = 0;
          const angle = Math.random() * Math.PI * 2;
          const radius = Math.random() * BEAM_RADIUS * 0.8;
          positions[i3] = Math.cos(angle) * radius;
          positions[i3 + 2] = Math.sin(angle) * radius;
        }
      }
    }

    particleJets.geometry.attributes.position.needsUpdate = true;
  }

  if (isInDeepSpace && ambientDust && ambientDust.visible) {
    const positions = ambientDust.geometry.attributes.position.array;
    const velocities = ambientDust.geometry.attributes.velocity.array;

    for (let i = 0; i < DUST_COUNT; i++) {
      const i3 = i * 3;
      positions[i3] += velocities[i3] * dt;
      positions[i3 + 1] += velocities[i3 + 1] * dt;
      positions[i3 + 2] += velocities[i3 + 2] * dt;
      const dx = positions[i3];
      const dy = positions[i3 + 1];
      const dz = positions[i3 + 2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist > DUST_RANGE) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const newRadius = Math.random() * DUST_RANGE * 0.3;
        positions[i3] = newRadius * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = newRadius * Math.sin(phi) * Math.sin(theta);
        positions[i3 + 2] = newRadius * Math.cos(phi);
        velocities[i3] = (Math.random() - 0.5) * DUST_DRIFT_SPEED;
        velocities[i3 + 1] = (Math.random() - 0.5) * DUST_DRIFT_SPEED;
        velocities[i3 + 2] = (Math.random() - 0.5) * DUST_DRIFT_SPEED;
      }
    }

    ambientDust.geometry.attributes.position.needsUpdate = true;
  }

  if (!isInDeepSpace && currentLightingMode !== 'studio' ) {
    updateRingShadowUniforms('saturn');
    updateRingShadowUniforms('uranus');
    updateRingShadowUniforms('neptune');
  }

  composer.render();
  updateApsisMarkers();
}


function getStarColorFromSpectralType(spectralType, ci) {
  if (spectralType && spectralType.length > 0) {
    const type = spectralType.charAt(0).toUpperCase();
    
    switch(type) {
      case 'O':
        return { r: 0.4, g: 0.6, b: 1.0 };
      case 'B':
        return { r: 0.6, g: 0.75, b: 1.0 };
      case 'A':
        return { r: 0.95, g: 0.97, b: 1.0 };
      case 'F':
        return { r: 1.0, g: 0.98, b: 0.8 };
      case 'G':
        return { r: 1.0, g: 0.9, b: 0.6 };
      case 'K':
        return { r: 1.0, g: 0.7, b: 0.4 };
      case 'M':
        return { r: 1.0, g: 0.5, b: 0.3 };
      default:
        break;
    }
  }
  
  const t = Math.max(-0.4, Math.min(2.0, ci));
  
  if (t < 0.0) {
    return { r: 0.5, g: 0.65, b: 1.0 };
  } else if (t < 0.3) {
    return { r: 0.75, g: 0.85, b: 1.0 };
  } else if (t < 0.6) {
    return { r: 1.0, g: 0.98, b: 0.9 };
  } else if (t < 1.0) {
    return { r: 1.0, g: 0.9, b: 0.65 };
  } else if (t < 1.5) {
    return { r: 1.0, g: 0.7, b: 0.4 };
  } else {
    return { r: 1.0, g: 0.55, b: 0.3 };
  }
}

async function createStars() {
  let stars;
  try {
    const response = await fetch(`${ASSET_BASE}/stars/stars_final.json`);
    if (!response.ok) throw new Error(`HTTP ${response.status} — not found at ./stars/stars_final.json`);
    stars = await response.json();
  } catch (err) {
    console.error('❌ createStars() failed:', err.message);
    return;
  }

  const positions = new Float32Array(stars.length * 3);
  const colors    = new Float32Array(stars.length * 3);
  const sizes     = new Float32Array(stars.length);
  const opacities = new Float32Array(stars.length);

  stars.forEach((s, i) => {
    positions[i * 3]     = s.x;
    positions[i * 3 + 1] = s.y;
    positions[i * 3 + 2] = s.z;
    colors[i * 3]        = s.r;
    colors[i * 3 + 1]    = s.g;
    colors[i * 3 + 2]    = s.b;
    sizes[i]             = s.size;
    opacities[i]         = s.opacity;
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position',    new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('starColor',   new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('starSize',    new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('starOpacity', new THREE.BufferAttribute(opacities, 1));

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0.00, 'rgba(255,255,255,1.00)');
  grad.addColorStop(0.10, 'rgba(255,255,255,0.95)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.70)');
  grad.addColorStop(0.50, 'rgba(255,255,255,0.25)');
  grad.addColorStop(0.75, 'rgba(255,255,255,0.06)');
  grad.addColorStop(1.00, 'rgba(255,255,255,0.00)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const starTexture = new THREE.CanvasTexture(canvas);

  const material = new THREE.ShaderMaterial({
    uniforms: { uTexture: { value: starTexture } },
    vertexShader: `
      attribute float starSize;
      attribute vec3  starColor;
      attribute float starOpacity;
      varying   vec3  vColor;
      varying   float vOpacity;
      void main() {
        vColor       = starColor;
        vOpacity     = starOpacity;
        gl_Position  = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = starSize;
      }
    `,
    fragmentShader: `
      uniform sampler2D uTexture;
      varying vec3  vColor;
      varying float vOpacity;
      void main() {
        vec4 tex = texture2D(uTexture, gl_PointCoord);
        if (tex.a < 0.01) discard;
        gl_FragColor = vec4(vColor * tex.rgb, tex.a * vOpacity);
      }
    `,
    transparent: true,
    depthWrite:  false,
    blending:    THREE.AdditiveBlending,
    fog:         false,
  });

  const starField = new THREE.Points(geometry, material);
  starField.rotation.x = -23.4 * THREE.MathUtils.DEG2RAD;
  scene.add(starField);
  
  window.starFieldMesh = starField;

  const totalStars = stars.length;
  const lod0 = new Float32Array(totalStars);
  const lod1 = new Float32Array(totalStars);
  const lod2 = new Float32Array(totalStars);
  const lod3 = new Float32Array(totalStars);

  for (let i = 0; i < totalStars; i++) {
    const s = sizes[i]; 
    lod3[i] = s;
    lod2[i] = s > 0.5  ? s : 0;
    lod1[i] = s > 1.0  ? s : 0;
    lod0[i] = s > 1.5  ? s : 0;
  }

  window.starLODBuckets = [lod0, lod1, lod2, lod3];

}


function createPulsarMarker() {
  if (!markerContainer) return;
    
  const el = document.createElement('div');
  el.className = 'planet-marker pulsar-marker';
  el.dataset.name = 'vela-pulsar';
  el.innerHTML = `
    <div class="marker-label">Vela Pulsar</div>
    <div class="marker-dot pulsar-dot"></div>
  `;
    
  el.style.cursor = 'pointer';
  el.style.pointerEvents = 'auto';
  el.style.zIndex = '1000';
    
  el.addEventListener('click', (e) => {
    e.stopPropagation();

    if (isInspecting) return;
    
    triggerHyperspaceJump(); 

    enterDeepSpaceMode();
  });
    
  markerContainer.appendChild(el);
  el.style.left = '0px';
  el.style.top = '0px';
  pulsarMarkers['vela-pulsar'] = el;
    
}

function updateStarVisibility() {
  if (!window.starFieldMesh || !window.starLODBuckets) return;

  const camDist = camera.position.length();
  let lodLevel;
  if (camDist < 500) lodLevel = 0;
  else if (camDist < 2000) lodLevel = 1;
  else if (camDist < 5000) lodLevel = 2;
  else lodLevel = 3;

  if (lodLevel === _lastLODLevel) return;
  _lastLODLevel = lodLevel;

  const sizeAttr = window.starFieldMesh.geometry.getAttribute('starSize');
  if (sizeAttr) {
    sizeAttr.array.set(window.starLODBuckets[lodLevel]); 
    sizeAttr.needsUpdate = true;
  }
}

const menuTriggerBtn = document.getElementById('menu-trigger');
const toolbarTray = document.getElementById('toolbar-tray');
const toolbarContainer = document.getElementById('toolbar-container');

const btnB1 = document.getElementById('btn-b1');
const popoverB1 = document.getElementById('popover-b1');
const btnB2 = document.getElementById('btn-b2');
const popoverB2 = document.getElementById('popover-b2');
const btnB3 = document.getElementById('btn-b3');
const popoverB3 = document.getElementById('popover-b3');

function closeAllPopovers() {
  if (popoverB1) { popoverB1.classList.add('hidden'); btnB1.classList.remove('active'); }
  if (popoverB2) { popoverB2.classList.add('hidden'); btnB2.classList.remove('active'); }
  if (popoverB3) { popoverB3.classList.add('hidden'); btnB3.classList.remove('active'); }
}

if (menuTriggerBtn && toolbarTray) {
  menuTriggerBtn.addEventListener('click', (e) => {
    e.stopPropagation(); 
    const isCollapsed = toolbarTray.classList.contains('collapsed');
    
    if (isCollapsed) {
      toolbarTray.classList.remove('collapsed');
      menuTriggerBtn.classList.add('active');
    } else {
      toolbarTray.classList.add('collapsed');
      menuTriggerBtn.classList.remove('active');
      closeAllPopovers();
    }
  });

  const setupBoxToggle = (btn, popover) => {
    if (btn && popover) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isCurrentlyHidden = popover.classList.contains('hidden');
        
        closeAllPopovers();
        
        if (isCurrentlyHidden) {
          popover.classList.remove('hidden');
          btn.classList.add('active');
        }
      });
    }
  };

  setupBoxToggle(btnB1, popoverB1);
  setupBoxToggle(btnB2, popoverB2);
  setupBoxToggle(btnB3, popoverB3);

  document.addEventListener('click', (e) => {
    if (popoverB1 && popoverB1.contains(e.target)) return;
    if (popoverB2 && popoverB2.contains(e.target)) return;
    if (popoverB3 && popoverB3.contains(e.target)) return;
      
    if (toolbarContainer && toolbarContainer.contains(e.target)) {
      if (e.target !== btnB1 && e.target !== btnB2 && e.target !== btnB3) {
        closeAllPopovers();
      }
      return; 
    }

    toolbarTray.classList.add('collapsed');
    menuTriggerBtn.classList.remove('active');
    closeAllPopovers();
  });
}

const btnFullscreen = document.getElementById('btn-fullscreen');
const iconEnterFs = document.getElementById('icon-enter-fs');
const iconExitFs = document.getElementById('icon-exit-fs');

if (btnFullscreen) {
  btnFullscreen.addEventListener('click', (e) => {
    e.stopPropagation();
        
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.log(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  });
}

document.addEventListener('fullscreenchange', () => {
  if (document.fullscreenElement) {
    iconEnterFs.style.display = 'none';
    iconExitFs.style.display = 'block';
    btnFullscreen.classList.add('active');
  } else {
    iconEnterFs.style.display = 'block';
    iconExitFs.style.display = 'none';
    btnFullscreen.classList.remove('active');
  }
});

const toggleGridBtn = document.getElementById('toggle-grid');
let gridEnabled = false;
gridHelper.visible = gridEnabled;


if (toggleGridBtn) {
  toggleGridBtn.addEventListener('click', () => {
    gridEnabled = !gridEnabled;
    toggleGridBtn.classList.toggle('active', gridEnabled);
    gridHelper.visible = gridEnabled;
  });
}

const btnInspectOptions = document.getElementById('btn-inspect-options');
const popoverInspectOptions = document.getElementById('popover-inspect-options');

if (btnInspectOptions && popoverInspectOptions) {
  btnInspectOptions.addEventListener('click', (e) => {
    e.stopPropagation();
    
    if (typeof closeAllPopovers === 'function') closeAllPopovers(); 
    
    const isHidden = popoverInspectOptions.classList.contains('hidden');
    if (isHidden) {
      popoverInspectOptions.classList.remove('hidden');
      btnInspectOptions.classList.add('active');
    } else {
      popoverInspectOptions.classList.add('hidden');
      btnInspectOptions.classList.remove('active');
    }
  });
}

document.addEventListener('click', (e) => {
  if (popoverInspectOptions && !popoverInspectOptions.contains(e.target) && e.target !== btnInspectOptions) {
    popoverInspectOptions.classList.add('hidden');
    btnInspectOptions?.classList.remove('active');
  }
});


if (dashboardMinBar) {
  dashboardMinBar.addEventListener('click', (e) => {
    e.stopPropagation();
    if (dashboardState === 'minimized') {
      maximizeDashboard();
    }
  });
}

const dashboardHeader = document.querySelector('.panel-header');
if (dashboardHeader) {
  dashboardHeader.style.cursor = 'pointer';
  dashboardHeader.addEventListener('click', (e) => {
    e.stopPropagation();
    if (dashboardState === 'maximized') {
      minimizeDashboard();
    }
  });
}

window.addEventListener('click', (e) => {
  if (!isInspecting) return;
  if (dashboardState !== 'maximized') return;
  
  if (dashboardEl && dashboardEl.contains(e.target)) return;
  
  if (e.target.id === 'exit-inspect') return;
  
  minimizeDashboard();
});

document.getElementById('btn-toggle-autorotate')?.addEventListener('click', (e) => {
  if (!inspectTarget) return;
  controls.autoRotate = !controls.autoRotate;
  e.target.classList.toggle('active', controls.autoRotate);
});

document.getElementById('btn-toggle-apsis')?.addEventListener('click', (e) => {
  toggleInspectApsis();
});

const toggleApsisBtn = document.getElementById('toggle-apsis');
if (toggleApsisBtn) {
  toggleApsisBtn.addEventListener('click', () => {
    apsisEnabled = !apsisEnabled;
    toggleApsisBtn.classList.toggle('active', apsisEnabled);
  });
}

const preset1Btn = document.getElementById('preset1-btn');
const preset2Btn = document.getElementById('preset2-btn');

if (preset1Btn && preset2Btn) {
  preset1Btn.addEventListener('click', () => {
    applySizePreset('preset1');
    
    preset1Btn.classList.add('active');
    preset2Btn.classList.remove('active');
  });
    
  preset2Btn.addEventListener('click', () => {
    applySizePreset('preset2');
    
    preset2Btn.classList.add('active');
    preset1Btn.classList.remove('active');
  });
}

['lighting-realistic', 'lighting-enhanced', 'lighting-studio'].forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('click', function () {
      ['lighting-realistic', 'lighting-enhanced', 'lighting-studio'].forEach(bid => {
        document.getElementById(bid)?.classList.remove('active');
      });
      this.classList.add('active');
      const mode = id.replace('lighting-', '');
      applyLightingMode(mode);
      currentLightingMode = mode;
  });
});

// Hyperspace Transition
const hsOverlay = document.getElementById('hyperspace-overlay');
const hsCanvas = document.getElementById('hyperspace-canvas');
const hsCtx = hsCanvas ? hsCanvas.getContext('2d') : null;

let hsStars = [];
let hsAnimationId;
let hsSpeed = 0;
let hsOpacity = 1; 
let hsTimers = [];
let hsIntervals = [];

const FOV = 300; 

class WarpStar {
  constructor() {
    this.reset(true);
  }

  reset(initial = false) {
    if (initial) {
      this.z = Math.random() * 2000;
    } else {
      this.z = 1900 + Math.random() * 200;
    }

    const maxZ = 2000;
    const scale = maxZ / FOV;

    const screenDiagonal = Math.sqrt(window.innerWidth**2 + window.innerHeight**2) / 2;
    
    const maxRadius = screenDiagonal * scale * 2.2;

    const angle = Math.random() * Math.PI * 2;
    
    const radius = Math.sqrt(Math.random()) * maxRadius;

    const radiusVariation = (Math.random() - 0.5) * 50;

    this.x = Math.cos(angle) * (radius + radiusVariation);
    this.y = Math.sin(angle) * (radius + radiusVariation);
    
    this.distanceFromCenter = Math.sqrt(this.x * this.x + this.y * this.y);
  }

  update() {
    this.z -= (20 + hsSpeed * 1000); 
    
    if (this.z <= 1) { 
      this.reset();
    }
  }

  draw() {
    if (!hsCtx) return;
    
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;

    const scale = FOV / this.z;
    const x_screen = this.x * scale + cx;
    const y_screen = this.y * scale + cy;

    const dx = x_screen - cx;
    const dy = y_screen - cy;
    const stretchFactor = hsSpeed * 0.5;
    const tailX = x_screen - (dx * stretchFactor);
    const tailY = y_screen - (dy * stretchFactor);

    const buffer = 600;
    const headOffScreen = x_screen < -buffer || x_screen > window.innerWidth + buffer || y_screen < -buffer || y_screen > window.innerHeight + buffer;
    const tailOffScreen = tailX < -buffer || tailX > window.innerWidth + buffer || tailY < -buffer || tailY > window.innerHeight + buffer;
    
    if (headOffScreen && tailOffScreen) {
      return;
    }

    const screenDistFromCenter = Math.sqrt(dx * dx + dy * dy);
    const maxScreenDist = Math.sqrt(cx * cx + cy * cy);
    
    const edgeFade = 1.0 - Math.min(screenDistFromCenter / maxScreenDist, 1.0);
    
    const smoothFade = Math.pow(edgeFade, 0.6);

    const sparkle = (Math.random() * 0.3) + 0.7;
    const finalOpacity = hsOpacity * sparkle * smoothFade;

    if (finalOpacity < 0.05) return;

    hsCtx.beginPath();
    hsCtx.strokeStyle = `rgba(255, 255, 255, ${finalOpacity})`;
    
    const size = Math.min(3, scale * 2); 
    hsCtx.lineWidth = size;
    
    hsCtx.moveTo(tailX, tailY);
    hsCtx.lineTo(x_screen, y_screen);
    hsCtx.stroke();
  }
}

function animateHyperspace() {
  hsCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  hsStars.forEach(star => {
    star.update();
    star.draw();
  });
    
  hsAnimationId = requestAnimationFrame(animateHyperspace);
}

function clearHyperspaceTimers() {
  hsTimers.forEach(id => clearTimeout(id));
  hsIntervals.forEach(id => clearInterval(id));
  hsTimers = [];
  hsIntervals = [];
}

function triggerHyperspaceJump(isReverse = false) {
  if (!hsOverlay || !hsCanvas) return;

  clearHyperspaceTimers();

  hsCanvas.width = window.innerWidth;
  hsCanvas.height = window.innerHeight;
  
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  hsCanvas.width = window.innerWidth * dpr;
  hsCanvas.height = window.innerHeight * dpr;
  hsCtx.scale(dpr, dpr);
  
  hsStars = Array(1200).fill().map(() => new WarpStar());
  hsOverlay.classList.add('active');
  hsSpeed = isReverse ? 2.5 : 0;
  hsOpacity = 1;

  if (hsAnimationId) cancelAnimationFrame(hsAnimationId);
  hsAnimationId = requestAnimationFrame(animateHyperspace);

  if (!isReverse) {
    let rampUp = setInterval(() => {
      if (hsSpeed < 2.5) hsSpeed += 0.04;
    }, 20);
    hsIntervals.push(rampUp);

    hsTimers.push(setTimeout(() => {
      canvas.classList.add('shake-screen');
    }, 500));

    hsTimers.push(setTimeout(() => {
      clearInterval(rampUp);
      canvas.classList.remove('shake-screen');

      let rampDown = setInterval(() => {
        if (hsSpeed > 0) hsSpeed -= 0.08;
        else clearInterval(rampDown);
      }, 30);
      hsIntervals.push(rampDown);

      let fadeOut = setInterval(() => {
        if (hsOpacity > 0) hsOpacity -= 0.05;
        else clearInterval(fadeOut);
      }, 50);
      hsIntervals.push(fadeOut);
    }, 3200));

    hsTimers.push(setTimeout(() => {
      hsOverlay.classList.remove('active');
      cancelAnimationFrame(hsAnimationId);
    }, 4000));

  } else {
    hsTimers.push(setTimeout(() => { canvas.classList.add('shake-screen'); }, 200));
    hsTimers.push(setTimeout(() => { canvas.classList.remove('shake-screen'); }, 600));

    let rampDown = setInterval(() => {
      if (hsSpeed > 0) hsSpeed -= 0.12;
      else clearInterval(rampDown);
    }, 20);
    hsIntervals.push(rampDown);

    hsTimers.push(setTimeout(() => {
      let fadeOut = setInterval(() => {
        if (hsOpacity > 0) hsOpacity -= 0.08;
        else clearInterval(fadeOut);
      }, 40);
      hsIntervals.push(fadeOut);
    }, 1000));

    hsTimers.push(setTimeout(() => {
      hsOverlay.classList.remove('active');
      cancelAnimationFrame(hsAnimationId);
    }, 1800));
  }
}

// Deep Space Trigger
const deepSpaceBtn = document.getElementById('btn-deep-space-toggle');
const rippleEl = document.getElementById('deep-space-ripple');

if (deepSpaceBtn) {
  if (pulsarMarkerEnabled) {
    deepSpaceBtn.classList.add('active');
  } else {
    deepSpaceBtn.classList.remove('active');
  }

  deepSpaceBtn.addEventListener('click', (e) => {
    pulsarMarkerEnabled = !pulsarMarkerEnabled;
      
    if (pulsarMarkerEnabled) {
      deepSpaceBtn.classList.add('active');
    } else {
      deepSpaceBtn.classList.remove('active');
    }
      
    if (rippleEl) {
      const rect = deepSpaceBtn.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      rippleEl.style.left = `${centerX}px`;
      rippleEl.style.top = `${centerY}px`;

      rippleEl.classList.remove('animating');
      void rippleEl.offsetWidth;
      rippleEl.classList.add('animating');
    }

    updatePlanetMarkers(); 
  });
}