import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const modelConfigs = {
  'saab-340b': {
    name: 'Saab 340 B',
    output: 'public/assets/3d/saab-340b-simple.glb',
    type: 'turboprop',
    profile: [[-6.6, 0.72], [-5.9, 0.96], [-4.7, 1.12], [-2.2, 1.25], [1.8, 1.28], [4.3, 1.19], [5.8, 0.9], [6.8, 0.12]],
    wingTip: 5.55,
    engineX: 0.1,
    engineY: 2.1,
    engineZ: 2.85,
    engineLength: 1.85,
    engineRadius: 0.62,
    cockpitX: 5.25,
    windowXs: [-3.9, -3.15, -2.4, -1.65, -0.9, -0.15, 0.6, 1.35, 2.1, 2.85, 3.6, 4.25],
    windowY: 3.42,
    windowZ: 1.18,
    noseGearX: 4.6,
    mainGearX: -1.55,
    landingLightX: 6,
  },
  'dash-8-q400': {
    name: 'Dash 8 Q400',
    output: 'public/assets/3d/dash-8-q400-simple.glb',
    type: 'turboprop',
    profile: [[-7.1, 0.72], [-6.35, 0.98], [-5.1, 1.14], [-2.4, 1.28], [2.2, 1.31], [4.8, 1.22], [6.3, 0.9], [7.35, 0.12]],
    wingTip: 6.1,
    engineX: 0.2,
    engineY: 2.1,
    engineZ: 3.1,
    engineLength: 1.95,
    engineRadius: 0.66,
    cockpitX: 5.8,
    windowXs: [-4.6, -3.8, -3, -2.2, -1.4, -0.6, 0.2, 1, 1.8, 2.6, 3.4, 4.2, 5],
    windowY: 3.46,
    windowZ: 1.22,
    noseGearX: 5.25,
    mainGearX: -1.8,
    landingLightX: 6.7,
  },
  'sukhoi-superjet-100': {
    name: 'SSJ Superjet 100',
    output: 'public/assets/3d/sukhoi-superjet-100-simple.glb',
    type: 'jet',
    profile: [[-7.6, 0.82], [-6.75, 1.08], [-5.2, 1.27], [-1.9, 1.4], [2.8, 1.4], [5.6, 1.24], [7.15, 0.92], [8.05, 0.12]],
    wingTip: 6.35,
    engineX: 0.35,
    engineY: 1.95,
    engineZ: 2.65,
    engineLength: 2.15,
    engineRadius: 0.7,
    cockpitX: 6.5,
    windowXs: [-5, -4.15, -3.3, -2.45, -1.6, -0.75, 0.1, 0.95, 1.8, 2.65, 3.5, 4.35, 5.2],
    windowY: 3.62,
    windowZ: 1.31,
    noseGearX: 6.1,
    mainGearX: -1.4,
    landingLightX: 7.3,
  },
  'mc-21-310': {
    name: 'MC-21-310',
    output: 'public/assets/3d/mc-21-310-simple.glb',
    type: 'jet',
    profile: [[-8.1, 0.86], [-7.2, 1.12], [-5.5, 1.36], [-2.1, 1.5], [3.1, 1.48], [5.9, 1.3], [7.55, 0.94], [8.45, 0.12]],
    wingTip: 6.8,
    engineX: 0.55,
    engineY: 1.92,
    engineZ: 2.85,
    engineLength: 2.35,
    engineRadius: 0.76,
    cockpitX: 6.9,
    windowXs: [-5.5, -4.6, -3.7, -2.8, -1.9, -1, -0.1, 0.8, 1.7, 2.6, 3.5, 4.4, 5.3],
    windowY: 3.72,
    windowZ: 1.39,
    noseGearX: 6.5,
    mainGearX: -1.6,
    landingLightX: 7.7,
  },
};

const selectedModel = process.argv[2] || 'saab-340b';
const config = modelConfigs[selectedModel];
if (!config) throw new Error(`Unknown model "${selectedModel}". Choose: ${Object.keys(modelConfigs).join(', ')}`);
const output = resolve(process.cwd(), config.output);

