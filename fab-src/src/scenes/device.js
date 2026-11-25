import * as THREE from 'three';

/**
 * Scene 1 — the device.
 *
 * A thin-film transistor drawn as a physical stack: a silicon substrate, a
 * back gate, a gate dielectric, an organic semiconductor channel with source
 * and drain electrodes, and an electrolyte gel on top. Cations drift down
 * through the gel toward the channel, some of them are captured by receptor
 * sites, and charge carriers move along the channel — the whole vocabulary
 * of the work: charge, ions, atoms, and the transistor they switch.
 *
 * Everything here is procedural — geometry, materials and animation — so the
 * site carries no third-party asset.
 */

const GLASS = 0x0e1620;
const METAL = 0xb99a68;
const OXIDE = 0x3fd8e8;
const CHANNEL = 0x2fbf9a;
const GEL = 0x7a5cff;

/** Builds the thin-film transistor stack. */
export function createDevice() {
  const group = new THREE.Group();
  group.name = 'device';

  const root = new THREE.Group();
  root.name = 'device-root';
  // the stack is authored at full size and then scaled to sit comfortably in
  // the camera's frame
  root.scale.setScalar(0.56);
  root.position.y = 1.2;
  group.add(root);

  const solid = [];      // opaque surfaces
  const translucent = []; // gel / oxide / glass
  const edgeSources = [];

  const add = (geo, mat, x, y, z, { edges = false, kind = 'solid' } = {}) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    root.add(mesh);
    if (kind === 'solid') solid.push(mesh);
    else translucent.push(mesh);
    if (edges) edgeSources.push(mesh);
    return mesh;
  };

  // ------------------------------------------------------------ materials --
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: GLASS,
    metalness: 0.1,
    roughness: 0.18,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: METAL,
    metalness: 0.88,
    roughness: 0.4,
    envMapIntensity: 0.5,
    transparent: true,
    opacity: 1,
  });
  const oxideMat = new THREE.MeshPhysicalMaterial({
    color: OXIDE,
    emissive: new THREE.Color(OXIDE),
    emissiveIntensity: 0.045,
    metalness: 0.0,
    roughness: 0.1,
    transparent: true,
    opacity: 0.28,
    side: THREE.DoubleSide,
  });
  const channelMat = new THREE.MeshStandardMaterial({
    color: CHANNEL,
    emissive: new THREE.Color(0x0d6b56),
    emissiveIntensity: 0.11,
    metalness: 0.35,
    roughness: 0.45,
    transparent: true,
    opacity: 1,
  });
  const gelMat = new THREE.MeshPhysicalMaterial({
    color: GEL,
    emissive: new THREE.Color(0x2a1a66),
    emissiveIntensity: 0.12,
    metalness: 0.0,
    roughness: 0.25,
    transparent: true,
    opacity: 0.12,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  // ------------------------------------------------------------ the stack --
  const W = 20;   // device width
  const D = 11;   // device depth

  // silicon substrate the whole thing is grown on
  add(new THREE.BoxGeometry(W + 2.4, 1.0, D + 2.4), glassMat, 0, -3.1, 0, { edges: true });

  // back gate
  add(new THREE.BoxGeometry(W, 0.7, D), metalMat, 0, -2.1, 0, { edges: true });

  // gate dielectric — a few atoms thick
  add(new THREE.BoxGeometry(W - 0.5, 0.28, D - 0.5), oxideMat, 0, -1.5, 0, {
    edges: true, kind: 'glass',
  });

  // the organic semiconductor channel
  add(new THREE.BoxGeometry(W * 0.42, 0.62, D * 0.72), channelMat, 0, -0.85, 0, {
    edges: true,
  });

  // source and drain
  add(new THREE.BoxGeometry(W * 0.2, 0.75, D * 0.8), metalMat, -W * 0.31, -0.8, 0, {
    edges: true,
  });
  add(new THREE.BoxGeometry(W * 0.2, 0.75, D * 0.8), metalMat, W * 0.31, -0.8, 0, {
    edges: true,
  });

  // the electrolyte gel, where the ions live
  const gel = add(new THREE.BoxGeometry(W + 1.2, 3.2, D + 0.8), gelMat, 0, 1.1, 0, {
    edges: true, kind: 'glass',
  });

  // ------------------------------------------------- the silicon lattice --
  // the atoms of the substrate, seen edge-on under the device
  const ATOM_R = 0.62;
  const LAT_SPACING = 1.35;
  const latPts = [];
  for (let ix = -7; ix <= 7; ix++) {
    for (let iy = 0; iy < 2; iy++) {
      for (let iz = -4; iz <= 4; iz++) {
        // diamond-cubic offset: alternate layers shift by half a cell
        const ox = (iy % 2) * LAT_SPACING * 0.5;
        const oz = (iy % 2) * LAT_SPACING * 0.5;
        latPts.push(
          ix * LAT_SPACING + ox,
          -4.3 - iy * LAT_SPACING * 0.82,
          iz * LAT_SPACING + oz
        );
      }
    }
  }
  const latCount = latPts.length / 3;
  const latGeo = new THREE.IcosahedronGeometry(ATOM_R, 1);
  const latMat = new THREE.MeshBasicMaterial({
    color: 0x9fd8ff,
    transparent: true,
    opacity: 0.0,
    toneMapped: false,
  });
  const lattice = new THREE.InstancedMesh(latGeo, latMat, latCount);
  lattice.frustumCulled = false;
  const dummy = new THREE.Object3D();
  const latColors = new Float32Array(latCount * 3);
  const atomCool = new THREE.Color(0xbfe8ff);
  const atomWarm = new THREE.Color(0xffd9a8);
  for (let i = 0; i < latCount; i++) {
    dummy.position.set(latPts[i * 3], latPts[i * 3 + 1], latPts[i * 3 + 2]);
    dummy.rotation.set(Math.random(), Math.random(), Math.random());
    dummy.scale.setScalar(0.72 + Math.random() * 0.4);
    dummy.updateMatrix();
    lattice.setMatrixAt(i, dummy.matrix);
    const c = atomCool.clone().lerp(atomWarm, Math.random() * 0.3);
    latColors[i * 3] = c.r;
    latColors[i * 3 + 1] = c.g;
    latColors[i * 3 + 2] = c.b;
  }
  lattice.instanceColor = new THREE.InstancedBufferAttribute(latColors, 3);
  lattice.instanceMatrix.needsUpdate = true;
  root.add(lattice);

  // ---------------------------------------------------------- the charge --
  // cations drifting through the gel toward the channel
  const ION_COUNT = 340;
  const ions = [];
  const ionGeo = new THREE.SphereGeometry(0.13, 8, 6);
  const ionMat = new THREE.MeshBasicMaterial({
    color: 0xffc46b,
    transparent: true,
    opacity: 0,
    toneMapped: false,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const ionMesh = new THREE.InstancedMesh(ionGeo, ionMat, ION_COUNT);
  ionMesh.frustumCulled = false;
  for (let i = 0; i < ION_COUNT; i++) {
    ions.push({
      x: (Math.random() - 0.5) * (W + 0.4),
      y: -0.4 + Math.random() * 3.6,
      z: (Math.random() - 0.5) * (D + 0.2),
      vy: -0.16 - Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
      captured: false,
      site: -1,
    });
  }
  root.add(ionMesh);

  // receptor sites — where a biosensor catches what it is looking for
  const RECEPTORS = 7;
  const receptors = [];
  const recGeo = new THREE.TorusGeometry(0.85, 0.13, 6, 20);
  const recMat = new THREE.MeshBasicMaterial({
    color: 0xc79bff,
    transparent: true,
    opacity: 0,
    toneMapped: false,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  for (let i = 0; i < RECEPTORS; i++) {
    const m = new THREE.Mesh(recGeo, recMat);
    const a = (i / RECEPTORS) * Math.PI * 2 + 0.4;
    m.position.set(Math.cos(a) * W * 0.3, 0.6 + Math.random() * 1.6, Math.sin(a) * D * 0.26);
    m.rotation.set(Math.PI / 2, 0, a);
    root.add(m);
    receptors.push(m);
  }

  // carriers moving along the channel — the drain current
  const CARRIER_COUNT = 90;
  const carrierPos = new Float32Array(CARRIER_COUNT * 3);
  const carrierSeed = new Float32Array(CARRIER_COUNT);
  for (let i = 0; i < CARRIER_COUNT; i++) {
    carrierPos[i * 3] = (Math.random() - 0.5) * W * 0.38;
    carrierPos[i * 3 + 1] = -0.85 + (Math.random() - 0.5) * 0.4;
    carrierPos[i * 3 + 2] = (Math.random() - 0.5) * D * 0.6;
    carrierSeed[i] = Math.random();
  }
  const carrierGeo = new THREE.BufferGeometry();
  carrierGeo.setAttribute('position', new THREE.BufferAttribute(carrierPos, 3));
  carrierGeo.setAttribute('aSeed', new THREE.BufferAttribute(carrierSeed, 1));
  const carrierMat = new THREE.ShaderMaterial({
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
        float dir = mod(floor(aSeed * 2.0), 2.0) * 2.0 - 1.0;
        // carriers sweep along the channel, faster when the device is on
        p.x += dir * mod(uTime * (1.4 + aSeed) + aSeed * 9.0, 9.0) - dir * 4.5;
        p.y += sin(uTime * 2.0 + aSeed * 12.0) * 0.12;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = clamp(9.0 * (26.0 / -mv.z), 1.0, 14.0);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      varying float vSeed;
      void main() {
        vec2 d = gl_PointCoord - 0.5;
        float m = smoothstep(0.5, 0.0, length(d));
        vec3 col = mix(vec3(0.25, 0.95, 0.85), vec3(0.75, 1.0, 1.0), vSeed);
        gl_FragColor = vec4(col, m * uOpacity * 0.8);
      }
    `,
  });
  const carriers = new THREE.Points(carrierGeo, carrierMat);
  carriers.frustumCulled = false;
  root.add(carriers);

  // ------------------------------------------------- the wireframe reveal --
  const edgeMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uReveal: { value: 0 },
      uOpacity: { value: 1 },
      uColor: { value: new THREE.Color(0x7fd6f2) },
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      attribute float aOffset;
      varying float vOffset;
      void main() {
        vOffset = aOffset;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uReveal;
      uniform float uOpacity;
      uniform float uTime;
      uniform vec3 uColor;
      varying float vOffset;
      void main() {
        float band = smoothstep(vOffset, vOffset + 0.06, uReveal);
        float head = smoothstep(0.10, 0.0, abs(uReveal - vOffset));
        float flicker = 0.86 + 0.14 * sin(uTime * 2.0 + vOffset * 40.0);
        float a = band * uOpacity * flicker;
        vec3 col = mix(uColor, vec3(1.0), head * 0.7);
        if (a < 0.004) discard;
        gl_FragColor = vec4(col * (0.16 + head * 0.75), a * 0.5);
      }
    `,
  });

  const edgeGroup = new THREE.Group();
  edgeGroup.name = 'device-edges';
  for (const mesh of edgeSources) {
    const geo = new THREE.EdgesGeometry(mesh.geometry, 30);
    const pos = geo.attributes.position;
    const offs = new Float32Array(pos.count);
    const bb = new THREE.Box3().setFromBufferAttribute(pos);
    const h = Math.max(1e-4, bb.max.y - bb.min.y);
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      // sweep from the source electrode across to the drain
      offs[i] = THREE.MathUtils.clamp((v.x - bb.min.x) / Math.max(1e-4, bb.max.x - bb.min.x), 0, 1);
    }
    geo.setAttribute('aOffset', new THREE.BufferAttribute(offs, 1));
    const lines = new THREE.LineSegments(geo, edgeMat);
    lines.frustumCulled = false;
    lines.position.copy(mesh.position);
    edgeGroup.add(lines);
  }
  root.add(edgeGroup);

  // ------------------------------------------------------------- lighting --
  const key = new THREE.DirectionalLight(0xe6f0ff, 1.8);
  key.position.set(9, 14, 10);
  const rim = new THREE.DirectionalLight(0x74d9ff, 1.7);
  rim.position.set(-12, 5, -10);
  const fill = new THREE.HemisphereLight(0x3a5468, 0x0c1118, 1.1);
  const core = new THREE.PointLight(0x5ff0d0, 1.5, 36, 2);
  core.position.set(0, -0.4, 0);
  group.add(key, rim, fill, core);

  // ---------------------------------------------------------------- state --
  const api = {
    group,
    root,
    edgeGroup,
    edgeMat,
    materials: solid.map((m) => m.material),
    translucentMaterials: translucent.map((m) => m.material),
    emissiveMaterials: [channelMat, oxideMat],
    coreLight: core,

    /** Solid panels fade / materialise. */
    setSolidOpacity(v) {
      const on = v > 0.999;
      for (const m of api.materials) {
        m.opacity = v;
        m.transparent = !on;
        m.depthWrite = on;
      }
      for (const m of api.translucentMaterials) {
        m.opacity = v * (m === gelMat ? 0.12 : m === glassMat ? 0.5 : 0.22);
        m.visible = v > 0.02;
      }
      for (const m of api.emissiveMaterials) {
        m.emissiveIntensity = (m === channelMat ? 0.11 : 0.045) * v;
        m.opacity = Math.min(1, v * 1.1);
      }
      latMat.opacity = 0.3 * v;
      ionMat.opacity = 0.5 * v;
      recMat.opacity = 0.38 * v;
      carrierMat.uniforms.uOpacity.value = v;
    },

    /** 0 → nothing drawn, 1 → every edge visible. */
    setEdgeReveal(v) {
      edgeMat.uniforms.uReveal.value = v;
      edgeGroup.visible = v > 0.0005;
    },

    setEdgeOpacity(v) {
      edgeMat.uniforms.uOpacity.value = v;
    },

    update(dt, elapsed) {
      edgeMat.uniforms.uTime.value = elapsed;
      carrierMat.uniforms.uTime.value = elapsed;

      // the device breathes: the channel carries a little more charge
      const pulse = 0.85 + 0.15 * Math.sin(elapsed * 1.7);
      core.intensity = 1.5 * pulse;
      channelMat.emissiveIntensity = 0.11 * pulse;
      gel.rotation.y = Math.sin(elapsed * 0.12) * 0.04;

      // cations drift down through the gel; some are captured by the sites
      for (let i = 0; i < ION_COUNT; i++) {
        const ion = ions[i];
        if (!ion.captured) {
          ion.y += ion.vy * dt;
          ion.x += Math.sin(elapsed * 0.7 + ion.phase) * dt * 0.5;
          if (ion.y < -0.6) ion.y = 3.2;

          // look for a receptor to stick to
          if (ion.site < 0 && Math.random() < dt * 0.22) {
            for (let r = 0; r < RECEPTORS; r++) {
              const rec = receptors[r];
              if (ion.y > rec.position.y - 1.6 && ion.y < rec.position.y + 1.6 &&
                  Math.abs(ion.x - rec.position.x) < 1.5 &&
                  Math.abs(ion.z - rec.position.z) < 1.5) {
                ion.captured = true;
                ion.site = r;
                break;
              }
            }
          }
        } else {
          const rec = receptors[ion.site];
          ion.x += (rec.position.x - ion.x) * Math.min(1, dt * 2.2);
          ion.y += (rec.position.y - ion.y) * Math.min(1, dt * 2.2);
          ion.z += (rec.position.z - ion.z) * Math.min(1, dt * 2.2);
        }
        dummy.position.set(ion.x, ion.y, ion.z);
        dummy.scale.setScalar(ion.captured ? 0.7 : 1);
        dummy.updateMatrix();
        ionMesh.setMatrixAt(i, dummy.matrix);
      }
      ionMesh.instanceMatrix.needsUpdate = true;

      // the receptors turn slowly, as proteins do
      for (let r = 0; r < RECEPTORS; r++) {
        receptors[r].rotation.z += dt * 0.25;
        receptors[r].rotation.x = Math.PI / 2 + Math.sin(elapsed * 0.5 + r) * 0.3;
      }
    },
  };

  api.setEdgeReveal(0);
  api.setSolidOpacity(0);
  return api;
}
