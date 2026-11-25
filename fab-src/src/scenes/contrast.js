import * as THREE from 'three';

/**
 * Live contrast sampling.
 *
 * The tunnel is rendered into a small off-screen target; the luminance of
 * every cell is read back and drives a dot-and-line field that reacts to the
 * bright and dark regions of the footage (plasma glow, wafer reflections).
 */
export class ContrastField {
  constructor({ width = 160, height = 90, camera, distance = 1.6 } = {}) {
    this.width = width;
    this.height = height;
    this.camera = camera;
    this.distance = distance;

    this.rt = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: true,
    });
    this.pixels = new Uint8Array(width * height * 4);
    this.luma = new Float32Array(width * height);
    this.smooth = new Float32Array(width * height);

    // subsample the grid for the dot field
    this.step = 2;
    this.gw = Math.floor(width / this.step);
    this.gh = Math.floor(height / this.step);
    this.dots = this.gw * this.gh;

    const positions = new Float32Array(this.dots * 3);
    const bright = new Float32Array(this.dots);
    this.sizes = new Float32Array(this.dots);
    const grid = new Int32Array(this.dots * 2);

    let p = 0;
    for (let j = 0; j < this.gh; j++) {
      for (let i = 0; i < this.gw; i++) {
        grid[p * 2] = i * this.step;
        grid[p * 2 + 1] = j * this.step;
        p++;
      }
    }
    this.grid = grid;

    // deterministic jitter so the field looks scattered, not scanned
    const jitter = new Float32Array(this.dots * 2);
    let seed = 1337;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296 - 0.5;
    };
    for (let i = 0; i < this.dots * 2; i++) jitter[i] = rand() * this.step * 0.9;
    this.jitter = jitter;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aBright', new THREE.BufferAttribute(bright, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));

    this.pointMat = new THREE.ShaderMaterial({
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uPixelScale: { value: 600 },
        uOpacity: { value: 1 },
      },
      vertexShader: /* glsl */ `
        attribute float aBright;
        attribute float aSize;
        uniform float uPixelScale;
        varying float vBright;
        void main() {
          vBright = aBright;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uPixelScale * (0.45 + aBright * 0.9);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uOpacity;
        varying float vBright;
        void main() {
          vec2 d = gl_PointCoord - 0.5;
          float m = smoothstep(0.5, 0.05, length(d));
          vec3 cool = vec3(0.12, 0.45, 0.85);
          vec3 hot  = vec3(0.85, 0.97, 1.0);
          vec3 col = mix(cool, hot, pow(vBright, 0.75));
          gl_FragColor = vec4(col, m * uOpacity * (0.05 + vBright * 0.4));
        }
      `,
    });
    this.points = new THREE.Points(geo, this.pointMat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 900;

    // connecting lines between neighbouring samples
    const pairs = [];
    for (let j = 0; j < this.gh; j++) {
      for (let i = 0; i < this.gw; i++) {
        const a = j * this.gw + i;
        if (i + 1 < this.gw) pairs.push(a, a + 1);
        if (j + 1 < this.gh) pairs.push(a, a + this.gw);
      }
    }
    this.pairCount = pairs.length / 2;

    const linePos = new Float32Array(pairs.length * 3);
    const lineAlpha = new Float32Array(pairs.length);
    const lgeo = new THREE.BufferGeometry();
    lgeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
    lgeo.setAttribute('aAlpha', new THREE.BufferAttribute(lineAlpha, 1));

    this.lineMat = new THREE.ShaderMaterial({
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uOpacity: { value: 1 } },
      vertexShader: /* glsl */ `
        attribute float aAlpha;
        varying float vAlpha;
        void main() {
          vAlpha = aAlpha;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uOpacity;
        varying float vAlpha;
        void main() {
          gl_FragColor = vec4(vec3(0.45, 0.78, 1.0), vAlpha * uOpacity * 0.32);
        }
      `,
    });
    this.lines = new THREE.LineSegments(lgeo, this.lineMat);
    this.lines.frustumCulled = false;
    this.lines.renderOrder = 899;

    this.group = new THREE.Group();
    this.group.name = 'contrast-field';
    this.group.add(this.points, this.lines);
    this.group.visible = false;

    this.pairs = pairs;
    this.layout();
  }

  /** Position the dot field on the camera's near frustum plane. */
  layout() {
    const cam = this.camera;
    const halfH = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) * this.distance;
    const halfW = halfH * cam.aspect;
    const pos = this.points.geometry.attributes.position.array;
    // a fixed jitter per sample keeps the field from reading as a halftone grid
    for (let i = 0; i < this.dots; i++) {
      const gx = this.grid[i * 2];
      const gy = this.grid[i * 2 + 1];
      const u = (gx + this.jitter[i * 2]) / (this.width - 1);
      const v = (gy + this.jitter[i * 2 + 1]) / (this.height - 1);
      pos[i * 3] = (u * 2 - 1) * halfW;
      pos[i * 3 + 1] = (1 - v * 2) * halfH;
      pos[i * 3 + 2] = -this.distance;
    }
    this.points.geometry.attributes.position.needsUpdate = true;

    const lpos = this.lines.geometry.attributes.position.array;
    for (let i = 0; i < this.pairs.length; i++) {
      const src = this.pairs[i] * 3;
      lpos[i * 3] = pos[src];
      lpos[i * 3 + 1] = pos[src + 1];
      lpos[i * 3 + 2] = pos[src + 2];
    }
    this.lines.geometry.attributes.position.needsUpdate = true;
  }

  /**
   * Render `scene` into the sample target and read its luminance back.
   * @param {THREE.WebGLRenderer} renderer
   * @param {THREE.Scene} scene
   * @param {THREE.Camera} camera
   * @param {THREE.Object3D[]} hide objects excluded from the sample
   */
  sample(renderer, scene, camera, hide = []) {
    const prevVis = hide.map((o) => o.visible);
    hide.forEach((o) => (o.visible = false));

    const prevTarget = renderer.getRenderTarget();
    renderer.setRenderTarget(this.rt);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(prevTarget);

    hide.forEach((o, i) => (o.visible = prevVis[i]));

    renderer.readRenderTargetPixels(this.rt, 0, 0, this.width, this.height, this.pixels);

    const { width, height, luma, smooth, pixels } = this;
    for (let i = 0; i < width * height; i++) {
      const o = i * 4;
      luma[i] =
        (0.2126 * pixels[o] + 0.7152 * pixels[o + 1] + 0.0722 * pixels[o + 2]) / 255;
    }
    // 3x3 blur so the dot field responds to regions, not single pixels
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= height) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            if (xx < 0 || xx >= width) continue;
            sum += luma[yy * width + xx];
            n++;
          }
        }
        smooth[y * width + x] = sum / n;
      }
    }
    this.apply();
  }

  /** Push the luminance grid into the dot / line attributes. */
  apply() {
    const { width, height, smooth, step, gw } = this;
    const bright = this.points.geometry.attributes.aBright.array;
    const sizes = this.points.geometry.attributes.aSize.array;
    const lineAlpha = this.lines.geometry.attributes.aAlpha.array;

    for (let i = 0; i < this.dots; i++) {
      const gx = this.grid[i * 2];
      const gy = this.grid[i * 2 + 1];
      const v = smooth[gy * width + gx];
      // gamma boost: keep the field quiet in the blacks, alive in the highlights
      // capped below the bloom threshold so the field never blooms into a haze
      const b = Math.min(0.5, Math.pow(Math.min(1, v * 1.2), 2.2));
      bright[i] = b;
      // world-space radius — the shader converts it to pixels
      sizes[i] = 0.0022 + b * 0.0042;
    }
    this.points.geometry.attributes.aBright.needsUpdate = true;
    this.points.geometry.attributes.aSize.needsUpdate = true;

    for (let i = 0; i < this.pairCount; i++) {
      const a = this.pairs[i * 2];
      const bIdx = this.pairs[i * 2 + 1];
      const m = Math.min(bright[a], bright[bIdx]);
      lineAlpha[i * 2] = m;
      lineAlpha[i * 2 + 1] = m;
    }
    this.lines.geometry.attributes.aAlpha.needsUpdate = true;
  }

  setOpacity(v) {
    this.pointMat.uniforms.uOpacity.value = v;
    this.lineMat.uniforms.uOpacity.value = v;
    this.group.visible = v > 0.01;
  }

  /** Keep dot size physically constant across resolutions. */
  setPixelScale(renderer) {
    const halfH = Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2) * this.distance;
    const px = renderer.domElement.height / (2 * halfH);
    this.pointMat.uniforms.uPixelScale.value = px;
  }

  dispose() {
    this.rt.dispose();
    this.points.geometry.dispose();
    this.points.material.dispose();
    this.lines.geometry.dispose();
    this.lines.material.dispose();
  }
}
