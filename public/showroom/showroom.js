import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

const mount = document.querySelector('#scene');
const statusText = document.querySelector('#status-text');
const statusDot = document.querySelector('#status-dot');
const orbitButton = document.querySelector('#orbit-mode');
const walkButton = document.querySelector('#walk-mode');
const resetButton = document.querySelector('#reset-camera');
const enterWalkButton = document.querySelector('#enter-walk');
const walkHelp = document.querySelector('#walk-help');
const modeNote = document.querySelector('#mode-note');
const aircraftSelect = document.querySelector('#aircraft-select');
const sceneTitle = document.querySelector('#scene-title');

const aircraftModels = {
  'saab-340b': { label: 'Saab 340 B', path: '/assets/3d/saab-340b-simple.glb' },
  'dash-8-q400': { label: 'Dash 8 Q400', path: '/assets/3d/dash-8-q400-simple.glb' },
  'sukhoi-superjet-100': { label: 'SSJ Superjet 100', path: '/assets/3d/sukhoi-superjet-100-simple.glb' },
  'mc-21-310': { label: 'MC-21-310', path: '/assets/3d/mc-21-310-simple.glb' },
};
const queryModel = new URLSearchParams(window.location.search).get('model');
let activeModelKey = aircraftModels[queryModel] ? queryModel : aircraftSelect.value;
aircraftSelect.value = activeModelKey;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#27343d');
scene.fog = new THREE.Fog('#27343d', 62, 150);

const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 120);
const initialCameraPosition = new THREE.Vector3(22, 10, 24);
const initialTarget = new THREE.Vector3(0, 2.7, 0);
camera.position.copy(initialCameraPosition);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
mount.append(renderer.domElement);

const orbit = new OrbitControls(camera, renderer.domElement);
orbit.target.copy(initialTarget);
orbit.enableDamping = true;
orbit.dampingFactor = 0.075;
orbit.minDistance = 3.2;
orbit.maxDistance = 76;
orbit.maxPolarAngle = Math.PI * 0.49;

const pointerLock = new PointerLockControls(camera, renderer.domElement);
let cameraMode = 'orbit';
let aircraft = null;
const keys = new Set();
const clock = new THREE.Clock();

function setStatus(message, state = '') {
  statusText.textContent = message;
  statusDot.className = `status-dot ${state}`.trim();
}

function material(color, roughness = 0.72, metalness = 0.12, emissive = null) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    emissive: emissive || 0x000000,
    emissiveIntensity: emissive ? 1.6 : 0,
  });
}

const hangarMaterials = {
  floor: material(0x4a575e, 0.28, 0.62),
  steel: material(0x1d5a88, 0.42, 0.68),
  darkSteel: material(0x1b252d, 0.56, 0.58),
  wall: material(0x89979c, 0.7, 0.12),
  glass: material(0xa9c5cf, 0.26, 0.16, 0x25465a),
  yellow: material(0xe0a51d, 0.44, 0.32),
  white: material(0xc5ced1, 0.64, 0.16),
  light: material(0xf4fbff, 0.18, 0.04, 0xd8f7ff),
  red: material(0xd45454, 0.48, 0.12),
};

function addBox(name, position, size, boxMaterial, options = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), boxMaterial);
  mesh.name = name;
  mesh.position.set(...position);
  if (options.rotation) mesh.rotation.set(...options.rotation);
  mesh.castShadow = options.castShadow ?? true;
  mesh.receiveShadow = options.receiveShadow ?? true;
  scene.add(mesh);
  return mesh;
}

function addLightPanel(position, size = [2.5, 0.08, 0.55]) {
  const panel = addBox('Hangar ceiling light', position, size, hangarMaterials.light, { castShadow: false });
  const light = new THREE.PointLight(0xd7f3ff, 12, 16, 2);
  light.position.set(position[0], position[1] - 0.15, position[2]);
  scene.add(light);
  return panel;
}

