import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

/**
 * "Space Station 4" (re1monsen, CC BY 4.0) reinterpreted as a circular
 * cleanroom cluster tool: a central transfer module ringed by process
 * chambers, with load-lock pods and service ports.
 *
 * Everything below — materials, lighting, indicator lamps, edge geometry and
 * the reveal choreography — is original work for this site.
 */

const SILVER = 0xdfe4ea;
const LAMP_COOL = 0x7fe9ff;
const LAMP_WARM = 0xffb46b;

/**
 * The model travels through the repository as base64 text, so it is fetched,
 * reassembled and parsed in memory.
 */
async function loadModelBytes(base) {
  const manifestRes = await fetch(`${base}model/manifest.json`);
  if (!manifestRes.ok) throw new Error('model manifest missing');
  const manifest = await manifestRes.json();

  const parts = await Promise.all(
    manifest.parts.map(async (name) => {
      const r = await fetch(`${base}model/${name}`);
      if (!r.ok) throw new Error(`model part ${name} missing`);
      return r.text();
    })
  );

  const b64 = parts.join('').replace(/\s+/g, '');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

  if (manifest.bytes && bytes.length !== manifest.bytes) {
    console.warn('[cascade] model size mismatch', bytes.length, manifest.bytes);
  }
  return bytes.buffer;
}

export async function loadFabTool(base = import.meta.env.BASE_URL) {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);

  const buffer = await loadModelBytes(base);
  const gltf = await loader.parseAsync(buffer, '');
  const root = gltf.scene;

  // --- normalise scale + placement ---------------------------------------
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const centre = box.getCenter(new THREE.Vector3());
  const scale = 26 / Math.max(size.x, size.y, size.z);
  root.scale.setScalar(scale);
  root.position.set(-centre.x * scale, -centre.y * scale, -centre.z * scale);
  root.updateMatrixWorld(true);

  const group = new THREE.Group();
  group.name = 'fab-tool';
  group.add(root);

  // --- re-material --------------------------------------------------------
  const solidMeshes = [];
  const emissiveMeshes = [];
  const edgeSources = [];

  root.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = false;
    o.receiveShadow = false;
    const src = o.material;
    const name = (src?.name || '').toLowerCase();

    // only the dedicated lamp material is unlit — three defaults
    // emissiveIntensity to 1, so intensity alone cannot identify it
    if (name === 'emission') {
      // the station's lit core: shaded metal that glows, not a flat white slab
      const m = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0x2a4a5a),
        metalness: 0.55,
        roughness: 0.34,
        emissive: new THREE.Color(0x3fb9d8),
        emissiveIntensity: 0.55,
        envMapIntensity: 0.9,
        transparent: true,
        opacity: 1,
      });
      o.material = m;
      emissiveMeshes.push(o);
      return;
    }

    const map = src?.map || null;
    const m = new THREE.MeshStandardMaterial({
      map,
      normalMap: src?.normalMap || null,
      // re-authored as brushed steel for the cleanroom reinterpretation
      roughnessMap: src?.roughnessMap || null,
      color: new THREE.Color(SILVER),
      metalness: 0.78,
      roughness: 0.5,
      envMapIntensity: 1.1,
      transparent: true,
      opacity: 1,
      flatShading: false,
    });
    if (m.normalMap) m.normalScale.set(0.6, 0.6);
    // lit windows: keep the model's own emissive map, but at a restrained level
    if (src?.emissiveMap) {
      m.emissive = new THREE.Color(0xbfe9ff);
      m.emissiveMap = src.emissiveMap;
      m.emissiveIntensity = 0.32;
    }
    o.material = m;
    solidMeshes.push(o);
    edgeSources.push(o);
  });

  // --- wireframe reveal: edges that draw themselves in --------------------
  const edgeGroup = new THREE.Group();
  edgeGroup.name = 'fab-edges';
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

  // the edge holder lives inside the model root so the traced geometry keeps
  // exactly the transform of the mesh it belongs to
  root.updateMatrixWorld(true);
  const rootInverse = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const localMatrix = new THREE.Matrix4();

  for (const mesh of edgeSources) {
    const geo = new THREE.EdgesGeometry(mesh.geometry, 44);
    const pos = geo.attributes.position;
    const count = pos.count;
    const offs = new Float32Array(count);
    const v = new THREE.Vector3();
    const world = new THREE.Vector3();
    // sweep axis: normalised height + angle around the vertical axis
    const bb = new THREE.Box3().setFromBufferAttribute(pos);
    const h = Math.max(1e-4, bb.max.y - bb.min.y);
    for (let i = 0; i < count; i++) {
      v.fromBufferAttribute(pos, i);
      world.copy(v).applyMatrix4(mesh.matrixWorld);
      const normH = 1 - (world.y - bb.min.y) / h;
      const ang = (Math.atan2(world.z, world.x) + Math.PI) / (Math.PI * 2);
      offs[i] = THREE.MathUtils.clamp(0.55 * ang + 0.45 * normH, 0, 1);
    }
    geo.setAttribute('aOffset', new THREE.BufferAttribute(offs, 1));
    const lines = new THREE.LineSegments(geo, edgeMat);
    lines.name = `edges:${mesh.name}`;
    lines.frustumCulled = false;
    // transform of the mesh expressed in the edge holder's space
    localMatrix.multiplyMatrices(rootInverse, mesh.matrixWorld);
    localMatrix.decompose(lines.position, lines.quaternion, lines.scale);
    edgeGroup.add(lines);
  }
  root.add(edgeGroup);

  // --- status lamps: a ring of indicator lights under the tool ------------
  const lamps = makeStatusLamps();
  group.add(lamps.group);

  // --- lighting -----------------------------------------------------------
  const key = new THREE.DirectionalLight(0xe6f0ff, 2.6);
  key.position.set(9, 14, 10);
  const rim = new THREE.DirectionalLight(0x74d9ff, 1.9);
  rim.position.set(-12, 5, -10);
  const fill = new THREE.HemisphereLight(0x3a5468, 0x0c1118, 1.15);
  const core = new THREE.PointLight(0x6fd8ff, 9, 46, 2);
  core.position.set(0, 0, 0);
  group.add(key, rim, fill, core);

  const api = {
    group,
    root,
    edgeGroup,
    edgeMat,
    lamps,
    materials: solidMeshes.map((m) => m.material),
    emissiveMaterials: emissiveMeshes.map((m) => m.material),
    coreLight: core,

    /** Solid panels fade / materialise. */
    setSolidOpacity(v) {
      const on = v > 0.999;
      for (const m of api.materials) {
        m.opacity = v;
        m.transparent = !on;
        m.depthWrite = on;
      }
      for (const m of api.emissiveMaterials) {
        m.opacity = Math.min(1, v * 1.35);
      }
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
      lamps.update(elapsed);
      // the tool breathes: a slow pulse through the chamber lamps
      const pulse = 0.85 + 0.15 * Math.sin(elapsed * 1.7);
      core.intensity = 9 * pulse;
    },
  };

  api.setEdgeReveal(0);
  api.setSolidOpacity(0);
  return api;
}

