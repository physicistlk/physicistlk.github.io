import * as THREE from 'three';
import { BEATS, PROCESS_FLOW } from '../content.js';

/**
 * Scene 2 — the lithography chapter.
 *  - Type cascades in word by word, each word at its own depth so the text
 *    parallaxes against the receding fab tool.
 *  - The tool dissolves into a wireframe and a process-flow diagram lights up.
 */
export function createTheory(domRoot, sceneRoot) {
  // ---------------------------------------------------------------- DOM ---
  const layer = document.createElement('div');
  layer.className = 'theory-layer';
  domRoot.appendChild(layer);

  const beats = BEATS.map((b, bi) => {
    // the anchor carries the screen position; the article inside it carries
    // the depth, so the perspective scales around the block's own centre
    const anchor = document.createElement('div');
    anchor.className = `beat-anchor beat-anchor--${b.side}`;

    const el = document.createElement('article');
    el.className = `beat beat--${b.side}`;
    el.style.setProperty('--depth', `${b.depth}px`);

    const kicker = document.createElement('span');
    kicker.className = 'beat__kicker';
    kicker.textContent = b.kicker;
    el.appendChild(kicker);

    const p = document.createElement('p');
    p.className = 'beat__text';
    const words = [];
    b.words.forEach(([text, kind], wi) => {
      const span = document.createElement('span');
      span.className = `w${kind === 'mono' ? ' w--mono' : ''}`;
      span.textContent = text;
      span.style.setProperty('--wi', String(wi));
      p.appendChild(span);
      words.push(span);
    });
    el.appendChild(p);
    anchor.appendChild(el);
    layer.appendChild(anchor);
    return { def: b, el, anchor, words, index: bi };
  });

  // ------------------------------------------------------- process flow ---
  const flow = new THREE.Group();
  flow.name = 'process-flow';
  flow.visible = false;

  const flowNodes = PROCESS_FLOW.map((step, i) => {
    const g = new THREE.Group();
    const t = PROCESS_FLOW.length > 1 ? i / (PROCESS_FLOW.length - 1) : 0;
    const x = THREE.MathUtils.lerp(-15, 15, t);
    const y = -8.6 + Math.sin(t * Math.PI) * 1.2;
    const z = -9 + Math.cos(t * Math.PI) * 4.0;
    g.position.set(x, y, z);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.62, 0.055, 8, 40),
      new THREE.MeshBasicMaterial({
        color: 0x2b4a5c,
        transparent: true,
        opacity: 0.55,
        toneMapped: false,
      })
    );
    const core = new THREE.Mesh(
      new THREE.CircleGeometry(0.24, 24),
      new THREE.MeshBasicMaterial({
        color: 0x8fe9ff,
        transparent: true,
        opacity: 0.0,
        toneMapped: false,
      })
    );
    core.position.z = 0.02;

    const label = makeLabelSprite(step.label, step.detail);
    label.position.set(0, -1.5, 0);

    g.add(ring, core, label);
    flow.add(g);
    return { group: g, ring, core, label, step };
  });

  // connector rail between the nodes
  const railPts = flowNodes.map((n) => n.group.position.clone());
  const railGeo = new THREE.BufferGeometry().setFromPoints(railPts);
  const rail = new THREE.Line(
    railGeo,
    new THREE.LineBasicMaterial({
      color: 0x2f6a85,
      transparent: true,
      opacity: 0,
      toneMapped: false,
    })
  );
  flow.add(rail);
  sceneRoot.add(flow);

  // ------------------------------------------------------------- update ---
  const state = {
    layer,
    flow,
    /** the cinema takes over the screen — the chapter text steps aside */
    setHidden(hidden) {
      layer.style.opacity = hidden ? '0' : '1';
      layer.style.transition = 'opacity 0.55s ease';
    },
    /** 0..1 how far the flow diagram has advanced */
    activeIndex: 0,
    update(p) {
      // ---- words -------------------------------------------------------
      for (const beat of beats) {
        const { def, el, words } = beat;
        const local = (p - def.start) / def.dur;
        const alive = local > -0.02 && local < 1.55;

        if (!alive) {
          if (el.style.opacity !== '0') {
            el.style.opacity = '0';
            el.style.visibility = 'hidden';
          }
          continue;
        }
        el.style.visibility = 'visible';

        // the paragraph itself drifts with parallax depth
        const depth = def.depth;
        const drift = THREE.MathUtils.clamp(local, -0.4, 1.6);
        // rise, hold, then dissolve before the next beat takes the stage
        const rise = THREE.MathUtils.clamp(local * 7 + 0.15, 0, 1);
        const fall = 1 - THREE.MathUtils.clamp((local - 0.92) / 0.5, 0, 1);
        el.style.opacity = String(rise * fall);
        el.style.setProperty(
          '--shiftY',
          `${THREE.MathUtils.lerp(40, -14, THREE.MathUtils.clamp(local, 0, 1))}px`
        );
        el.style.setProperty('--depth', `${depth}px`);

        const per = 1 / Math.max(words.length, 1);
        for (let i = 0; i < words.length; i++) {
          const w = words[i];
          const start = i * per * 0.62;
          const t = THREE.MathUtils.clamp((local - start) / 0.3, 0, 1);
          const e = 1 - Math.pow(1 - t, 3);
          w.style.opacity = String(e);
          w.style.transform = `translate3d(0, ${(1 - e) * 22}px, ${(1 - e) * 40}px)`;
          w.style.textShadow = `0 0 ${(1 - e) * 14}px rgba(244,247,250,${(1 - e) * 0.55})`;
        }
      }

      // ---- process flow ------------------------------------------------
      // the flow fades up as the tool dissolves, and advances with the text
      const flowIn = THREE.MathUtils.smoothstep(p, 0.30, 0.345);
      const flowOut = 1 - THREE.MathUtils.smoothstep(p, 0.535, 0.575);
      flow.visible = flowIn * flowOut > 0.01;
      flow.material?.opacity;
      rail.material.opacity = 0.5 * flowIn * flowOut;

      const advance = THREE.MathUtils.clamp((p - 0.30) / 0.045, 0, PROCESS_FLOW.length - 0.001);
      state.activeIndex = advance;
      for (let i = 0; i < flowNodes.length; i++) {
        const n = flowNodes[i];
        const d = Math.abs(i - advance);
        const near = THREE.MathUtils.clamp(1 - d, 0, 1);
        n.core.material.opacity = near * 0.95 * flowIn * flowOut;
        n.ring.material.opacity = (0.32 + near * 0.6) * flowIn * flowOut;
        n.ring.material.color.setHex(near > 0.5 ? 0x9fe9ff : 0x2b4a5c);
        n.label.material.opacity = (0.22 + near * 0.6) * flowIn * flowOut;
        n.group.scale.setScalar(1 + near * 0.22);
      }
    },
  };

  return state;
}

/** Small canvas sprite used for the process-step labels. */
function makeLabelSprite(title, detail) {
  const cv = document.createElement('canvas');
  const w = 512;
  const h = 128;
  cv.width = w;
  cv.height = h;
  const g = cv.getContext('2d');
  g.clearRect(0, 0, w, h);
  g.textAlign = 'center';
  g.fillStyle = '#dff4ff';
  g.font = '600 44px "JetBrains Mono", ui-monospace, monospace';
  g.fillText(title, w / 2, 52);
  g.fillStyle = 'rgba(150,205,230,0.75)';
  g.font = '400 26px "JetBrains Mono", ui-monospace, monospace';
  g.fillText(detail, w / 2, 92);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(4.4, 1.1, 1);
  sprite.renderOrder = 5;
  return sprite;
}