function addHangar() {
  // Dimensions and proportions are intentionally based on the round130/round131 screenshot sets.
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 72), hangarMaterials.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.receiveShadow = true;
  scene.add(floor);

  for (const x of [-40, -32, -24, -16, -8, 0, 8, 16, 24, 32, 40]) {
    addBox('Floor expansion joint', [x, 0.018, 0], [0.055, 0.035, 70], hangarMaterials.darkSteel, { castShadow: false });
  }
  for (const z of [-28, -20, -12, -4, 4, 12, 20, 28]) {
    addBox('Floor expansion joint', [0, 0.019, z], [94, 0.035, 0.055], hangarMaterials.darkSteel, { castShadow: false });
  }
  for (const z of [-19, -15, 15, 19]) {
    addBox('Yellow service lane', [19, 0.026, z], [28, 0.04, 0.16], hangarMaterials.yellow, { castShadow: false });
  }

  addBox('Back wall', [-48, 13, 0], [0.6, 26, 72], hangarMaterials.darkSteel);
  addBox('Left wall', [0, 13, -36], [96, 26, 0.6], hangarMaterials.darkSteel);
  addBox('Right wall', [0, 13, 36], [96, 26, 0.6], hangarMaterials.darkSteel);
  addBox('Roof', [0, 27, 0], [96, 0.45, 72], hangarMaterials.darkSteel, { castShadow: false });

  for (const x of [-42, -30, -18, -6, 6, 18, 30, 42]) {
    for (const z of [-35.55, 35.55]) {
      addBox('Corrugated wall bay', [x, 14, z], [10.8, 18, 0.08], hangarMaterials.wall, { castShadow: false });
      addBox('Wall blue belt', [x, 8.2, z - Math.sign(z) * 0.08], [10.8, 0.44, 0.1], hangarMaterials.steel, { castShadow: false });
      addBox('Wall window strip', [x, 19.8, z - Math.sign(z) * 0.08], [10.8, 2.7, 0.1], hangarMaterials.glass, { castShadow: false });
    }
  }
  for (const z of [-28, -18, -8, 2, 12, 22, 32]) {
    addBox('Back wall bay', [-47.62, 14, z], [0.08, 18, 9.2], hangarMaterials.wall, { castShadow: false });
    addBox('Back wall blue belt', [-47.7, 8.2, z], [0.1, 0.44, 9.2], hangarMaterials.steel, { castShadow: false });
  }

  for (const x of [-46, -34, -22, -10, 2, 14, 26, 38, 48]) {
    for (const z of [-35.5, 35.5]) addBox('Hangar column', [x, 13, z], [0.7, 26, 0.7], hangarMaterials.steel);
    addBox('Roof truss', [x, 25.4, 0], [0.45, 0.45, 71], hangarMaterials.steel, { castShadow: false });
  }
  for (const z of [-30, -20, -10, 0, 10, 20, 30]) addBox('Roof beam', [0, 25.9, z], [95, 0.42, 0.42], hangarMaterials.steel, { castShadow: false });

  addBox('Overhead crane beam', [0, 20.8, 0], [68, 0.82, 1.2], hangarMaterials.yellow);
  addBox('Crane rail left', [0, 20.2, -6.4], [68, 0.28, 0.28], hangarMaterials.darkSteel);
  addBox('Crane rail right', [0, 20.2, 6.4], [68, 0.28, 0.28], hangarMaterials.darkSteel);
  addBox('Crane trolley', [5, 20.0, 0], [3.6, 0.78, 1.9], hangarMaterials.yellow);
  addBox('Crane hook', [5, 15.6, 0], [0.18, 8.2, 0.18], hangarMaterials.darkSteel);

  for (const x of [-40, -30, -20, -10, 0, 10, 20, 30, 40]) {
    addLightPanel([x, 24.7, -13]);
    addLightPanel([x, 24.7, 13]);
  }

  for (const x of [-39, -30, -21, 18, 28, 38]) {
    addBox('Service cabinet', [x, 1.8, -31.5], [5.2, 3.4, 1.8], hangarMaterials.white);
    addBox('Cabinet stripe', [x, 2.28, -30.55], [4.2, 0.2, 0.04], hangarMaterials.yellow, { castShadow: false });
    addBox('Cabinet window', [x, 2.55, -30.57], [1.5, 0.42, 0.04], hangarMaterials.glass, { castShadow: false });
  }
  addBox('Maintenance platform', [-14, 1.4, 18], [9, 2.7, 3.2], hangarMaterials.steel);
  addBox('Platform top', [-14, 2.82, 18], [9.4, 0.22, 3.6], hangarMaterials.yellow);
  for (const z of [16.45, 19.55]) addBox('Platform rail', [-14, 3.8, z], [9.4, 1.6, 0.16], hangarMaterials.steel);
  addBox('Blue work scaffold', [18, 2.6, 21], [10, 5.2, 3.2], hangarMaterials.steel);
  addBox('Scaffold deck', [18, 5.3, 21], [10.4, 0.25, 3.6], hangarMaterials.yellow);

  const door = addBox('Hangar door', [-47.65, 13, 0], [0.05, 21, 58], hangarMaterials.glass, { castShadow: false });
  door.material.transparent = true;
  door.material.opacity = 0.38;

  const hemi = new THREE.HemisphereLight(0xc9e9f5, 0x26323a, 1.9);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xe7f7ff, 4.8);
  key.position.set(7, 16, 9);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 90;
  key.shadow.camera.left = -46;
  key.shadow.camera.right = 46;
  key.shadow.camera.top = 46;
  key.shadow.camera.bottom = -46;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x9cc9e2, 1.6);
  fill.position.set(-35, 12, -22);
  scene.add(fill);
}

