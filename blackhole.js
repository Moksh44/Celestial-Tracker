import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* Cygnus X-1 real data */
export const CYGX1 = {
  name: 'Cygnus X-1',
  massSun: 21.2,          // solar masses
  distanceLy: 7200,       // ~2.2 kpc
  spin: 0.97,             // measured > 0.95, near-maximal
  inclinationDeg: 27.5,   // angle between line of sight and spin axis
  raDeg: 299.59,
  decDeg: 35.20,
};
const RS_KM = 2.9532 * CYGX1.massSun; // Schwarzschild radius in km
const START_DIST = 70;   // in Schwarzschild radii, camera eases in from here
const REST_DIST = 26;
const TEMPERATURE = 17000; // K, false-colour disc. ~6800 = golden/amber, ~9500 = gold-white, 17000 = blue-white

/* shaders */
const NOISE_GLSL = `
float hash13(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash13(i);
  float n100 = hash13(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash13(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash13(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash13(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash13(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash13(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash13(i + vec3(1.0, 1.0, 1.0));
  return mix(mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
    mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y), f.z);
}
float fbm(vec3 p) {
  float a = 0.5;
  float s = 0.0;
  for (int i = 0; i < 5; i++) {
    s += a * vnoise(p);
    p = p * 2.03 + vec3(1.7, 9.2, 3.1);
    a *= 0.5;
  }
  return s;
}
`;

const BLACKBODY_GLSL = `
vec3 blackbody(float Tk) {
  float T = clamp(Tk, 1000.0, 40000.0) / 100.0;
  float r;
  float g;
  float b;
  if (T <= 66.0) {
    r = 255.0;
    g = 99.4708025861 * log(T) - 161.1195681661;
  } else {
    r = 329.698727446 * pow(T - 60.0, -0.1332047592);
    g = 288.1221695283 * pow(T - 60.0, -0.0755148492);
  }
  if (T >= 66.0) b = 255.0;
  else if (T <= 19.0) b = 0.0;
  else b = 138.5177312231 * log(T - 10.0) - 305.0447927307;
  vec3 c = clamp(vec3(r, g, b) / 255.0, 0.0, 1.0);
  return pow(c, vec3(2.2));
}
`;

const VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform float uAspect;
uniform float uTanHalf;
uniform float uTime;
uniform float uDiskIn;
uniform float uDiskOut;
uniform float uTemp;
uniform float uBright;
uniform float uStars;
uniform float uReveal;
uniform float uR0;
uniform vec3 uCamPos;
uniform mat3 uCamRot;
uniform mat3 uSkyRot;
uniform samplerCube uSky;
uniform int uSteps;

${NOISE_GLSL}
${BLACKBODY_GLSL}

float diskNoise(float r, float a, float seed) {
  vec3 q = vec3(cos(a) * 2.4, sin(a) * 2.4, r * 2.6 + seed);
  return fbm(q);
}

vec4 shadeDisk(vec3 cp, vec3 w) {
  float r = length(cp.xz);
  float phi = atan(cp.z, cp.x);
  float x = r / uDiskIn;
  float prof = pow(x, -0.75) * pow(max(1.0 - inversesqrt(x), 0.0), 0.25) / 0.488;
  prof = max(prof, 0.0);
  float omega = sqrt(0.5 / (r * r * r));

  const float TP = 14.0;
  float c1 = uTime / TP;
  float c2 = c1 + 0.5;
  float ph1 = fract(c1);
  float ph2 = fract(c2);
  float w1 = 1.0 - abs(2.0 * ph1 - 1.0);
  float n1 = diskNoise(r, phi - omega * ph1 * TP, floor(c1) * 7.31);
  float n2 = diskNoise(r, phi - omega * ph2 * TP, floor(c2) * 7.31 + 3.7);
  float n = mix(n2, n1, w1);

  float rings = 0.5 + 0.5 * sin(r * 22.0 + n * 6.0);
  float dens = 0.22 + 1.2 * smoothstep(0.16, 0.8, n);
  dens *= 0.9 + 0.2 * rings;
  float edge = smoothstep(uDiskIn, uDiskIn + 0.1, r) * (1.0 - smoothstep(uDiskOut * 0.55, uDiskOut, r));
  float alpha = clamp(0.3 + 0.6 * dens, 0.0, 0.97) * edge;

  float beta = min(sqrt(0.5 / max(r - 1.0, 0.05)), 0.93);
  float gam = inversesqrt(1.0 - beta * beta);
  vec3 ephi = normalize(vec3(-cp.z, 0.0, cp.x));
  vec3 rh = cp / r;
  float wr = dot(w, rh);
  vec3 wt = w - wr * rh;
  vec3 nl = normalize(wr * rh + wt * sqrt(max(1.0 - 1.0 / r, 1e-3)));
  float gg = sqrt(max(1.0 - 1.0 / r, 1e-3)) / sqrt(max(1.0 - 1.0 / uR0, 1e-3));
  float gd = 1.0 / (gam * (1.0 + beta * dot(ephi, nl)));
  float g = max(gd * gg, 0.04);

  vec3 col = blackbody(uTemp * prof * g);
  float I = pow(prof, 3.0) * pow(g, 4.0) * dens * uBright;
  return vec4(col * I, alpha);
}

