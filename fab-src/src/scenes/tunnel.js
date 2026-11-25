import * as THREE from 'three';

/**
 * Scene 3 — "Into the Wafer".
 *
 * A first-person flight through the inside of a fab, rendered procedurally:
 *   optical path → reticle alignment → plasma etch chamber → silicon lattice
 *   → the die itself, where the light lands on photoresist over silicon and
 *   the CMOS circuit comes out of it.
 *
 * The tunnel is rendered into a small off-screen target each frame; its
 * luminance is read back and drives an interactive dot-and-line overlay, so
 * the particles literally track the contrast of the footage.
 */

const SEG = 16;
const WAFER_Z = -72;        // the silicon wafer the laser strikes
const CORRIDOR_Z = -230;    // where the tunnel corridor begins
const RETICLE_END = -560;
const PLASMA_END = -1000;
const TRAVEL_END = -1420;
const CHIP_Z = -1455;       // the die sits just beyond the end of the flight
const DIE_R = 12;
const RESIST_R = 12.7;

/**
 * The opening of the flight. The laser comes in from the right and crosses
 * the frame; the camera closes on the wafer it strikes, swings around it and
 * pushes in, then dives into the corridor.
 * `p` position, `l` look-at, `f` field of view.
 */
const OPTICAL_KEYS = [
  { t: 0.000, p: [0, 2.0, 40], l: [0, 0, -60], f: 42 },
  { t: 0.060, p: [-6.5, 2.6, -16], l: [0, 0, -70], f: 38 },
  { t: 0.110, p: [-9.5, 2.2, -46], l: [0, 0, -72], f: 31 },
  { t: 0.150, p: [-5.0, 1.4, -58], l: [0, 0, -72], f: 24 },
  { t: 0.190, p: [4.5, 2.4, -74], l: [0, 0, -72], f: 26 },
  { t: 0.230, p: [3.0, 3.0, -160], l: [0, 0, -250], f: 36 },
  { t: 0.260, p: [0, 2.0, -292], l: [0, 0, -340], f: 42 },
];

