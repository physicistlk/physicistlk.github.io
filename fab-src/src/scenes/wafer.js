import * as THREE from 'three';

/**
 * The "massive glowing wafer silhouette / diffraction pattern disk" that sits
 * behind the fab tool. Two layers:
 *  - a cold metallic wafer body (reads as a 300 mm silicon disc)
 *  - an additive diffraction overlay: rings, radial spokes, die grid, traces
 */
export function createWafer({ radius = 64, segments = 192 } = {}) {
  const group = new THREE.Group();
  group.name = 'wafer-backdrop';

  // --- wafer body -------------------------------------------------------
  const body = new THREE.Mesh(
    new THREE.CircleGeometry(radius, segments),
    new THREE.MeshStandardMaterial({
      color: 0x0a0d12,
      metalness: 0.95,
      roughness: 0.38,
      side: THREE.DoubleSide,
      fog: false,
    })
  );
  body.position.z = -0.6;
  group.add(body);

  // --- diffraction overlay ---------------------------------------------
  const overlay = new THREE.Mesh(
    new THREE.CircleGeometry(radius * 0.995, segments),
    new THREE.MeshBasicMaterial({
      map: makeDiffractionTexture(),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0,
      toneMapped: false,
      fog: false,
    })
  );
  overlay.position.z = -0.5;
  group.add(overlay);

  // --- outer halo ring --------------------------------------------------
  const halo = new THREE.Mesh(
    new THREE.RingGeometry(radius * 0.97, radius * 1.16, segments),
    new THREE.MeshBasicMaterial({
      color: 0x0d3a52,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
      fog: false,
    })
  );
  halo.position.z = -0.7;
  group.add(halo);

  const state = { overlay, body, halo, group };

  /**
   * @param {number} p      global scroll progress
   * @param {number} reveal 0..1 overall visibility of the wafer
   */
  state.update = (p, reveal) => {
    const grow = THREE.MathUtils.smoothstep(reveal, 0, 1);
    overlay.material.opacity = 1.0 * grow;
    halo.material.opacity = 0.35 * grow;
    body.material.opacity = 1;
    // the wafer drifts and tilts as the narrative descends
    group.rotation.z = p * 0.5;
    group.rotation.x = -0.12 + Math.sin(p * 3.1) * 0.04;
    group.rotation.y = Math.sin(p * 2.2) * 0.05;
    // the app places the wafer relative to the camera each frame
  };

  return state;
}

/**
 * Procedural wafer diffraction pattern drawn on a 2D canvas:
 * concentric interference rings + radial spokes + a ring of dies + circuit traces.
 */
function makeDiffractionTexture(size = 2048) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const g = cv.getContext('2d');
  const c = size / 2;

  g.fillStyle = '#000000';
  g.fillRect(0, 0, size, size);

  // --- concentric interference rings ------------------------------------
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 46; i++) {
    const r = (i / 46) * c * 0.97 + 6;
    const a = 0.16 + 0.42 * Math.pow(1 - i / 46, 1.4);
    const grd = g.createRadialGradient(c, c, Math.max(0, r - 14), c, c, r + 14);
    grd.addColorStop(0, 'rgba(0,0,0,0)');
    grd.addColorStop(0.5, `rgba(150,225,255,${a})`);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.beginPath();
    g.arc(c, c, r + 14, 0, Math.PI * 2);
    g.fill();
  }

  // --- radial spokes (diffraction blades) --------------------------------
  const spokes = 96;
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2;
    const len = c * (0.28 + 0.7 * Math.abs(Math.sin(i * 2.399)));
    const alpha = 0.1 + 0.16 * Math.random();
    g.strokeStyle = `rgba(120,215,255,${alpha})`;
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(c + Math.cos(a) * c * 0.1, c + Math.sin(a) * c * 0.1);
    g.lineTo(c + Math.cos(a) * len, c + Math.sin(a) * len);
    g.stroke();
  }

  // --- die grid ring -----------------------------------------------------
  const dieCount = 46;
  for (let i = 0; i < dieCount; i++) {
    const a = (i / dieCount) * Math.PI * 2;
    const rr = c * 0.66;
    const x = c + Math.cos(a) * rr;
    const y = c + Math.sin(a) * rr;
    const w = c * 0.075;
    const h = c * 0.045;
    g.save();
    g.translate(x, y);
    g.rotate(a + Math.PI / 2);
    g.strokeStyle = `rgba(160,235,255,${0.22 + 0.18 * Math.random()})`;
    g.lineWidth = 2;
    g.strokeRect(-w / 2, -h / 2, w, h);
    // die circuitry
    g.strokeStyle = 'rgba(120,225,255,0.2)';
    g.lineWidth = 1;
    for (let k = 0; k < 4; k++) {
      const yy = -h / 2 + ((k + 1) * h) / 5;
      g.beginPath();
      g.moveTo(-w / 2 + 4, yy);
      g.lineTo(w / 2 - 4, yy);
      g.stroke();
    }
    g.restore();
  }

  // --- radial circuit traces from the centre -----------------------------
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2 + Math.random() * 0.08;
    g.strokeStyle = `rgba(90,210,255,${0.13 + 0.14 * Math.random()})`;
    g.lineWidth = 1 + Math.random() * 2;
    g.beginPath();
    let r = c * 0.12;
    let ang = a;
    g.moveTo(c + Math.cos(ang) * r, c + Math.sin(ang) * r);
    while (r < c * 0.94) {
      r += c * (0.03 + Math.random() * 0.05);
      ang += (Math.random() - 0.5) * 0.22;
      g.lineTo(c + Math.cos(ang) * r, c + Math.sin(ang) * r);
    }
    g.stroke();
  }

  // --- bright core (the illuminated centre) ------------------------------
  const core = g.createRadialGradient(c, c, 0, c, c, c * 0.34);
  core.addColorStop(0, 'rgba(150,210,245,0.07)');
  core.addColorStop(0.28, 'rgba(70,155,215,0.05)');
  core.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = core;
  g.beginPath();
  g.arc(c, c, c * 0.3, 0, Math.PI * 2);
  g.fill();

  // --- clip to the wafer disc --------------------------------------------
  // destination-in keeps what has been drawn inside the circle and erases
  // the corners of the square canvas
  g.globalCompositeOperation = 'destination-in';
  g.fillStyle = '#fff';
  g.beginPath();
  g.arc(c, c, c * 0.995, 0, Math.PI * 2);
  g.fill();

  // --- polished rim -------------------------------------------------------
  g.globalCompositeOperation = 'lighter';
  g.strokeStyle = 'rgba(140,225,255,0.7)';
  g.lineWidth = 5;
  g.beginPath();
  g.arc(c, c, c * 0.985, 0, Math.PI * 2);
  g.stroke();

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}