void main() {
  vec2 uv = (vUv - 0.5) * vec2(uAspect, 1.0);
  vec3 dirL = normalize(vec3(uv * 2.0 * uTanHalf, -1.0));
  vec3 dir = uCamRot * dirL;
  vec3 pos = uCamPos;
  float r0 = length(pos);

  vec3 rh0 = pos / r0;
  float dr0 = dot(dir, rh0);
  vec3 dt0 = dir - dr0 * rh0;
  float sq0 = sqrt(max(1.0 - 1.0 / r0, 1e-3));
  vec3 v = normalize(dr0 * rh0 + dt0 / sq0);

  vec3 hv = cross(pos, v);
  float h2 = dot(hv, hv);
  float hh = sqrt(h2);

  vec3 col = vec3(0.0);
  float T = 1.0;
  bool captured = false;
  bool escaped = false;
  float rEsc = max(45.0, r0 + 8.0);
  vec3 glowCol = blackbody(uTemp * 0.75);

  for (int i = 0; i < 420; i++) {
    if (i >= uSteps) break;
    float r2 = dot(pos, pos);
    float r = sqrt(r2);
    if (r < 1.0) { captured = true; break; }
    if (r > rEsc && dot(pos, v) > 0.0) { escaped = true; break; }

    float dt = min(0.045 * r2 / max(hh, 0.25), 0.14 * r);
    dt = max(dt, 0.012);

    vec3 a0 = -1.5 * h2 * pos / (r2 * r2 * r);
    vec3 npos = pos + v * dt + 0.5 * a0 * dt * dt;
    float nr2 = dot(npos, npos);
    vec3 a1 = -1.5 * h2 * npos / (nr2 * nr2 * sqrt(nr2));
    vec3 nv = v + 0.5 * (a0 + a1) * dt;

    if (abs(pos.y) < 2.5) {
      float pr = length(pos.xz);
      float gh = 0.10 * pr + 0.10;
      float gl = exp(-(pos.y * pos.y) / (gh * gh)) * smoothstep(uDiskIn * 0.8, uDiskIn * 1.25, pr) * exp(-pr * 0.20);
      col += T * glowCol * (gl * dt * 0.035 * uBright);
    }
    if (pos.y * npos.y < 0.0) {
      float f = pos.y / (pos.y - npos.y);
      vec3 cp = mix(pos, npos, f);
      float cr = length(cp.xz);
      if (cr > uDiskIn && cr < uDiskOut) {
        vec3 w = normalize(mix(v, nv, f));
        vec4 dsk = shadeDisk(cp, w);
        col += T * dsk.rgb * dsk.a;
        T *= (1.0 - dsk.a);
        if (T < 0.02) break;
      }
    }
    pos = npos;
    v = nv;
  }

  // Sample the real star catalog cubemap. Sampled unconditionally so mip selection stays valid.
  vec3 sky = textureCube(uSky, uSkyRot * normalize(v)).rgb;
  if (escaped) col += T * sky * uStars;

  // fade the hole in over an undistorted view of the same sky so the hand-off has no visible cut
  vec3 skyStraight = textureCube(uSky, uSkyRot * dir).rgb * uStars;
  col = mix(skyStraight, col, uReveal);

  float vig = 1.0 - 0.35 * dot(uv, uv);
  col *= mix(1.0, vig, uReveal);
  gl_FragColor = vec4(col, 1.0);
}
`;

const STAR_VERT = `
attribute float starSize;
attribute vec3  starColor;
attribute float starOpacity;
uniform float uSizeScale;
varying vec3  vColor;
varying float vOpacity;
void main() {
  vColor = starColor;
  vOpacity = starOpacity;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = max(starSize * uSizeScale, 1.0);
}
`;
const STAR_FRAG = `
uniform sampler2D uTexture;
varying vec3  vColor;
varying float vOpacity;
void main() {
  vec4 tex = texture2D(uTexture, gl_PointCoord);
  if (tex.a < 0.01) discard;
  gl_FragColor = vec4(vColor * tex.rgb, tex.a * vOpacity);
}
`;

export function createBlackHole({ renderer, canvas, getLowTier = () => false }) {
  let active = false;
  let prepared = false;
  let resScale = 1;
  let width = window.innerWidth;
  let height = window.innerHeight;
  let baseDpr = Math.min(window.devicePixelRatio || 1, 2);
  let simTime = 0;
  let targetDist = null;
  let accDt = 0;
  let frames = 0;
  let warm = 0;
  let reveal = 0;
  const observer = new THREE.Vector3();
  let savedTone = null;
  let savedExposure = 1;

  const bhScene = new THREE.Scene();
  const bhCamOrtho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const viewCam = new THREE.PerspectiveCamera(52, 1, 0.05, 1000);

  const spin = CYGX1.spin;
  const diskIn = 3.0 - 1.4 * spin;
  const temperature = TEMPERATURE;

  const skyRot = new THREE.Matrix3();
  const camRot = new THREE.Matrix3();

  const material = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uAspect: { value: 1 },
      uTanHalf: { value: Math.tan((52 * Math.PI) / 360) },
      uTime: { value: 0 },
      uDiskIn: { value: diskIn },
      uDiskOut: { value: 15 },
      uTemp: { value: temperature },
      uBright: { value: 0.55 },
      uStars: { value: 1.7 },
      uReveal: { value: 0 },
      uR0: { value: REST_DIST },
      uCamPos: { value: new THREE.Vector3() },
      uCamRot: { value: camRot },
      uSkyRot: { value: skyRot },
      uSky: { value: null },
      uSteps: { value: 300 },
    },
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  bhScene.add(quad);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(bhScene, bhCamOrtho));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.42, 0.55, 1.0);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const controls = new OrbitControls(viewCam, canvas);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.rotateSpeed = 0.55;
  controls.zoomSpeed = 0.9;
  controls.minDistance = 1.7;
  controls.maxDistance = 140;
  controls.minPolarAngle = 0.03;
  controls.maxPolarAngle = Math.PI - 0.03;
  controls.enabled = false;
  controls.addEventListener('start', () => { targetDist = null; });

  let cubeRT = null;
  function buildSky(observerPos) {
    const src = window.starFieldMesh;
    if (!src) return false;
    if (cubeRT) cubeRT.dispose();

    const size = getLowTier() ? 1024 : 2048;
    cubeRT = new THREE.WebGLCubeRenderTarget(size, {
      type: THREE.HalfFloatType,
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
      magFilter: THREE.LinearFilter,
    });

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', src.geometry.getAttribute('position'));
    g.setAttribute('starColor', src.geometry.getAttribute('starColor'));
    g.setAttribute('starOpacity', src.geometry.getAttribute('starOpacity'));
    const fullSizes = window.starLODBuckets ? window.starLODBuckets[3] : src.geometry.getAttribute('starSize').array;
    g.setAttribute('starSize', new THREE.BufferAttribute(fullSizes, 1));

    const sizeScale = THREE.MathUtils.clamp((size / 90) / ((height * baseDpr) / 52), 0.4, 1.6);

    const starMat = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: src.material.uniforms.uTexture,
        uSizeScale: { value: sizeScale },
      },
      vertexShader: STAR_VERT,
      fragmentShader: STAR_FRAG,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const pts = new THREE.Points(g, starMat);
    pts.frustumCulled = false;
    pts.rotation.copy(src.rotation);
    pts.updateMatrixWorld(true);

    const s = new THREE.Scene();
    s.background = new THREE.Color(0x000000);
    s.add(pts);

    const cc = new THREE.CubeCamera(0.1, 1e7, cubeRT);
    cc.position.copy(observerPos);
    cc.updateMatrixWorld(true);
    const prevTone = renderer.toneMapping;
    renderer.toneMapping = THREE.NoToneMapping;
    cc.update(renderer, s);
    renderer.toneMapping = prevTone;

    g.dispose();
    starMat.dispose();
    material.uniforms.uSky.value = cubeRT.texture;
    return true;
  }

  function applySize() {
    const pr = Math.max(0.35, baseDpr * resScale);
    composer.setPixelRatio(pr);
    composer.setSize(width, height);
    bloom.resolution.set(width * pr * 0.5, height * pr * 0.5);
    viewCam.aspect = width / height;
    viewCam.updateProjectionMatrix();
  }

  function prepare(observerPos) {
    if (prepared) return;
    if (observerPos) observer.copy(observerPos);
    if (!buildSky(observer)) return;
    const tone = renderer.toneMapping;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    material.uniforms.uCamPos.value.set(0, REST_DIST, 0.1);
    composer.renderToScreen = false;
    composer.render(0);
    composer.renderToScreen = true;
    renderer.toneMapping = tone;
    prepared = true;
  }

  function enter(dirWorld) {
    if (!prepared) prepare(observer);
    if (!material.uniforms.uSky.value) return false;

    savedTone = renderer.toneMapping;
    savedExposure = renderer.toneMappingExposure;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const polar = (CYGX1.inclinationDeg * Math.PI) / 180;
    viewCam.position.setFromSphericalCoords(START_DIST, polar, 0.6);
    viewCam.lookAt(0, 0, 0);
    targetDist = REST_DIST;

    const ZERO = new THREE.Vector3();
    const UP = new THREE.Vector3(0, 1, 0);
    const mBH = new THREE.Matrix4().lookAt(viewCam.position, ZERO, UP);
    const mWorld = new THREE.Matrix4().lookAt(ZERO, dirWorld.clone().normalize(), UP);
    skyRot.setFromMatrix4(mWorld.multiply(mBH.transpose()));
    reveal = 0;

    baseDpr = getLowTier() ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    resScale = getLowTier() ? 0.6 : 1;
    applySize();
    controls.enabled = true;
    simTime = 0;
    warm = 60;
    accDt = 0;
    frames = 0;
    active = true;
    return true;
  }

  function exit() {
    active = false;
    controls.enabled = false;
    if (savedTone !== null) {
      renderer.toneMapping = savedTone;
      renderer.toneMappingExposure = savedExposure;
      savedTone = null;
    }
  }

  function update(dt) {
    if (!active) return;
    const u = material.uniforms;
    const lowTier = getLowTier();
    u.uSteps.value = lowTier ? 190 : 260;

    if (targetDist !== null) {
      const d = viewCam.position.length();
      const nd = d + (targetDist - d) * (1 - Math.exp(-dt * 1.1));
      viewCam.position.setLength(nd);
      if (Math.abs(nd - targetDist) < 0.02) targetDist = null;
    }
    controls.update(dt);

    simTime += dt * 2.5;
    reveal = Math.min(1, reveal + dt / 1.8);
    u.uReveal.value = reveal * reveal * (3 - 2 * reveal);
    viewCam.updateMatrixWorld();
    camRot.setFromMatrix4(viewCam.matrixWorld);

    u.uAspect.value = width / height;
    u.uTanHalf.value = Math.tan((viewCam.fov * Math.PI) / 360);
    u.uTime.value = simTime;
    u.uR0.value = viewCam.position.length();
    u.uCamPos.value.copy(viewCam.position);

    if (warm > 0) { warm--; return; }
    accDt += dt;
    frames++;
    if (accDt > 1.0) {
      const avg = accDt / frames;
      const minR = 0.4;
      if (avg > 0.036 && resScale > minR) { resScale = Math.max(minR, resScale * 0.86); applySize(); }
      else if (avg < 0.0185 && resScale < 1) { resScale = Math.min(1, resScale * 1.1); applySize(); }
      accDt = 0; frames = 0;
    }
  }

  function render(dt) {
    if (!active) return;
    composer.render(dt);
  }

  function resize(w, h, dpr) {
    width = w; height = h;
    baseDpr = dpr;
    if (active) applySize();
  }

  function telemetry() {
    const r0 = viewCam.position.length();
    return {
      name: CYGX1.name,
      massSun: CYGX1.massSun,
      distanceLy: CYGX1.distanceLy,
      spin: CYGX1.spin,
      rsKm: RS_KM,
      distanceRs: r0,
      distanceKm: r0 * RS_KM,
      photonSphereKm: 1.5 * RS_KM,
      shadowDiameterKm: 2 * 2.598 * RS_KM,
      timeDilation: Math.sqrt(Math.max(1 - 1 / r0, 0)),
      inclinationDeg: CYGX1.inclinationDeg,
    };
  }

  function dispose() {
    exit();
    controls.dispose();
    material.dispose();
    quad.geometry.dispose();
    if (cubeRT) cubeRT.dispose();
    composer.dispose();
  }

  return {
    prepare, enter, exit, update, render, resize, telemetry, dispose,
    get isActive() { return active; },
    setDistance(d) { targetDist = d; },
  };
}