function configureAircraft(root) {
  root.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = true;
  });
  root.position.set(0, 0, 0);
  root.rotation.y = 0.02;
  scene.add(root);
}

function removeAircraft() {
  if (!aircraft) return;
  scene.remove(aircraft);
  aircraft.traverse((object) => {
    if (!object.isMesh) return;
    object.geometry?.dispose?.();
    if (Array.isArray(object.material)) object.material.forEach((entry) => entry.dispose?.());
    else object.material?.dispose?.();
  });
  aircraft = null;
}

function loadAircraft(modelKey) {
  const model = aircraftModels[modelKey] || aircraftModels['saab-340b'];
  activeModelKey = modelKey in aircraftModels ? modelKey : 'saab-340b';
  aircraftSelect.value = activeModelKey;
  sceneTitle.textContent = `${model.label} · 3D showroom`;
  window.history.replaceState({}, '', `?model=${encodeURIComponent(activeModelKey)}`);
  removeAircraft();
  setStatus(`Loading ${model.label} GLB…`);
  new GLTFLoader().load(
    model.path,
    (gltf) => {
      aircraft = gltf.scene;
      configureAircraft(aircraft);
      setStatus(`${model.label} GLB loaded · scene ready`, 'ready');
    },
    undefined,
    () => setStatus(`${model.label} GLB could not be read`, 'error'),
  );
}

function resetCamera() {
  orbit.enabled = true;
  cameraMode = 'orbit';
  pointerLock.unlock();
  camera.position.copy(initialCameraPosition);
  orbit.target.copy(initialTarget);
  orbit.update();
  updateModeUi();
}

function updateModeUi() {
  const orbitActive = cameraMode === 'orbit';
  orbitButton.classList.toggle('active', orbitActive);
  walkButton.classList.toggle('active', !orbitActive);
  walkHelp.hidden = orbitActive;
  document.body.classList.toggle('walk-active', !orbitActive);
  modeNote.textContent = orbitActive
    ? 'Orbit: drag to rotate · wheel to zoom · right-drag to pan'
    : 'Walk: click the scene to capture the mouse · WASD to move';
}

function startWalkMode() {
  cameraMode = 'walk';
  orbit.enabled = false;
  camera.position.set(12, 3.3, 12);
  camera.lookAt(0, 3, 0);
  updateModeUi();
  pointerLock.lock();
}

orbitButton.addEventListener('click', resetCamera);
walkButton.addEventListener('click', startWalkMode);
resetButton.addEventListener('click', resetCamera);
enterWalkButton.addEventListener('click', () => pointerLock.lock());
aircraftSelect.addEventListener('change', () => loadAircraft(aircraftSelect.value));
renderer.domElement.addEventListener('click', () => {
  if (cameraMode === 'walk' && !pointerLock.isLocked) pointerLock.lock();
});
pointerLock.addEventListener('lock', () => setStatus('Walk mode active', 'ready'));
pointerLock.addEventListener('unlock', () => {
  if (cameraMode === 'walk') setStatus('Walk mode paused · click the scene to resume', '');
});

window.addEventListener('keydown', (event) => keys.add(event.key.toLowerCase()));
window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));

addHangar();
loadAircraft(activeModelKey);

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  if (cameraMode === 'orbit') {
    orbit.update();
  } else if (pointerLock.isLocked) {
    const speed = (keys.has('shift') ? 8 : 4) * delta;
    if (keys.has('w')) pointerLock.moveForward(speed);
    if (keys.has('s')) pointerLock.moveForward(-speed);
    if (keys.has('a')) pointerLock.moveRight(-speed);
    if (keys.has('d')) pointerLock.moveRight(speed);
    if (keys.has('q')) camera.position.y += speed;
    if (keys.has('e')) camera.position.y -= speed;
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -44, 44);
    camera.position.y = THREE.MathUtils.clamp(camera.position.y, 1.5, 23.5);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -33, 33);
  }
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

updateModeUi();
animate();