const materials = [
  {
    name: 'Airframe white',
    pbrMetallicRoughness: { baseColorFactor: [0.92, 0.95, 0.97, 1], metallicFactor: 0.12, roughnessFactor: 0.3 },
  },
  {
    name: 'BeyondSkyBlue blue',
    pbrMetallicRoughness: { baseColorFactor: [0.035, 0.22, 0.55, 1], metallicFactor: 0.2, roughnessFactor: 0.28 },
  },
  {
    name: 'Steel',
    pbrMetallicRoughness: { baseColorFactor: [0.34, 0.42, 0.5, 1], metallicFactor: 0.78, roughnessFactor: 0.25 },
  },
  {
    name: 'Rubber',
    pbrMetallicRoughness: { baseColorFactor: [0.018, 0.022, 0.03, 1], metallicFactor: 0, roughnessFactor: 0.82 },
  },
  {
    name: 'Cockpit glass',
    pbrMetallicRoughness: { baseColorFactor: [0.025, 0.075, 0.13, 1], metallicFactor: 0.15, roughnessFactor: 0.12 },
  },
  {
    name: 'Warning amber',
    pbrMetallicRoughness: { baseColorFactor: [0.95, 0.52, 0.08, 1], metallicFactor: 0.05, roughnessFactor: 0.35 },
  },
];

const meshes = [];
const nodes = [];
const bufferViews = [];
const accessors = [];
const bin = [];

function alignBin() {
  while (bin.length % 4) bin.push(0);
}

function appendBytes(bytes, target) {
  alignBin();
  const byteOffset = bin.length;
  const view = new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (const value of view) bin.push(value);
  const bufferView = { buffer: 0, byteOffset, byteLength: bytes.byteLength };
  if (target) bufferView.target = target;
  const index = bufferViews.push(bufferView) - 1;
  return { index, byteOffset, byteLength: bytes.byteLength };
}

function addAccessor(view, componentType, count, type, min, max) {
  return accessors.push({
    bufferView: view.index,
    componentType,
    count,
    type,
    min,
    max,
  }) - 1;
}

function bounds(values, stride) {
  const min = Array(stride).fill(Infinity);
  const max = Array(stride).fill(-Infinity);
  for (let index = 0; index < values.length; index += stride) {
    for (let axis = 0; axis < stride; axis += 1) {
      min[axis] = Math.min(min[axis], values[index + axis]);
      max[axis] = Math.max(max[axis], values[index + axis]);
    }
  }
  return { min, max };
}

class Builder {
  positions = [];
  normals = [];
  uvs = [];
  indices = [];

  tri(a, b, c) {
    this.addTriangle(a, b, c);
  }

  triWithUV(a, b, c, uvA, uvB, uvC) {
    this.addTriangle(a, b, c, [uvA, uvB, uvC]);
  }

  addTriangle(a, b, c, uvPoints = null) {
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = [
      ab[1] * ac[2] - ab[2] * ac[1],
      ab[2] * ac[0] - ab[0] * ac[2],
      ab[0] * ac[1] - ab[1] * ac[0],
    ];
    const length = Math.hypot(...n) || 1;
    n[0] /= length;
    n[1] /= length;
    n[2] /= length;
    const base = this.positions.length / 3;
    for (const [pointIndex, point] of [a, b, c].entries()) {
      this.positions.push(...point);
      this.normals.push(...n);
      if (uvPoints) this.uvs.push(...uvPoints[pointIndex]);
    }
    this.indices.push(base, base + 1, base + 2);
  }

  quad(a, b, c, d) {
    this.tri(a, b, c);
    this.tri(a, c, d);
  }

  quadWithUV(a, b, c, d, uvA, uvB, uvC, uvD) {
    this.triWithUV(a, b, c, uvA, uvB, uvC);
    this.triWithUV(a, c, d, uvA, uvC, uvD);
  }
}

function addObject(name, builder, material) {
  const positions = new Float32Array(builder.positions);
  const normals = new Float32Array(builder.normals);
  const uvs = builder.uvs.length ? new Float32Array(builder.uvs) : null;
  const indices = new Uint16Array(builder.indices);
  const positionView = appendBytes(positions, 34962);
  const normalView = appendBytes(normals, 34962);
  const uvView = uvs ? appendBytes(uvs, 34962) : null;
  const indexView = appendBytes(indices, 34963);
  const positionBounds = bounds(builder.positions, 3);
  const positionAccessor = addAccessor(positionView, 5126, positions.length / 3, 'VEC3', positionBounds.min, positionBounds.max);
  const normalAccessor = addAccessor(normalView, 5126, normals.length / 3, 'VEC3');
  const uvAccessor = uvView ? addAccessor(uvView, 5126, uvs.length / 2, 'VEC2', [0, 0], [1, 1]) : null;
  const indexAccessor = addAccessor(indexView, 5123, indices.length, 'SCALAR', [0], [positions.length / 3 - 1]);
  const mesh = meshes.push({
    name,
    primitives: [{ attributes: { POSITION: positionAccessor, NORMAL: normalAccessor, ...(uvAccessor === null ? {} : { TEXCOORD_0: uvAccessor }) }, indices: indexAccessor, material }],
  }) - 1;
  nodes.push({ name, mesh });
}

