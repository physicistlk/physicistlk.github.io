import * as THREE from 'three';

/**
 * Builds a 2D circular wafer Shape with a SEMI-standard V-notch at 6 o'clock (-PI/2).
 */
export function makeNotchedWaferShape(radius, segments = 192) {
  const shape = new THREE.Shape();
  const notchHalfAngle = 0.042; // angular half-width of the V-notch
  const notchDepth = radius * 0.048; // depth of the V-notch
  const startAngle = -Math.PI / 2 + notchHalfAngle;
  const endAngle = Math.PI * 1.5 - notchHalfAngle;

  for (let i = 0; i <= segments; i++) {
    const a = THREE.MathUtils.lerp(startAngle, endAngle, i / segments);
    const x = Math.cos(a) * radius;
    const y = Math.sin(a) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  // V-notch apex at bottom (6 o'clock)
  shape.lineTo(0, -(radius - notchDepth));
  shape.closePath();
  return shape;
}

/**
 * ShapeGeometry for a notched silicon wafer with normalized [0..1] UVs
 * matching a square canvas texture centered at (0.5, 0.5).
 */
export function makeNotchedWaferGeometry(radius, segments = 192) {
  const shape = makeNotchedWaferShape(radius, segments);
  const geo = new THREE.ShapeGeometry(shape, 1);
  const pos = geo.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = pos.getX(i) / (2 * radius) + 0.5;
    uv[i * 2 + 1] = pos.getY(i) / (2 * radius) + 0.5;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

/**
 * Glowing rim geometry that follows the notched wafer outline.
 */
export function makeNotchedRimGeometry(innerR, outerR, segments = 192) {
  const outer = makeNotchedWaferShape(outerR, segments);
  const inner = makeNotchedWaferShape(innerR, segments);
  outer.holes.push(inner);
  return new THREE.ShapeGeometry(outer, 1);
}

/**
 * The backdrop behind the device: a 300 mm silicon wafer map with a SEMI V-notch
 * and detailed multi-block chip dies.
 */
export function createWafer({ radius = 64, segments = 192 } = {}) {
  const group = new THREE.Group();
  group.name = 'wafer-backdrop';

  // --- silicon wafer body (with V-notch) ---------------------------------
  const body = new THREE.Mesh(
    makeNotchedWaferGeometry(radius, segments),
    new THREE.MeshStandardMaterial({
      color: 0x090e15,
      metalness: 0.92,
      roughness: 0.34,
      side: THREE.DoubleSide,
      fog: false,
    })
  );
  body.position.z = -0.6;
  group.add(body);

  // --- detailed die map --------------------------------------------------
  const overlay = new THREE.Mesh(
    makeNotchedWaferGeometry(radius * 0.996, segments),
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

  // --- outer notched halo ring -------------------------------------------
  const halo = new THREE.Mesh(
    makeNotchedRimGeometry(radius * 0.975, radius * 1.12, segments),
    new THREE.MeshBasicMaterial({
      color: 0x164e6a,
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
    // keep the wafer calm with subtle tilt so the notch and dies stay legible
    group.rotation.z = p * 0.22;
    group.rotation.x = -0.10 + Math.sin(p * 2.6) * 0.035;
    group.rotation.y = Math.sin(p * 1.8) * 0.04;
  };

  return state;
}

/**
 * Helper: trace the notched wafer perimeter on a 2D canvas.
 * Note: Canvas Y points downward, so 6 o'clock (bottom) is angle = +PI/2.
 */
function traceNotchedWaferPath(g, c, r) {
  const notchHalfAngle = 0.042;
  const notchDepth = r * 0.048;
  const startAngle = Math.PI / 2 + notchHalfAngle;
  const endAngle = Math.PI * 2.5 - notchHalfAngle;
  g.beginPath();
  g.arc(c, c, r, startAngle, endAngle, false);
  g.lineTo(c, c + (r - notchDepth));
  g.closePath();
}

/**
 * A detailed 300 mm silicon wafer map drawn on a 2048x2048 canvas:
 * - SEMI V-notch at 6 o'clock
 * - Edge exclusion ring & crystalline radial sheen
 * - Rich chip dies with bond-pad rings, sensor/OECT arrays, logic buses, and vias
 * - Scribe-lane alignment crosshairs and subtle thin-film iridescence
 */
function makeWaferMapTexture(size = 2048) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const g = cv.getContext('2d');
  const c = size / 2;

  // Deterministic PRNG for crisp, reproducible chip patterns
  let seed = 4202611;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  g.fillStyle = '#000000';
  g.fillRect(0, 0, size, size);

  // --- subtle crystalline silicon radial sheen ---------------------------
  const sheen = g.createRadialGradient(c * 0.85, c * 0.8, c * 0.05, c, c, c);
  sheen.addColorStop(0, 'rgba(56, 189, 248, 0.10)');
  sheen.addColorStop(0.55, 'rgba(30, 80, 120, 0.06)');
  sheen.addColorStop(1, 'rgba(10, 20, 35, 0.0)');
  g.fillStyle = sheen;
  g.fillRect(0, 0, size, size);

  // --- the die array (15x15) ---------------------------------------------
  const die = size * 0.058;
  const lane = size * 0.011;
  const pitch = die + lane;
  const cols = 15;
  const rows = 15;
  const startX = c - (cols * pitch) / 2 + lane / 2;
  const startY = c - (rows * pitch) / 2 + lane / 2;
  const usableR = c * 0.945;

  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const x = startX + col * pitch;
      const y = startY + r * pitch;
      const cx = x + die / 2;
      const cy = y + die / 2;
      const dist = Math.hypot(cx - c, cy - c);
      if (dist > usableR) continue;
      // keep clear of the bottom V-notch zone
      if (cy > c + c * 0.86 && Math.abs(cx - c) < c * 0.1) continue;

      // subtle thin-film interference hue per die (cyan / emerald / violet)
      const angle = Math.atan2(cy - c, cx - c);
      const wave = 0.5 + 0.5 * Math.sin(angle * 2 + dist * 0.008);
      const isEmerald = wave > 0.72;
      const isViolet = wave < 0.24;
      const baseRGB = isEmerald
        ? '52, 211, 153'
        : isViolet
        ? '167, 139, 250'
        : '56, 189, 248';
      const intensity = 0.55 + 0.45 * (1 - dist / usableR);

      // die substrate fill (gives each chip presence)
      g.fillStyle = `rgba(${baseRGB}, ${(0.045 + rnd() * 0.035) * intensity})`;
      g.fillRect(x, y, die, die);

      // outer die seal ring
      g.strokeStyle = `rgba(${baseRGB}, ${(0.28 + rnd() * 0.16) * intensity})`;
      g.lineWidth = 2;
      g.strokeRect(x + 1, y + 1, die - 2, die - 2);

      // perimeter bond pads (top, bottom, left, right)
      const padCount = 5;
      const padSize = Math.max(2.5, die * 0.042);
      const padMargin = die * 0.07;
      g.fillStyle = `rgba(210, 240, 255, ${0.34 * intensity})`;
      for (let p = 0; p < padCount; p++) {
        const t = (p + 0.5) / padCount;
        const px = x + padMargin + t * (die - padMargin * 2) - padSize / 2;
        const py = y + padMargin + t * (die - padMargin * 2) - padSize / 2;
        g.fillRect(px, y + 3.5, padSize, padSize);
        g.fillRect(px, y + die - 3.5 - padSize, padSize, padSize);
        g.fillRect(x + 3.5, py, padSize, padSize);
        g.fillRect(x + die - 3.5 - padSize, py, padSize, padSize);
      }

      // internal chip architecture: 2x2 functional macro blocks
      const padIn = die * 0.14;
      const iw = die - padIn * 2;
      const ih = die - padIn * 2;
      const halfW = iw * 0.46;
      const halfH = ih * 0.46;

      // Top-left macro: interdigitated OECT / sensor array
      g.fillStyle = `rgba(${baseRGB}, ${0.14 * intensity})`;
      g.fillRect(x + padIn, y + padIn, halfW, halfH);
      g.strokeStyle = `rgba(180, 235, 255, ${0.26 * intensity})`;
      g.lineWidth = 1;
      for (let f = 1; f <= 5; f++) {
        const fy = y + padIn + (f / 6) * halfH;
        g.beginPath();
        g.moveTo(x + padIn + 2, fy);
        g.lineTo(x + padIn + halfW - 2, fy);
        g.stroke();
      }

      // Top-right macro: neuromorphic crossbar / SRAM array
      const rx = x + padIn + iw - halfW;
      g.fillStyle = `rgba(${baseRGB}, ${0.11 * intensity})`;
      g.fillRect(rx, y + padIn, halfW, halfH);
      g.strokeStyle = `rgba(${baseRGB}, ${0.28 * intensity})`;
      for (let k = 1; k <= 3; k++) {
        const vx = rx + (k / 4) * halfW;
        const hy = y + padIn + (k / 4) * halfH;
        g.beginPath();
        g.moveTo(vx, y + padIn + 1);
        g.lineTo(vx, y + padIn + halfH - 1);
        g.moveTo(rx + 1, hy);
        g.lineTo(rx + halfW - 1, hy);
        g.stroke();
      }

      // Bottom band: logic & routing bus
      const by = y + padIn + ih - halfH * 0.85;
      g.fillStyle = `rgba(251, 191, 36, ${0.10 * intensity})`;
      g.fillRect(x + padIn, by, iw, halfH * 0.85);
      g.strokeStyle = `rgba(160, 225, 250, ${0.24 * intensity})`;
      g.beginPath();
      g.moveTo(x + padIn, by + halfH * 0.28);
      g.lineTo(x + padIn + iw, by + halfH * 0.28);
      g.moveTo(x + padIn, by + halfH * 0.58);
      g.lineTo(x + padIn + iw, by + halfH * 0.58);
      g.stroke();

      // Central power / clock cross-bus
      g.strokeStyle = `rgba(220, 245, 255, ${0.22 * intensity})`;
      g.lineWidth = 1.4;
      g.beginPath();
      g.moveTo(x + die * 0.5, y + padIn);
      g.lineTo(x + die * 0.5, y + die - padIn);
      g.moveTo(x + padIn, y + die * 0.52);
      g.lineTo(x + die - padIn, y + die * 0.52);
      g.stroke();

      // Highlighted active test die / glowing node
      if (rnd() > 0.78) {
        g.fillStyle = `rgba(210, 248, 255, ${0.42 * intensity})`;
        g.fillRect(x + padIn + 2, y + padIn + 2, halfW * 0.35, halfH * 0.35);
      }
    }
  }

  // --- scribe lanes + alignment crosshairs -------------------------------
  g.strokeStyle = 'rgba(70, 155, 195, 0.10)';
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

  // tiny '+' alignment fiducials at scribe intersections
  g.strokeStyle = 'rgba(150, 230, 255, 0.26)';
  g.lineWidth = 1.2;
  for (let i = 1; i < cols; i += 2) {
    for (let j = 1; j < rows; j += 2) {
      const ix = startX - lane / 2 + i * pitch;
      const iy = startY - lane / 2 + j * pitch;
      if (Math.hypot(ix - c, iy - c) > usableR) continue;
      g.beginPath();
      g.moveTo(ix - 3.5, iy);
      g.lineTo(ix + 3.5, iy);
      g.moveTo(ix, iy - 3.5);
      g.lineTo(ix, iy + 3.5);
      g.stroke();
    }
  }

  // --- edge exclusion ring & bevelled notched rim ------------------------
  g.strokeStyle = 'rgba(100, 195, 235, 0.22)';
  g.lineWidth = 3;
  traceNotchedWaferPath(g, c, c * 0.955);
  g.stroke();

  g.strokeStyle = 'rgba(145, 225, 255, 0.72)';
  g.lineWidth = 6;
  traceNotchedWaferPath(g, c, c * 0.986);
  g.stroke();

  g.strokeStyle = 'rgba(56, 189, 248, 0.24)';
  g.lineWidth = 16;
  traceNotchedWaferPath(g, c, c * 0.968);
  g.stroke();

  // --- clip cleanly to the notched wafer disc ----------------------------
  g.globalCompositeOperation = 'destination-in';
  g.fillStyle = '#ffffff';
  traceNotchedWaferPath(g, c, c * 0.995);
  g.fill();

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}