/** Ring of blinking indicator lamps — the cleanroom "chamber status" lights. */
function makeStatusLamps(count = 28, radius = 11.4) {
  const group = new THREE.Group();
  group.name = 'status-lamps';

  const geo = new THREE.SphereGeometry(0.16, 10, 8);
  const mat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(LAMP_COOL),
    toneMapped: false,
    transparent: true,
    opacity: 0.95,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const dummy = new THREE.Object3D();
  const phases = [];
  const spots = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const spot = new THREE.Vector3(
      Math.cos(a) * radius,
      -1.35 + Math.sin(i * 1.7) * 0.35,
      Math.sin(a) * radius
    );
    dummy.position.copy(spot);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    phases.push(Math.random() * Math.PI * 2);
    spots.push(spot);
  }
  mesh.instanceMatrix.needsUpdate = true;
  group.add(mesh);

  const api = {
    group,
    mesh,
    update(elapsed) {
      for (let i = 0; i < count; i++) {
        const s = 0.65 + 0.5 * (0.5 + 0.5 * Math.sin(elapsed * 2.4 + phases[i]));
        dummy.position.copy(spots[i]);
        dummy.scale.setScalar(s);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      const t = 0.5 + 0.5 * Math.sin(elapsed * 1.1);
      mat.color.setHex(LAMP_COOL).lerp(new THREE.Color(LAMP_WARM), 0.25 + 0.35 * t);
    },
  };
  return api;
}
