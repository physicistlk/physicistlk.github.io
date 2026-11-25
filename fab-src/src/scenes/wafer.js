import * as THREE from 'three';

/**
 * The backdrop behind the device: a silicon wafer map.
 *
 * A 300 mm wafer seen face-on — a grid of dies with scribe lanes, fine
 * interconnect inside each one, the polished rim and the orientation flat.
 * It is the substrate the devices are grown on, which is where the work
 * actually starts, so it replaces what used to be a star field.
 */
export function createWafer({ radius = 64, segments = 192 } = {}) {
  const group = new THREE.Group();
  group.name = 'wafer-backdrop';

  // --- wafer body -------------------------------------------------------
  const body = new THREE.Mesh(
    new THREE.CircleGeometry(radius, segments),
    new THREE.MeshStandardMaterial({
      color: 0x080c11,
      metalness: 0.9,
      roughness: 0.42,
      side: THREE.DoubleSide,
      fog: false,
    })
  );
  body.position.z = -0.6;
  group.add(body);

  // --- the die map ------------------------------------------------------
  const overlay = new THREE.Mesh(
    new THREE.CircleGeometry(radius * 0.995, segments),
    new THREE.MeshBasicMaterial({
      map: makeWaferMapTexture(),
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
    halo.material.opacity = 0.28 * grow;
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
 * A silicon wafer map drawn on a 2D canvas: a grid of dies with scribe
 * lanes, interconnect inside each die, the polished rim and the flat.
 */
function makeWaferMapTexture(size = 2048) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const g = cv.getContext('2d');
  const c = size / 2;

  g.fillStyle = '#000000';
  g.fillRect(0, 0, size, size);

  // --- the die array -----------------------------------------------------
  const die = size * 0.072;
  const lane = size * 0.016;
  const pitch = die + lane;
  const cols = 13;
  const rows = 13;
  const startX = c - (cols * pitch) / 2 + lane / 2;
  const startY = c - (rows * pitch) / 2 + lane / 2;

  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const x = startX + col * pitch;
      const y = startY + r * pitch;
      // dies only exist inside the wafer circle
      const cx = x + die / 2;
      const cy = y + die / 2;
      const edge = Math.hypot(cx - c, cy - c);
      if (edge > c * 0.93) continue;

      // die outline
      g.strokeStyle = `rgba(120,205,235,${0.16 + Math.random() * 0.12})`;
      g.lineWidth = 2;
      g.strokeRect(x, y, die, die);

      // interconnect inside the die
      g.strokeStyle = 'rgba(90,190,225,0.13)';
      g.lineWidth = 1;
      for (let k = 1; k < 6; k++) {
        const yy = y + (k * die) / 6;
        g.beginPath();
        g.moveTo(x + 3, yy);
        g.lineTo(x + die - 3, yy);
        g.stroke();
      }
      for (let k = 0; k < 3; k++) {
        const xx = x + die * (0.22 + 0.28 * k);
        g.beginPath();
        g.moveTo(xx, y + die * 0.2);
        g.lineTo(xx, y + die * 0.82);
        g.stroke();
      }
      // a lit pad at one corner
      if (Math.random() > 0.7) {
        g.fillStyle = 'rgba(150,235,255,0.3)';
        g.fillRect(x + die - lane * 0.9, y + lane * 0.5, lane * 0.6, lane * 0.6);
      }
    }
  }

  // --- scribe lanes catching the light ----------------------------------
  g.strokeStyle = 'rgba(70,150,185,0.07)';
  g.lineWidth = 1;
  for (let i = 0; i <= cols; i++) {
    const x = startX - lane / 2 + i * pitch;
    g.beginPath();
    g.moveTo(x, startY - pitch);
    g.lineTo(x, startY + rows * pitch);
    g.stroke();
  }
  for (let i = 0; i <= rows; i++) {
    const y = startY - lane / 2 + i * pitch;
    g.beginPath();
    g.moveTo(startX - pitch, y);
    g.lineTo(startX + cols * pitch, y);
    g.stroke();
  }

  // --- the orientation flat ---------------------------------------------
  g.globalCompositeOperation = 'lighter';
  g.fillStyle = '#000000';
  g.fillRect(0, c - lane * 1.6, size, lane * 3.2);
  g.strokeStyle = 'rgba(150,225,255,0.35)';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(0, c - lane * 1.6);
  g.lineTo(c, c - lane * 1.6);
  g.moveTo(0, c + lane * 1.6);
  g.lineTo(c, c + lane * 1.6);
  g.stroke();

  // --- polished rim ------------------------------------------------------
  g.strokeStyle = 'rgba(130,215,245,0.6)';
  g.lineWidth = 5;
  g.beginPath();
  g.arc(c, c, c * 0.985, 0, Math.PI * 2);
  g.stroke();
  g.strokeStyle = 'rgba(90,175,215,0.18)';
  g.lineWidth = 14;
  g.beginPath();
  g.arc(c, c, c * 0.96, 0, Math.PI * 2);
  g.stroke();

  // --- clip to the wafer disc --------------------------------------------
  g.globalCompositeOperation = 'destination-in';
  g.fillStyle = '#fff';
  g.beginPath();
  g.arc(c, c, c * 0.995, 0, Math.PI * 2);
  g.fill();

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}