function box(builder, center, size) {
  const [x, y, z] = center;
  const [sx, sy, sz] = size;
  const x0 = x - sx / 2;
  const x1 = x + sx / 2;
  const y0 = y - sy / 2;
  const y1 = y + sy / 2;
  const z0 = z - sz / 2;
  const z1 = z + sz / 2;
  builder.quad([x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]);
  builder.quad([x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [x0, y0, z0]);
  builder.quad([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]);
  builder.quad([x0, y0, z1], [x0, y0, z0], [x1, y0, z0], [x1, y0, z1]);
  builder.quad([x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0]);
  builder.quad([x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [x0, y0, z1]);
}

function rotatedBox(builder, center, size, angle) {
  const [cx, cy, cz] = center;
  const [sx, sy, sz] = size;
  const corners = [];
  for (const x of [-sx / 2, sx / 2]) {
    for (const y of [-sy / 2, sy / 2]) {
      for (const z of [-sz / 2, sz / 2]) {
        const ry = y * Math.cos(angle) - z * Math.sin(angle);
        const rz = y * Math.sin(angle) + z * Math.cos(angle);
        corners.push([cx + x, cy + ry, cz + rz]);
      }
    }
  }
  const [a, b, c, d, e, f, g, h] = corners;
  builder.quad(c, g, h, d);
  builder.quad(a, b, f, e);
  builder.quad(b, c, g, f);
  builder.quad(d, h, e, a);
  builder.quad(a, e, h, d);
  builder.quad(b, f, g, c);
}

function cylinderX(builder, center, length, radius, segments = 16) {
  const [cx, cy, cz] = center;
  for (let segment = 0; segment < segments; segment += 1) {
    const a0 = (segment / segments) * Math.PI * 2;
    const a1 = ((segment + 1) / segments) * Math.PI * 2;
    const y0 = cy + Math.cos(a0) * radius;
    const z0 = cz + Math.sin(a0) * radius;
    const y1 = cy + Math.cos(a1) * radius;
    const z1 = cz + Math.sin(a1) * radius;
    builder.quad([cx - length / 2, y0, z0], [cx + length / 2, y0, z0], [cx + length / 2, y1, z1], [cx - length / 2, y1, z1]);
    builder.tri([cx - length / 2, cy, cz], [cx - length / 2, y1, z1], [cx - length / 2, y0, z0]);
    builder.tri([cx + length / 2, cy, cz], [cx + length / 2, y0, z0], [cx + length / 2, y1, z1]);
  }
}

function cylinderZ(builder, center, length, radius, segments = 16) {
  const [cx, cy, cz] = center;
  for (let segment = 0; segment < segments; segment += 1) {
    const a0 = (segment / segments) * Math.PI * 2;
    const a1 = ((segment + 1) / segments) * Math.PI * 2;
    const x0 = cx + Math.cos(a0) * radius;
    const y0 = cy + Math.sin(a0) * radius;
    const x1 = cx + Math.cos(a1) * radius;
    const y1 = cy + Math.sin(a1) * radius;
    builder.quad([x0, y0, cz - length / 2], [x1, y1, cz - length / 2], [x1, y1, cz + length / 2], [x0, y0, cz + length / 2]);
    builder.tri([cx, cy, cz - length / 2], [x1, y1, cz - length / 2], [x0, y0, cz - length / 2]);
    builder.tri([cx, cy, cz + length / 2], [x0, y0, cz + length / 2], [x1, y1, cz + length / 2]);
  }
}

function fuselage() {
  const builder = new Builder();
  const profile = config.profile;
  const rings = 24;
  for (let ring = 0; ring < profile.length - 1; ring += 1) {
    const [x0, r0] = profile[ring];
    const [x1, r1] = profile[ring + 1];
    for (let segment = 0; segment < rings; segment += 1) {
      const a0 = (segment / rings) * Math.PI * 2;
      const a1 = ((segment + 1) / rings) * Math.PI * 2;
      const p0 = [x0, 2.75 + Math.cos(a0) * r0, Math.sin(a0) * r0];
      const p1 = [x1, 2.75 + Math.cos(a0) * r1, Math.sin(a0) * r1];
      const p2 = [x1, 2.75 + Math.cos(a1) * r1, Math.sin(a1) * r1];
      const p3 = [x0, 2.75 + Math.cos(a1) * r0, Math.sin(a1) * r0];
      const u0 = (x0 - profile[0][0]) / (profile.at(-1)[0] - profile[0][0]);
      const u1 = (x1 - profile[0][0]) / (profile.at(-1)[0] - profile[0][0]);
      const v0 = segment / rings;
      const v1 = (segment + 1) / rings;
      builder.quadWithUV(p0, p1, p2, p3, [u0, v0], [u1, v0], [u1, v1], [u0, v1]);
    }
  }
  return builder;
}

function wing(zSign) {
  const builder = new Builder();
  const z = (value) => value * zSign;
  const top = 2.86;
  const bottom = 2.62;
  const a = [-1.6, top, z(0.75)];
  const b = [1.35, top, z(0.75)];
  const c = [0.15, top, z(config.wingTip)];
  const d = [-0.7, top, z(config.wingTip - 0.5)];
  const e = [-1.6, bottom, z(0.75)];
  const f = [1.35, bottom, z(0.75)];
  const g = [0.15, bottom, z(config.wingTip)];
  const h = [-0.7, bottom, z(config.wingTip - 0.5)];
  builder.quad(a, b, c, d);
  builder.quad(e, h, g, f);
  builder.quad(a, e, f, b);
  builder.quad(b, f, g, c);
  builder.quad(c, g, h, d);
  builder.quad(d, h, e, a);
  return builder;
}

function tailPlane(zSign) {
  const builder = new Builder();
  const z = (value) => value * zSign;
  const top = 3.95;
  const bottom = 3.76;
  const a = [-5.8, top, z(0.25)];
  const b = [-4.25, top, z(0.25)];
  const c = [-4.9, top, z(2.35)];
  const d = [-5.55, top, z(2.05)];
  const e = [-5.8, bottom, z(0.25)];
  const f = [-4.25, bottom, z(0.25)];
  const g = [-4.9, bottom, z(2.35)];
  const h = [-5.55, bottom, z(2.05)];
  builder.quad(a, b, c, d);
  builder.quad(e, h, g, f);
  builder.quad(a, e, f, b);
  builder.quad(b, f, g, c);
  builder.quad(c, g, h, d);
  builder.quad(d, h, e, a);
  return builder;
}

function verticalTail() {
  const builder = new Builder();
  const z0 = -0.16;
  const z1 = 0.16;
  const a = [-6.0, 3.25, z0];
  const b = [-4.45, 3.35, z0];
  const c = [-5.25, 6.05, z0];
  const d = [-5.9, 5.55, z0];
  const e = [-6.0, 3.25, z1];
  const f = [-4.45, 3.35, z1];
  const g = [-5.25, 6.05, z1];
  const h = [-5.9, 5.55, z1];
  builder.quad(a, d, c, b);
  builder.quad(e, f, g, h);
  builder.quad(a, e, h, d);
  builder.quad(d, h, g, c);
  builder.quad(c, g, f, b);
  builder.quad(b, f, e, a);
  return builder;
}

addObject('Fuselage', fuselage(), 0);
addObject('Left wing', wing(-1), 1);
addObject('Right wing', wing(1), 1);
addObject('Left tailplane', tailPlane(-1), 1);
addObject('Right tailplane', tailPlane(1), 1);
addObject('Vertical tail', verticalTail(), 1);

for (const sign of [-1, 1]) {
  const z = sign * config.engineZ;
  const engine = new Builder();
  cylinderX(engine, [config.engineX, config.engineY, z], config.engineLength, config.engineRadius);
  addObject(`Engine nacelle ${sign < 0 ? 'left' : 'right'}`, engine, 2);

  if (config.type === 'turboprop') {
    const spinner = new Builder();
    cylinderX(spinner, [config.engineX + config.engineLength / 2, config.engineY, z], 0.35, 0.32);
    addObject(`Propeller spinner ${sign < 0 ? 'left' : 'right'}`, spinner, 2);

    const prop = new Builder();
    for (let blade = 0; blade < 6; blade += 1) {
      rotatedBox(prop, [config.engineX + config.engineLength / 2 + 0.22, config.engineY, z], [0.12, 0.18, 1.22], (blade / 6) * Math.PI * 2);
    }
    addObject(`Propeller ${sign < 0 ? 'left' : 'right'}`, prop, 3);
  } else {
    const pylon = new Builder();
    box(pylon, [config.engineX, 2.45, z], [1.45, 0.36, 0.38]);
    addObject(`Jet engine pylon ${sign < 0 ? 'left' : 'right'}`, pylon, 1);
    const intake = new Builder();
    cylinderX(intake, [config.engineX + config.engineLength / 2 + 0.06, config.engineY, z], 0.12, config.engineRadius * 0.82);
    addObject(`Jet intake ${sign < 0 ? 'left' : 'right'}`, intake, 4);
  }
}

for (const x of config.windowXs) {
  for (const sign of [-1, 1]) {
    const window = new Builder();
    box(window, [x, config.windowY, sign * config.windowZ], [0.45, 0.28, 0.06]);
    addObject(`Passenger window ${x}-${sign}`, window, 4);
  }
}

const cockpit = new Builder();
box(cockpit, [config.cockpitX, config.windowY - 0.17, 0], [1.15, 0.72, config.windowZ * 1.8]);
addObject('Cockpit glazing', cockpit, 4);

for (const [x, z] of [[config.noseGearX, 0], [config.mainGearX, -0.85], [config.mainGearX, 0.85]]) {
  const leg = new Builder();
  box(leg, [x, 1.32, z], [0.18, 1.05, 0.18]);
  addObject('Landing gear leg', leg, 2);
  const wheel = new Builder();
  cylinderZ(wheel, [x, 0.72, z], 0.24, 0.32);
  addObject('Landing gear wheel', wheel, 3);
}

const landingLights = new Builder();
box(landingLights, [config.landingLightX, 2.68, -0.72], [0.18, 0.16, 0.12]);
box(landingLights, [config.landingLightX, 2.68, 0.72], [0.18, 0.16, 0.12]);
addObject('Landing lights', landingLights, 5);

const texturePath = resolve(process.cwd(), `public/assets/3d/textures/${selectedModel}-fuselage.png`);
const textureBytes = await readFile(texturePath);
const textureView = appendBytes(textureBytes);
materials[0].pbrMetallicRoughness.baseColorTexture = { index: 0 };

const gltf = {
  asset: { version: '2.0', generator: `BeyondSkyBlue procedural ${config.name} showroom model` },
  scene: 0,
  scenes: [{ name: `${config.name} simple showroom model`, nodes: nodes.map((_, index) => index) }],
  nodes,
  meshes,
  materials,
  accessors,
  bufferViews,
  buffers: [{ byteLength: bin.length }],
  samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }],
  images: [{ name: `${config.name} fuselage livery`, bufferView: textureView.index, mimeType: 'image/png' }],
  textures: [{ name: `${config.name} fuselage livery`, sampler: 0, source: 0 }],
};

const json = Buffer.from(JSON.stringify(gltf));
const jsonPadding = (4 - (json.length % 4)) % 4;
const jsonChunk = Buffer.concat([json, Buffer.alloc(jsonPadding, 0x20)]);
const binChunk = Buffer.from(bin);
const binPadding = (4 - (binChunk.length % 4)) % 4;
const paddedBinChunk = Buffer.concat([binChunk, Buffer.alloc(binPadding)]);
const totalLength = 12 + 8 + jsonChunk.length + 8 + paddedBinChunk.length;
const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67, 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(totalLength, 8);
const jsonHeader = Buffer.alloc(8);
jsonHeader.writeUInt32LE(jsonChunk.length, 0);
jsonHeader.writeUInt32LE(0x4e4f534a, 4);
const binHeader = Buffer.alloc(8);
binHeader.writeUInt32LE(paddedBinChunk.length, 0);
binHeader.writeUInt32LE(0x004e4942, 4);

await mkdir(dirname(output), { recursive: true });
await writeFile(output, Buffer.concat([header, jsonHeader, jsonChunk, binHeader, paddedBinChunk]));
console.log(`Generated ${config.name}: ${output} (${totalLength} bytes, ${meshes.length} meshes)`);