export function createTunnel() {
  const group = new THREE.Group();
  group.name = 'tunnel';
  group.visible = false;

  // ---------------------------------------------------------------- rings --
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x2f7f9e,
    transparent: true,
    opacity: 0.75,
    toneMapped: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const ringGeo = new THREE.TorusGeometry(1, 0.035, 6, 56);
  const rings = new THREE.InstancedMesh(ringGeo, ringMat, 120);
  rings.frustumCulled = false;
  group.add(rings);

  // ribs (radial struts) for speed cue
  const ribGeo = new THREE.BoxGeometry(1, 0.09, 0.09);
  const ribMat = new THREE.MeshBasicMaterial({
    color: 0x16404f,
    transparent: true,
    opacity: 0.55,
    toneMapped: false,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const RIBS_PER_RING = 6;
  const ribs = new THREE.InstancedMesh(ribGeo, ribMat, 120 * RIBS_PER_RING);
  ribs.frustumCulled = false;
  group.add(ribs);

  // -------------------------------------------------------------- reticle --
  const reticleTex = makeReticleTexture();
  const reticleMat = new THREE.MeshBasicMaterial({
    map: reticleTex,
    transparent: true,
    opacity: 0,
    toneMapped: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const reticles = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), reticleMat, 6);
  reticles.frustumCulled = false;
  group.add(reticles);

  // --------------------------------------------------------------- plasma --
  const plasmaGroup = new THREE.Group();
  group.add(plasmaGroup);

  // a soft, camera-facing haze instead of a hard-edged sphere
  const plasmaGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: makeGlowTexture(),
      color: 0x9a6cff,
      transparent: true,
      opacity: 0.0,
      toneMapped: false,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      fog: false,
    })
  );
  plasmaGlow.renderOrder = 4;
  plasmaGroup.add(plasmaGlow);

  const sparkCount = 2600;
  const sparkPos = new Float32Array(sparkCount * 3);
  const sparkSeed = new Float32Array(sparkCount);
  for (let i = 0; i < sparkCount; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * 5.6;
    sparkPos[i * 3] = Math.cos(a) * r;
    sparkPos[i * 3 + 1] = Math.sin(a) * r;
    // sparks live in the etch chamber only
    sparkPos[i * 3 + 2] = RETICLE_END + Math.random() * (RETICLE_END - PLASMA_END);
    sparkSeed[i] = Math.random() * 100;
  }
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  sparkGeo.setAttribute('aSeed', new THREE.BufferAttribute(sparkSeed, 1));
  const sparkMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 } },
    vertexShader: /* glsl */ `
      attribute float aSeed;
      uniform float uTime;
      varying float vSeed;
      void main() {
        vSeed = aSeed;
        vec3 p = position;
        float t = uTime * (1.4 + aSeed * 0.02);
        p.x += sin(t + aSeed) * 0.55;
        p.y += cos(t * 1.3 + aSeed * 1.7) * 0.55;
        p.z += sin(t * 0.7 + aSeed * 0.3) * 1.6;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = clamp((9.0 + 6.0 * sin(aSeed + uTime * 3.0)) * (26.0 / -mv.z), 1.0, 22.0);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      varying float vSeed;
      void main() {
        vec2 d = gl_PointCoord - 0.5;
        float m = smoothstep(0.5, 0.0, length(d));
        vec3 col = mix(vec3(0.55, 0.35, 1.0), vec3(1.0, 0.72, 0.35), fract(vSeed * 0.137));
        gl_FragColor = vec4(col, m * uOpacity * 0.85);
      }
    `,
  });
  const sparks = new THREE.Points(sparkGeo, sparkMat);
  sparks.frustumCulled = false;
  plasmaGroup.add(sparks);

  // -------------------------------------------------------------- lattice --
  const latticeGroup = new THREE.Group();
  group.add(latticeGroup);

  const LAT_SPACING = 3.0;
  const LAT_R = 0.34;
  const latPts = [];
  // a hollow crystal: the flight path stays clear, the lattice forms the walls
  const INNER = 5.0;
  const OUTER = 10.4;
  for (let x = -5; x <= 5; x++) {
    for (let y = -5; y <= 5; y++) {
      for (let z = 0; z < 140; z++) {
        if ((x + y + z) % 2 !== 0) continue;
        const px = x * LAT_SPACING;
        const py = y * LAT_SPACING;
        const r = Math.hypot(px, py);
        if (r < INNER || r > OUTER) continue;
        const pz = PLASMA_END - 40 - z * LAT_SPACING;
        if (pz < TRAVEL_END - 40) continue;
        latPts.push(px, py, pz);
      }
    }
  }
  const latCount = latPts.length / 3;
  const latGeo = new THREE.IcosahedronGeometry(LAT_R, 1);
  const latMat = new THREE.MeshBasicMaterial({
    color: 0xcfeaff,
    transparent: true,
    opacity: 0.0,
    toneMapped: false,
  });
  const lattice = new THREE.InstancedMesh(latGeo, latMat, latCount);
  lattice.frustumCulled = false;
  const dummy = new THREE.Object3D();
  const latColors = new Float32Array(latCount * 3);
  const cool = new THREE.Color(0xbfe6ff);
  const warm = new THREE.Color(0xfff0d8);
  for (let i = 0; i < latCount; i++) {
    dummy.position.set(latPts[i * 3], latPts[i * 3 + 1], latPts[i * 3 + 2]);
    dummy.scale.setScalar(0.7 + Math.random() * 0.5);
    dummy.rotation.set(Math.random(), Math.random(), Math.random());
    dummy.updateMatrix();
    lattice.setMatrixAt(i, dummy.matrix);
    const c = cool.clone().lerp(warm, Math.random() * 0.35);
    latColors[i * 3] = c.r;
    latColors[i * 3 + 1] = c.g;
    latColors[i * 3 + 2] = c.b;
  }
  lattice.instanceColor = new THREE.InstancedBufferAttribute(latColors, 3);
  lattice.instanceMatrix.needsUpdate = true;
  latticeGroup.add(lattice);

  // glowing "bond planes" in the crystal
  const planeMat = new THREE.MeshBasicMaterial({
    color: 0x2f7fa8,
    transparent: true,
    opacity: 0,
    toneMapped: false,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  for (let i = 0; i < 7; i++) {
    const p = new THREE.Mesh(new THREE.RingGeometry(3.6, 9.4, 48), planeMat);
    p.position.z = PLASMA_END - 60 - i * 58;
    latticeGroup.add(p);
  }

  // ------------------------------------------------------------------ chip --
  // The landing: a substrate of silicon atoms, a sheet of photoresist, and
  // the CMOS die that the light prints onto it.
  const chipGroup = new THREE.Group();
  group.add(chipGroup);

  // --- substrate: a dense array of silicon atoms --------------------------
  const siGeo = new THREE.IcosahedronGeometry(0.25, 0);
  const siMat = new THREE.MeshBasicMaterial({
    color: 0x9fd0f2,
    transparent: true,
    opacity: 0,
    toneMapped: false,
  });
  const SI_SPACING = 0.8;
  const SI_R = 15.0;
  const siPos = [];
  for (let ix = -17; ix <= 17; ix++) {
    for (let iy = -17; iy <= 17; iy++) {
      const x = ix * SI_SPACING;
      const y = iy * SI_SPACING;
      if (Math.hypot(x, y) > SI_R) continue;
      // stagger alternate rows so the array reads as a crystal, not a sheet
      const z = CHIP_Z - 1.5 - (ix % 2 === 0 ? 0 : 0.3);
      siPos.push(x, y, z);
    }
  }
  const si = new THREE.InstancedMesh(siGeo, siMat, siPos.length / 3);
  si.frustumCulled = false;
  for (let i = 0; i < siPos.length / 3; i++) {
    dummy.position.set(siPos[i * 3], siPos[i * 3 + 1], siPos[i * 3 + 2]);
    dummy.rotation.set(Math.random(), Math.random(), Math.random());
    dummy.scale.setScalar(0.75 + Math.random() * 0.45);
    dummy.updateMatrix();
    si.setMatrixAt(i, dummy.matrix);
  }
  si.instanceMatrix.needsUpdate = true;
  chipGroup.add(si);

  // --- the die: the CMOS layout, lit --------------------------------------
  const dieMat = new THREE.MeshBasicMaterial({
    map: makeCmosTexture('chip'),
    transparent: true,
    opacity: 0,
    toneMapped: false,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const die = new THREE.Mesh(new THREE.CircleGeometry(DIE_R, 96), dieMat);
  die.position.z = CHIP_Z;
  chipGroup.add(die);

  // --- the resist: the mask sheet, waiting to be burned off ---------------
  const resistMat = new THREE.MeshBasicMaterial({
    map: makeCmosTexture('mask'),
    transparent: true,
    opacity: 0,
    toneMapped: false,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const resist = new THREE.Mesh(new THREE.CircleGeometry(RESIST_R, 96), resistMat);
  resist.position.z = CHIP_Z + 0.5;
  chipGroup.add(resist);

  // --- the light that lands on it ----------------------------------------
  const landBeamMat = new THREE.MeshBasicMaterial({
    color: 0xbfe6ff,
    transparent: true,
    opacity: 0,
    toneMapped: false,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const landBeam = makeRayBundle({
    count: 9,
    fromRadius: 5.5,
    fromZ: CHIP_Z + 80,
    toRadius: 0.5,
    toZ: CHIP_Z,
    radius: 0.022,
    material: landBeamMat,
  });
  chipGroup.add(landBeam);

  const impactMat = new THREE.SpriteMaterial({
    map: makeGlowTexture(),
    color: 0xe8f6ff,
    transparent: true,
    opacity: 0,
    toneMapped: false,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
    fog: false,
  });
  const impact = new THREE.Sprite(impactMat);
  impact.position.set(0, 0, CHIP_Z + 0.2);
  impact.scale.setScalar(14);
  impact.renderOrder = 6;
  chipGroup.add(impact);

  // --- the light path itself: short, focused, gone by the reticle --------
  const optBeamMat = new THREE.MeshBasicMaterial({
    color: 0xd8f2ff,
    transparent: true,
    opacity: 0,
    toneMapped: false,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  // the laser comes in from the right and strikes the wafer
  const optBeam = makeRayBundle({
    count: 7,
    fromRadius: 1.9,
    fromZ: 6,
    toRadius: 0.35,
    toZ: WAFER_Z + 0.4,
    radius: 0.032,
    material: optBeamMat,
    origin: new THREE.Vector3(34, 3.5, 14),
  });
  group.add(optBeam);

  // the silicon wafer it lands on
  const waferMat = new THREE.MeshStandardMaterial({
    color: 0x1b2a38,
    metalness: 0.92,
    roughness: 0.22,
    emissive: new THREE.Color(0x0a2233),
    emissiveIntensity: 0.4,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
  });
  const wafer = new THREE.Mesh(new THREE.CircleGeometry(4.6, 64), waferMat);
  wafer.position.set(0, 0, WAFER_Z);
  wafer.rotation.set(-0.22, 0, 0.1);
  group.add(wafer);

  // its rim catches the light
  const waferRimMat = new THREE.MeshBasicMaterial({
    color: 0x8fe6ff,
    transparent: true,
    opacity: 0,
    toneMapped: false,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const waferRim = new THREE.Mesh(new THREE.RingGeometry(4.45, 4.68, 64), waferRimMat);
  waferRim.position.copy(wafer.position);
  waferRim.rotation.copy(wafer.rotation);
  group.add(waferRim);

  // where the beam lands
  const hitMat = new THREE.SpriteMaterial({
    map: makeGlowTexture(),
    color: 0xdff4ff,
    transparent: true,
    opacity: 0,
    toneMapped: false,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
    fog: false,
  });
  const hit = new THREE.Sprite(hitMat);
  hit.position.set(0, 0, WAFER_Z + 0.6);
  hit.scale.setScalar(9);
  hit.renderOrder = 5;
  group.add(hit);

  // --------------------------------------------------------------- layout --
  // Fill the ring / rib instances for the whole run.
  let ringIdx = 0;
  let ribIdx = 0;
  const ringRadius = (z) => {
    if (z > RETICLE_END) return THREE.MathUtils.lerp(4.2, 5.4, (CORRIDOR_Z - z) / (CORRIDOR_Z - RETICLE_END));
    if (z > PLASMA_END) return 5.4 + Math.sin((z - RETICLE_END) * 0.05) * 0.6;
    return THREE.MathUtils.lerp(5.4, 9.5, (PLASMA_END - z) / (PLASMA_END - TRAVEL_END));
  };
  const ringTint = (z) => {
    if (z > RETICLE_END) return new THREE.Color(0xbfe6ff);
    if (z > PLASMA_END) return new THREE.Color(0xa07bff);
    return new THREE.Color(0x6fa8d8);
  };

  for (let z = CORRIDOR_Z; z > TRAVEL_END; z -= SEG) {
    const r = ringRadius(z);
    dummy.position.set(0, 0, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(r, r, 1);
    dummy.updateMatrix();
    rings.setMatrixAt(ringIdx, dummy.matrix);
    rings.setColorAt(ringIdx, ringTint(z));
    ringIdx++;

    for (let k = 0; k < RIBS_PER_RING; k++) {
      const a = (k / RIBS_PER_RING) * Math.PI * 2;
      dummy.position.set((Math.cos(a) * r) / 2, (Math.sin(a) * r) / 2, z);
      dummy.rotation.set(0, 0, a);
      dummy.scale.set(r, 1, 1);
      dummy.updateMatrix();
      ribs.setMatrixAt(ribIdx, dummy.matrix);
      ribIdx++;
    }
  }
  // hide unused instances
  dummy.position.set(0, 0, 99999);
  dummy.scale.setScalar(0.0001);
  dummy.updateMatrix();
  for (let i = ringIdx; i < 120; i++) rings.setMatrixAt(i, dummy.matrix);
  for (let i = ribIdx; i < 120 * RIBS_PER_RING; i++) ribs.setMatrixAt(i, dummy.matrix);
  rings.instanceMatrix.needsUpdate = true;
  ribs.instanceMatrix.needsUpdate = true;
  if (rings.instanceColor) rings.instanceColor.needsUpdate = true;

  // reticle plates inside the reticle section
  for (let i = 0; i < 6; i++) {
    const z = -110 - i * 45;
    dummy.position.set(0, 0, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(9, 9, 1);
    dummy.updateMatrix();
    reticles.setMatrixAt(i, dummy.matrix);
  }
  reticles.instanceMatrix.needsUpdate = true;

  // ------------------------------------------------------------- runtime --
  const state = {
    group,
    /** camera z for the current film time */
    camZ: 0,
    /** 0 → invisible, 1 → fully present */
    presence: 0,

    /** Place the camera on the tunnel path for film time t (0..1). */
    placeCamera(camera, t, elapsed) {
      const eased = t * t * (3 - 2 * t) * 0.35 + t * 0.65; // ease-in at the start
      const z = THREE.MathUtils.lerp(40, TRAVEL_END, eased);
      state.camZ = z;

      const sway = Math.sin(elapsed * 0.8) * 0.32 + Math.sin(elapsed * 0.37) * 0.2;
      const swayY = Math.cos(elapsed * 0.62) * 0.28;

      const opt = sampleOpticalKeys(t);
      if (opt) {
        // the opening: the camera closes on the wafer the laser strikes,
        // swings around it and pushes in
        camera.position.set(opt.p[0], opt.p[1], opt.p[2]);
        camera.lookAt(opt.l[0], opt.l[1], opt.l[2]);
        camera.rotation.z += Math.sin(elapsed * 0.45) * 0.07;
        camera.rotation.x += Math.sin(elapsed * 0.29) * 0.03;
        if (camera.fov !== opt.f) {
          camera.fov = opt.f;
          camera.updateProjectionMatrix();
        }
      } else {
        camera.position.set(sway, swayY, z);
        // look slightly ahead down the tunnel, with a slow roll
        camera.rotation.set(0, 0, 0);
        camera.rotation.z = Math.sin(elapsed * 0.45) * 0.09;
        camera.rotation.x = Math.sin(elapsed * 0.29) * 0.035;
        camera.rotation.y = Math.sin(elapsed * 0.51) * 0.05;
        if (camera.fov !== 42) {
          camera.fov = 42;
          camera.updateProjectionMatrix();
        }
      }

      // section-driven material states (distance travelled, always increasing)
      const dist = -z;
      const inLattice = dist >= -PLASMA_END;
      const nearPlasma = THREE.MathUtils.smoothstep(dist, -RETICLE_END - 20, -PLASMA_END - 40);
      const plasmaFade = 1 - THREE.MathUtils.smoothstep(dist, -PLASMA_END + 20, -PLASMA_END + 200);
      const inReticle = dist > -RETICLE_END && dist < -PLASMA_END;
      const inOptical = dist < 300;

      ringMat.opacity = 0.75 * state.presence * (inLattice ? 0.12 : 1);
      ribMat.opacity = 0.5 * state.presence * (inLattice ? 0.05 : 1);
      reticleMat.opacity = inReticle ? 0.42 * state.presence : 0;
      // the haze belongs to the etch chamber and dissolves into the crystal
      plasmaGlow.material.opacity = nearPlasma * plasmaFade * 0.38 * state.presence;
      plasmaGlow.position.set(0, 0, z - 26);
      plasmaGlow.scale.setScalar(19);
      sparkMat.uniforms.uOpacity.value = nearPlasma * plasmaFade * 0.85 * state.presence;
      sparkMat.uniforms.uTime.value = elapsed;
      latMat.opacity = THREE.MathUtils.smoothstep(dist, -PLASMA_END - 30, -PLASMA_END + 70) * 0.8 * state.presence;
      planeMat.opacity = THREE.MathUtils.smoothstep(dist, -PLASMA_END - 30, -PLASMA_END + 180) * 0.22 * state.presence;

      // --- the light path is brief: it is gone by the time the mask lands --
      optBeamMat.opacity =
        (1 - THREE.MathUtils.smoothstep(dist, 90, 230)) * 0.5 * state.presence;
      // the wafer the laser lands on, and the light on its surface
      const waferVis = 1 - THREE.MathUtils.smoothstep(dist, 110, 250);
      waferMat.opacity = waferVis * state.presence;
      waferRimMat.opacity = waferVis * 0.85 * state.presence;
      hitMat.opacity =
        (1 - THREE.MathUtils.smoothstep(dist, 170, 300)) * 0.95 * state.presence;

      // --- the landing: light on resist, resist burning off, circuit left --
      const nearChip = THREE.MathUtils.smoothstep(dist, 1150, 1360);
      const burn = THREE.MathUtils.smoothstep(dist, 1360, 1425);
      siMat.opacity = nearChip * 0.5 * state.presence;
      dieMat.opacity = nearChip * (0.22 + 0.78 * burn) * state.presence;
      resistMat.opacity = nearChip * (1 - burn) * 0.9 * state.presence;
      landBeamMat.opacity = nearChip * (0.1 + 0.32 * burn) * state.presence;
      impactMat.opacity = nearChip * (0.1 + 0.42 * burn) * state.presence;
      impact.scale.setScalar(8 + 9 * burn);
      return z;
    },

    update(dt, elapsed) {
      // plasma churn
      plasmaGroup.rotation.z = elapsed * 0.12;
      sparks.rotation.z = -elapsed * 0.2;
      latticeGroup.rotation.y = Math.sin(elapsed * 0.2) * 0.05;
    },
  };

  return state;
}

/** Soft radial glow used for the plasma haze. */
function makeGlowTexture(size = 256) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const g = cv.getContext('2d');
  const c = size / 2;
  const grd = g.createRadialGradient(c, c, 0, c, c, c);
  grd.addColorStop(0, 'rgba(255,255,255,0.95)');
  grd.addColorStop(0.12, 'rgba(190,150,255,0.55)');
  grd.addColorStop(0.42, 'rgba(120,80,220,0.18)');
  grd.addColorStop(1, 'rgba(60,30,140,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Crosshair / reticle alignment target drawn on a canvas. */
function makeReticleTexture(size = 512) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const g = cv.getContext('2d');
  g.clearRect(0, 0, size, size);
  const c = size / 2;

  // the mask itself — the circuit that is about to be printed
  drawCmosLayout(g, size, 'mask', 0.5);

  g.strokeStyle = 'rgba(150,225,255,0.85)';
  g.lineWidth = 2;
  for (let i = 1; i < 10; i++) {
    g.globalAlpha = i % 5 === 0 ? 0.5 : 0.18;
    g.beginPath();
    g.moveTo((i * size) / 10, 0);
    g.lineTo((i * size) / 10, size);
    g.moveTo(0, (i * size) / 10);
    g.lineTo(size, (i * size) / 10);
    g.stroke();
  }
  g.globalAlpha = 1;

  // crosshair
  g.strokeStyle = 'rgba(220,245,255,0.95)';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(c, 40);
  g.lineTo(c, c - 70);
  g.moveTo(c, c + 70);
  g.lineTo(c, size - 40);
  g.moveTo(40, c);
  g.lineTo(c - 70, c);
  g.moveTo(c + 70, c);
  g.lineTo(size - 40, c);
  g.stroke();

  // alignment circles
  g.lineWidth = 2;
  g.strokeStyle = 'rgba(140,215,255,0.7)';
  g.beginPath();
  g.arc(c, c, 150, 0, Math.PI * 2);
  g.stroke();
  g.strokeStyle = 'rgba(255,180,107,0.65)';
  g.beginPath();
  g.arc(c, c, 196, 0, Math.PI * 2);
  g.stroke();

  // corner fiducials
  g.strokeStyle = 'rgba(220,245,255,0.9)';
  g.lineWidth = 5;
  const m = 30;
  const L = 60;
  [[m, m, 1, 1], [size - m, m, -1, 1], [m, size - m, 1, -1], [size - m, size - m, -1, -1]].forEach(
    ([x, y, sx, sy]) => {
      g.beginPath();
      g.moveTo(x + sx * L, y);
      g.lineTo(x, y);
      g.lineTo(x, y + sy * L);
      g.stroke();
    }
  );

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * A CMOS layout, drawn as a repeating array of standard cells.
 *
 * Each cell carries a complementary PMOS / NMOS pair — source and drain
 * diffusion, a poly gate across them, metal-1 routing, the metal-2 power
 * rails, contacts and vias — so the pattern reads as a real chip rather than
 * as decoration. `mode` picks the palette: 'mask' is the chrome on the
 * photoresist, 'chip' is the finished die.
 */
function drawCmosLayout(g, size, mode, fade = 1) {
  const C = {
    mask: {
      diff: `rgba(255,198,124,${0.92 * fade})`,
      poly: `rgba(255,160,98,${0.8 * fade})`,
      m1: `rgba(255,230,180,${0.95 * fade})`,
      m2: `rgba(255,244,218,${0.85 * fade})`,
      ring: `rgba(255,204,146,${0.45 * fade})`,
      grid: `rgba(255,190,120,${0.07 * fade})`,
      wash: `rgba(255,178,98,${0.17 * fade})`,
    },
    chip: {
      diff: `rgba(92,208,192,${0.95 * fade})`,
      poly: `rgba(198,128,222,${0.95 * fade})`,
      m1: `rgba(236,182,100,${0.98 * fade})`,
      m2: `rgba(255,216,146,${0.9 * fade})`,
      ring: `rgba(110,190,220,${0.4 * fade})`,
      grid: `rgba(96,170,210,${0.1 * fade})`,
      wash: null,
    },
  }[mode];

  let seed = 20260925;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  // substrate grid
  g.strokeStyle = C.grid;
  g.lineWidth = 1;
  for (let i = 0; i <= 26; i++) {
    const p = (i / 26) * size;
    g.beginPath();
    g.moveTo(p, 0);
    g.lineTo(p, size);
    g.stroke();
    g.beginPath();
    g.moveTo(0, p);
    g.lineTo(size, p);
    g.stroke();
  }

  const cols = 6;
  const rows = 6;
  const cw = size / cols;
  const ch = size / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ox = c * cw + cw * 0.07;
      const oy = r * ch + ch * 0.11;
      const w = cw * 0.86;
      const h = ch * 0.78;
      const flip = rnd() > 0.5;

      // --- diffusion: source and drain of the PMOS and the NMOS ----------
      g.fillStyle = C.diff;
      g.fillRect(ox + w * 0.16, oy + h * 0.05, w * 0.22, h * 0.28);
      g.fillRect(ox + w * 0.62, oy + h * 0.05, w * 0.22, h * 0.28);
      g.fillRect(ox + w * 0.16, oy + h * 0.64, w * 0.22, h * 0.28);
      g.fillRect(ox + w * 0.62, oy + h * 0.64, w * 0.22, h * 0.28);

      // --- poly gates across the channels ---------------------------------
      g.fillStyle = C.poly;
      g.fillRect(ox + w * 0.43, oy + h * 0.03, w * 0.14, h * 0.32);
      g.fillRect(ox + w * 0.43, oy + h * 0.62, w * 0.14, h * 0.32);

      // --- metal 1: the local routing --------------------------------------
      g.fillStyle = C.m1;
      g.fillRect(ox, oy + h * 0.45, w, h * 0.065);
      g.fillRect(ox + w * (flip ? 0.22 : 0.28), oy + h * 0.2, h * 0.055, h * 0.25);
      g.fillRect(ox + w * (flip ? 0.7 : 0.64), oy + h * 0.2, h * 0.055, h * 0.25);

      // --- metal 2: the power rails ---------------------------------------
      g.fillStyle = C.m2;
      g.fillRect(ox, oy, w, h * 0.032);
      g.fillRect(ox, oy + h * 0.955, w, h * 0.032);

      // --- contacts and vias ----------------------------------------------
      g.fillStyle = C.m1;
      for (let k = 0; k < 3; k++) {
        const vx = ox + w * (0.1 + 0.34 * k);
        g.fillRect(vx, oy + h * 0.43, h * 0.042, h * 0.042);
        if (rnd() > 0.25) g.fillRect(vx, oy + h * 0.9, h * 0.042, h * 0.042);
      }

      // --- guard ring ------------------------------------------------------
      g.strokeStyle = C.ring;
      g.lineWidth = 2;
      g.strokeRect(ox - 5, oy - 5, w + 10, h + 10);
    }
  }

  // the resist coats the whole die
  if (C.wash) {
    g.fillStyle = C.wash;
    g.fillRect(0, 0, size, size);
  }
}

/** The CMOS layout as a texture — 'mask' for the resist, 'chip' for the die. */
function makeCmosTexture(mode, size = 1024) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const g = cv.getContext('2d');
  g.clearRect(0, 0, size, size);
  drawCmosLayout(g, size, mode);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** One thin ray of light, from a point to a point. */
function makeRay(from, to, radius, material) {
  const dir = new THREE.Vector3().subVectors(to, from);
  const len = dir.length();
  const geo = new THREE.CylinderGeometry(radius, radius, len, 6, 1, true);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.copy(from).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return mesh;
}

/** A bundle of rays converging from a ring onto a point. */
function makeRayBundle({ count, fromRadius, fromZ, toRadius, toZ, radius, material, origin }) {
  const bundle = new THREE.Group();
  const ox = origin ? origin.x : 0;
  const oy = origin ? origin.y : 0;
  const oz = origin ? origin.z : fromZ;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + 0.2;
    const from = new THREE.Vector3(ox + Math.cos(a) * fromRadius, oy + Math.sin(a) * fromRadius, oz);
    const to = new THREE.Vector3(Math.cos(a) * toRadius, Math.sin(a) * toRadius, toZ);
    bundle.add(makeRay(from, to, radius, material));
  }
  return bundle;
}

/** Interpolates the opening camera move: close on the wafer, swing round it, zoom. */
function sampleOpticalKeys(t) {
  const K = OPTICAL_KEYS;
  if (t <= K[0].t) return { p: K[0].p, l: K[0].l, f: K[0].f };
  for (let i = 0; i < K.length - 1; i++) {
    const a = K[i];
    const b = K[i + 1];
    if (t <= b.t) {
      const u = (t - a.t) / (b.t - a.t);
      const e = u * u * (3 - 2 * u);
      const mix = (p, q) => [
        THREE.MathUtils.lerp(p[0], q[0], e),
        THREE.MathUtils.lerp(p[1], q[1], e),
        THREE.MathUtils.lerp(p[2], q[2], e),
      ];
      return {
        p: mix(a.p, b.p),
        l: mix(a.l, b.l),
        f: THREE.MathUtils.lerp(a.f, b.f, e),
      };
    }
  }
  return null;
}
