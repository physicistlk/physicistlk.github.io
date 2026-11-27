import * as THREE from 'three';
import { makeNotchedWaferGeometry, makeNotchedRimGeometry } from './wafer.js';

const WAFER_R = 8.6;

/**
 * Scroll-driven UV Lithography & Chip Formation scene.
 *
 * Replaces the old scroll-locked tunnel film: as the visitor scrolls smoothly
 * through p in [0.52..0.74], a focused UV/EUV beam strikes the notched silicon
 * wafer, exposes and develops the photoresist mask, and forms the finished
 * CMOS/OECT chip dies directly on the wafer — with zero scroll lock.
 */
export function createLithography() {
  const group = new THREE.Group();
  group.name = 'uv-lithography';
  group.visible = false;

  // Tilt slightly so the wafer, notch, and incoming UV beam read with 3D depth
  const waferGroup = new THREE.Group();
  waferGroup.rotation.set(-0.22, -0.14, 0.0);
  group.add(waferGroup);

  // --- notched silicon wafer substrate -----------------------------------
  const siBodyMat = new THREE.MeshStandardMaterial({
    color: 0x0e1824,
    metalness: 0.94,
    roughness: 0.24,
    emissive: new THREE.Color(0x061624),
    emissiveIntensity: 0.45,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
  });
  const siBody = new THREE.Mesh(makeNotchedWaferGeometry(WAFER_R, 160), siBodyMat);
  siBody.position.z = -0.25;
  waferGroup.add(siBody);

  // --- glowing notched wafer rim -----------------------------------------
  const rimMat = new THREE.MeshBasicMaterial({
    color: 0x7dd3fc,
    transparent: true,
    opacity: 0,
    toneMapped: false,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const rim = new THREE.Mesh(makeNotchedRimGeometry(WAFER_R * 0.985, WAFER_R * 1.018, 160), rimMat);
  rim.position.z = -0.12;
  waferGroup.add(rim);

  // --- subtle silicon crystal lattice beneath the dies -------------------
  const siAtomGeo = new THREE.OctahedronGeometry(0.11, 0);
  const siAtomMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0,
    toneMapped: false,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const atomPositions = [];
  const spacing = 0.92;
  for (let ix = -9; ix <= 9; ix++) {
    for (let iy = -9; iy <= 9; iy++) {
      const x = ix * spacing;
      const y = iy * spacing;
      if (Math.hypot(x, y) > WAFER_R * 0.9) continue;
      if (y < -WAFER_R * 0.82 && Math.abs(x) < 1.0) continue; // clear of V-notch
      atomPositions.push(x, y, -0.18 - (ix % 2 === 0 ? 0 : 0.08));
    }
  }
  const siAtoms = new THREE.InstancedMesh(siAtomGeo, siAtomMat, atomPositions.length / 3);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < atomPositions.length / 3; i++) {
    dummy.position.set(atomPositions[i * 3], atomPositions[i * 3 + 1], atomPositions[i * 3 + 2]);
    dummy.rotation.set(i * 0.3, i * 0.5, 0);
    dummy.scale.setScalar(0.85);
    dummy.updateMatrix();
    siAtoms.setMatrixAt(i, dummy.matrix);
  }
  siAtoms.instanceMatrix.needsUpdate = true;
  waferGroup.add(siAtoms);

  // --- photoresist mask layer (burns/develops away under UV) -------------
  const resistMat = new THREE.MeshBasicMaterial({
    map: makeCmosTexture('mask', 1024),
    transparent: true,
    opacity: 0,
    toneMapped: false,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const resist = new THREE.Mesh(makeNotchedWaferGeometry(WAFER_R * 0.992, 160), resistMat);
  resist.position.z = 0.06;
  waferGroup.add(resist);

  // --- formed CMOS / OECT chip dies (emerge as UV exposes the wafer) -----
  const dieMat = new THREE.MeshBasicMaterial({
    map: makeCmosTexture('chip', 1024),
    transparent: true,
    opacity: 0,
    toneMapped: false,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const die = new THREE.Mesh(makeNotchedWaferGeometry(WAFER_R * 0.988, 160), dieMat);
  die.position.z = 0.02;
  waferGroup.add(die);

  // --- focused UV light beam (violet-cyan coherent rays + soft cone) -----
  const uvOrigin = new THREE.Vector3(14, 9.5, 16);
  const uvBeamGroup = new THREE.Group();
  group.add(uvBeamGroup);

  const uvCoreMat = new THREE.MeshBasicMaterial({
    color: 0xc4b5fd,
    transparent: true,
    opacity: 0,
    toneMapped: false,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const uvHaloMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0,
    toneMapped: false,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  // Converging UV ray bundle
  const rayTarget = new THREE.Vector3(0, 0, 0.25);
  const uvRays = makeRayBundle({
    count: 11,
    fromRadius: 2.2,
    toRadius: 0.45,
    radius: 0.03,
    material: uvCoreMat,
    origin: uvOrigin,
    target: rayTarget,
  });
  uvBeamGroup.add(uvRays);

  // Soft volumetric UV cone wrapping the rays
  const coneDir = new THREE.Vector3().subVectors(rayTarget, uvOrigin);
  const coneLen = coneDir.length();
  const coneGeo = new THREE.CylinderGeometry(0.65, 2.8, coneLen, 32, 1, true);
  const coneMesh = new THREE.Mesh(coneGeo, uvHaloMat);
  coneMesh.position.copy(uvOrigin).addScaledVector(coneDir, 0.5);
  coneMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), coneDir.clone().normalize());
  uvBeamGroup.add(coneMesh);

  // UV focal impact glow on the wafer surface
  const impactMat = new THREE.SpriteMaterial({
    map: makeUvGlowTexture(),
    color: 0xd8b4fe,
    transparent: true,
    opacity: 0,
    toneMapped: false,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
  });
  const impact = new THREE.Sprite(impactMat);
  impact.position.set(0, 0, 0.4);
  impact.scale.setScalar(11);
  waferGroup.add(impact);

  // Crisp cyan exposure ring expanding across the wafer as UV develops the chip
  const waveRingMat = new THREE.MeshBasicMaterial({
    color: 0xa78bfa,
    transparent: true,
    opacity: 0,
    toneMapped: false,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const waveRing = new THREE.Mesh(new THREE.RingGeometry(0.92, 1.0, 96), waveRingMat);
  waveRing.position.z = 0.12;
  waferGroup.add(waveRing);

  return {
    group,

    /**
     * Update the UV exposure & chip formation directly from scroll progress p.
     * Active window: p in [0.51 .. 0.77].
     */
    update(p, elapsed) {
      const enter = THREE.MathUtils.smoothstep(p, 0.515, 0.565);
      const exit = 1 - THREE.MathUtils.smoothstep(p, 0.70, 0.77);
      const vis = enter * exit;

      group.visible = vis > 0.002;
      if (!group.visible) return;

      // Normalized progress inside the UV lithography chapter [0..1]
      const u = THREE.MathUtils.clamp((p - 0.53) / 0.16, 0, 1);

      // UV beam ramps in (0..0.25), stays focused during exposure (0.25..0.72), fades out (0.72..1.0)
      const uvIn = THREE.MathUtils.smoothstep(u, 0.02, 0.24);
      const uvOut = 1 - THREE.MathUtils.smoothstep(u, 0.68, 0.96);
      const uvIntensity = uvIn * uvOut * vis;

      // Photoresist develops/burns away as UV exposes the wafer (u: 0.22 -> 0.78)
      const burn = THREE.MathUtils.smoothstep(u, 0.22, 0.78);

      // Substrate & rim
      siBodyMat.opacity = 0.96 * vis;
      rimMat.opacity = (0.45 + 0.45 * burn) * vis;
      siAtomMat.opacity = (0.12 + 0.26 * (1 - burn * 0.5)) * vis;

      // Photoresist fades out as UV develops it; formed chip dies illuminate brightly
      resistMat.opacity = (1 - burn) * 0.88 * vis;
      dieMat.opacity = (0.10 + 0.90 * burn) * vis;

      // UV beam & cone
      uvCoreMat.opacity = 0.62 * uvIntensity;
      uvHaloMat.opacity = 0.14 * uvIntensity;

      // Impact spot + expanding exposure wavefront
      impactMat.opacity = (0.35 + 0.55 * Math.sin(burn * Math.PI)) * uvIntensity;
      impact.scale.setScalar(6.5 + 8.5 * burn);

      const waveScale = 0.4 + burn * WAFER_R * 0.98;
      waveRing.scale.setScalar(waveScale);
      waveRingMat.opacity = Math.sin(burn * Math.PI) * 0.55 * vis;

      // Gentle, calm breathing motion (no fast camera or object snaps)
      waferGroup.rotation.x = -0.22 + Math.sin(elapsed * 0.35) * 0.025;
      waferGroup.rotation.y = -0.14 + (u - 0.5) * 0.22 + Math.cos(elapsed * 0.28) * 0.02;
      waferGroup.rotation.z = Math.sin(elapsed * 0.2) * 0.015;
    },
  };
}

/** Soft UV violet-cyan radial glow for the exposure focal spot. */
function makeUvGlowTexture(size = 256) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const g = cv.getContext('2d');
  const c = size / 2;
  const grd = g.createRadialGradient(c, c, 0, c, c, c);
  grd.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
  grd.addColorStop(0.14, 'rgba(196, 181, 253, 0.72)');
  grd.addColorStop(0.40, 'rgba(56, 189, 248, 0.28)');
  grd.addColorStop(1, 'rgba(56, 189, 248, 0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * CMOS / OECT chip array texture ('mask' for amber photoresist, 'chip' for formed dies).
 */
function makeCmosTexture(mode, size = 1024) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const g = cv.getContext('2d');
  g.clearRect(0, 0, size, size);

  const C = {
    mask: {
      diff: 'rgba(251, 191, 36, 0.85)',
      poly: 'rgba(245, 158, 11, 0.78)',
      m1: 'rgba(253, 224, 155, 0.92)',
      m2: 'rgba(255, 244, 214, 0.82)',
      ring: 'rgba(251, 191, 36, 0.45)',
      grid: 'rgba(251, 191, 36, 0.08)',
      wash: 'rgba(245, 158, 11, 0.18)',
    },
    chip: {
      diff: 'rgba(52, 211, 153, 0.95)',
      poly: 'rgba(167, 139, 250, 0.95)',
      m1: 'rgba(56, 189, 248, 0.98)',
      m2: 'rgba(251, 191, 36, 0.92)',
      ring: 'rgba(125, 211, 252, 0.48)',
      grid: 'rgba(56, 189, 248, 0.11)',
      wash: null,
    },
  }[mode];

  let seed = 20260925;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  // substrate scribe grid
  g.strokeStyle = C.grid;
  g.lineWidth = 1;
  for (let i = 0; i <= 24; i++) {
    const p = (i / 24) * size;
    g.beginPath();
    g.moveTo(p, 0);
    g.lineTo(p, size);
    g.moveTo(0, p);
    g.lineTo(size, p);
    g.stroke();
  }

  const cols = 6;
  const rows = 6;
  const cw = size / cols;
  const ch = size / rows;

  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const ox = col * cw + cw * 0.08;
      const oy = r * ch + ch * 0.1;
      const w = cw * 0.84;
      const h = ch * 0.8;
      const flip = rnd() > 0.5;

      // diffusion regions (source / drain)
      g.fillStyle = C.diff;
      g.fillRect(ox + w * 0.15, oy + h * 0.06, w * 0.22, h * 0.27);
      g.fillRect(ox + w * 0.63, oy + h * 0.06, w * 0.22, h * 0.27);
      g.fillRect(ox + w * 0.15, oy + h * 0.65, w * 0.22, h * 0.27);
      g.fillRect(ox + w * 0.63, oy + h * 0.65, w * 0.22, h * 0.27);

      // poly / organic channel gates
      g.fillStyle = C.poly;
      g.fillRect(ox + w * 0.43, oy + h * 0.04, w * 0.14, h * 0.31);
      g.fillRect(ox + w * 0.43, oy + h * 0.63, w * 0.14, h * 0.31);

      // metal-1 routing
      g.fillStyle = C.m1;
      g.fillRect(ox, oy + h * 0.46, w, h * 0.065);
      g.fillRect(ox + w * (flip ? 0.22 : 0.28), oy + h * 0.2, h * 0.055, h * 0.26);
      g.fillRect(ox + w * (flip ? 0.7 : 0.64), oy + h * 0.2, h * 0.055, h * 0.26);

      // metal-2 power rails
      g.fillStyle = C.m2;
      g.fillRect(ox, oy, w, h * 0.032);
      g.fillRect(ox, oy + h * 0.955, w, h * 0.032);

      // contacts & vias
      g.fillStyle = C.m1;
      for (let k = 0; k < 3; k++) {
        const vx = ox + w * (0.1 + 0.34 * k);
        g.fillRect(vx, oy + h * 0.44, h * 0.042, h * 0.042);
        if (rnd() > 0.25) g.fillRect(vx, oy + h * 0.89, h * 0.042, h * 0.042);
      }

      // die seal / guard ring
      g.strokeStyle = C.ring;
      g.lineWidth = 2;
      g.strokeRect(ox - 4, oy - 4, w + 8, h + 8);
    }
  }

  if (C.wash) {
    g.fillStyle = C.wash;
    g.fillRect(0, 0, size, size);
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** One thin ray of UV light from a point to a point. */
function makeRay(from, to, radius, material) {
  const dir = new THREE.Vector3().subVectors(to, from);
  const len = dir.length();
  const geo = new THREE.CylinderGeometry(radius, radius, len, 6, 1, true);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.copy(from).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return mesh;
}

/** Converging UV ray bundle. */
function makeRayBundle({ count, fromRadius, toRadius, radius, material, origin, target }) {
  const bundle = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + 0.2;
    const from = new THREE.Vector3(
      origin.x + Math.cos(a) * fromRadius,
      origin.y + Math.sin(a) * fromRadius,
      origin.z
    );
    const to = new THREE.Vector3(
      target.x + Math.cos(a) * toRadius,
      target.y + Math.sin(a) * toRadius,
      target.z
    );
    bundle.add(makeRay(from, to, radius, material));
  }
  return bundle;
}
