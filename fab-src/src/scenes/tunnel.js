import * as THREE from 'three';

/**
 * Scene 3 — "Into the Wafer".
 *
 * A first-person flight through the inside of a fab, rendered procedurally:
 *   optical path → reticle alignment → plasma etch chamber → silicon lattice.
 *
 * The tunnel is rendered into a small off-screen target each frame; its
 * luminance is read back and drives an interactive dot-and-line overlay, so
 * the particles literally track the contrast of the footage.
 */

const SEG = 16;
const OPTICAL_END = -300;
const RETICLE_END = -620;
const PLASMA_END = -980;
const TRAVEL_END = -1420;

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

  // --------------------------------------------------------------- layout --
  // Fill the ring / rib instances for the whole run.
  let ringIdx = 0;
  let ribIdx = 0;
  const ringRadius = (z) => {
    if (z > OPTICAL_END) return THREE.MathUtils.lerp(7.2, 4.2, (z - 0) / (0 - OPTICAL_END));
    if (z > RETICLE_END) return THREE.MathUtils.lerp(4.2, 5.4, (OPTICAL_END - z) / (OPTICAL_END - RETICLE_END));
    if (z > PLASMA_END) return 5.4 + Math.sin((z - RETICLE_END) * 0.05) * 0.6;
    return THREE.MathUtils.lerp(5.4, 9.5, (PLASMA_END - z) / (PLASMA_END - TRAVEL_END));
  };
  const ringTint = (z) => {
    if (z > OPTICAL_END) return new THREE.Color(0x7fe0ff);
    if (z > RETICLE_END) return new THREE.Color(0xbfe6ff);
    if (z > PLASMA_END) return new THREE.Color(0xa07bff);
    return new THREE.Color(0x6fa8d8);
  };

  for (let z = 0; z > TRAVEL_END; z -= SEG) {
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
    const z = RETICLE_END + 40 + i * 52;
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

      camera.position.set(sway, swayY, z);
      // look slightly ahead down the tunnel, with a slow roll
      camera.rotation.set(0, 0, 0);
      camera.rotation.z = Math.sin(elapsed * 0.45) * 0.09;
      camera.rotation.x = Math.sin(elapsed * 0.29) * 0.035;
      camera.rotation.y = Math.sin(elapsed * 0.51) * 0.05;

      // section-driven material states (distance travelled, always increasing)
      const dist = -z;
      const inLattice = dist >= -PLASMA_END;
      const nearPlasma = THREE.MathUtils.smoothstep(dist, -RETICLE_END - 20, -PLASMA_END - 40);
      const plasmaFade = 1 - THREE.MathUtils.smoothstep(dist, -PLASMA_END + 20, -PLASMA_END + 200);
      const inReticle = dist > -OPTICAL_END && dist < -RETICLE_END;

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
