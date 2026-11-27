import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

import { ScrollController } from './scroll.js';
import { createEnvironment } from './environment.js';
import { Pointer } from './pointer.js';
import { createWafer } from '../scenes/wafer.js';
import { createDevice } from '../scenes/device.js';
import { createTheory } from '../scenes/theory.js';
import { createLithography } from '../scenes/lithography.js';
import { createEndLinks } from '../scenes/endlinks.js';
import { TITLE_CARD, SECTION_LABELS } from '../content.js';

/** Camera choreography: calm, continuous scroll-driven path across the narrative. */
const CAM_KEYS = [
  { p: 0.000, pos: [0, 2.0, 31], look: [0, 0.8, 0] },
  { p: 0.060, pos: [0, 1.1, 20], look: [0, 0.2, 0] },
  { p: 0.130, pos: [5.5, 2.4, 16], look: [0, 0.3, 0] },
  { p: 0.230, pos: [8.6, 3.6, 17], look: [0, 0.1, 0] },
  { p: 0.310, pos: [11.5, 4.8, 16.5], look: [-2.4, 1.0, 0] },
  { p: 0.420, pos: [14.0, 6.0, 16.0], look: [-3.2, 1.3, 0] },
  { p: 0.500, pos: [12.0, 5.0, 18.0], look: [-1.8, 0.8, 0] },
  // UV lithography & chip formation: calm frontal framing of the notched wafer
  { p: 0.560, pos: [2.2, 1.6, 25.0], look: [0, 0, 0] },
  { p: 0.630, pos: [0.0, 1.0, 21.5], look: [0, 0, 0] },
  { p: 0.700, pos: [-2.0, 1.4, 24.5], look: [0, 0, 0] },
  // Epilogue pullback
  { p: 0.780, pos: [22, 12, 48], look: [0, 0.4, 0] },
  { p: 0.900, pos: [48, 27, 86], look: [0, 0.4, 0] },
  { p: 1.000, pos: [74, 42, 150], look: [0, 0.4, 0] },
];

export class Narrative {
  constructor() {
    this.canvas = document.getElementById('stage');
    this.overlay = document.getElementById('overlay');
    this.stage = this.canvas;
    this.elapsed = 0;
    this.loadedAt = performance.now();
    this.inertia = { yaw: 0, pitch: 0 };

    this._initRenderer();
    this._initScene();
    this._initDom();

    this.scroll = new ScrollController();
    this.pointer = new Pointer(window);

    this._onResize = this._onResize.bind(this);
    window.addEventListener('resize', this._onResize);
    this._onResize();
    this._initLab();

    this.clock = new THREE.Clock();
    this._raf = requestAnimationFrame(this._loop.bind(this));
  }

  // ------------------------------------------------------------ setup ----
  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setClearColor(0x090b10, 1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x090b10);
    this.scene.fog = new THREE.FogExp2(0x090b10, 0.0085);

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 900);
    this.camera.position.set(0, 2.4, 44);
    this.scene.add(this.camera);

    // procedural cleanroom IBL — gives the metal something to reflect
    this.scene.environment = createEnvironment(this.renderer);
    this.scene.environmentIntensity = 1.35;

    // ambient so the metal never reads as pure black
    this.scene.add(new THREE.AmbientLight(0x33465c, 1.1));

    // the notched silicon wafer backdrop anchored to the camera
    this.wafer = createWafer({ radius: 60 });
    this.wafer.group.position.set(-16, -5, -150);
    this.camera.add(this.wafer.group);

    this.theory = createTheory(this.overlay, this.scene);
    this.endLinks = createEndLinks(this.overlay);

    // scroll-driven UV lithography & chip formation (no scroll lock)
    this.litho = createLithography();
    this.scene.add(this.litho.group);

    // composer: bloom gives the wafer, UV beam, and formed dies a crisp glow
    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.58, 0.65, 0.62);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
  }

  _initDom() {
    const set = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
      return el;
    };
    set('tc-eyebrow', TITLE_CARD.eyebrow);
    set('tc-title', TITLE_CARD.title);
    set('tc-subtitle', TITLE_CARD.subtitle);
    const hint = document.querySelector('.title-card__hint-text');
    if (hint) hint.textContent = TITLE_CARD.hint;

    const actions = document.getElementById('tc-actions');
    if (actions) {
      for (const c of TITLE_CARD.ctas || []) {
        const a = document.createElement('a');
        a.className = 'title-card__cta';
        a.href = c.href;
        a.textContent = c.label;
        actions.appendChild(a);
      }
    }

    this.titleCard = document.getElementById('title-card');
    this.sceneLabel = document.getElementById('scene-label');
    this.sceneLabelSpan = this.sceneLabel.querySelector('span');
    this.chapterRail = document.getElementById('chapter-rail');
    this.chapterFill = this.chapterRail.querySelector('.chapter-rail__fill');
    this.nav = document.getElementById('hud-nav');
    this.topBtn = document.getElementById('fab-top-btn');
    this.loader = document.getElementById('loader');
    this.loaderFill = document.getElementById('loader-fill');
    this.loaderPct = document.getElementById('loader-pct');

    this.topBtn?.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // the menu — one tap from the front page to any page of the site
    const menu = document.getElementById('menu');
    const menuToggle = document.getElementById('menu-toggle');
    const setMenu = (open) => {
      menu?.classList.toggle('is-open', open);
      menu?.setAttribute('aria-hidden', String(!open));
      menuToggle?.setAttribute('aria-expanded', String(open));
      menuToggle?.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.body.classList.toggle('is-menu-open', open);
    };
    menuToggle?.addEventListener('click', () =>
      setMenu(!menu?.classList.contains('is-open'))
    );
    menu?.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => setMenu(false));
    });
    document.addEventListener('click', (e) => {
      const a = e.target?.closest?.('a[href="#lab"]');
      if (!a) return;
      e.preventDefault();
      setMenu(false);
      this.jumpToLab(true);
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') setMenu(false);
    });
  }

  /** Jump cleanly to the NBL landing section without mid-runway flashes. */
  jumpToLab(smooth = true) {
    this.scroll.raw = 1;
    this.scroll.smooth = 1;
    const lab = document.getElementById('lab');
    if (lab) {
      lab.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
    }
  }

  /** The lab landing page is the final chapter: keep its frame as tall as its content. */
  _initLab() {
    const frame = document.getElementById('lab-frame');
    if (!frame) return;
    const fit = () => {
      try {
        const d = frame.contentDocument;
        if (!d || !d.documentElement) return;
        const h = Math.max(d.documentElement.scrollHeight, d.body ? d.body.scrollHeight : 0);
        if (h > 100) frame.style.height = `${h}px`;
      } catch (e) { /* cross-origin: leave at default height */ }
    };
    frame.addEventListener('load', () => {
      fit();
      try {
        new ResizeObserver(fit).observe(frame.contentDocument.body);
      } catch (e) { /* no ResizeObserver */ }
    });
    window.addEventListener('resize', fit);
    window.addEventListener('load', fit);
  }

  // ------------------------------------------------------------ assets ---
  async load() {
    const progress = (v) => {
      this.loaderFill.style.width = `${Math.round(v * 100)}%`;
      this.loaderPct.textContent = `${Math.round(v * 100)}%`;
    };
    progress(0.05);

    this.fab = createDevice();
    this.scene.add(this.fab.group);
    progress(0.9);

    this.renderer.compile(this.scene, this.camera);
    progress(1);

    await new Promise((r) => setTimeout(r, 260));
    this.loader.classList.add('is-done');
    document.body.classList.remove('is-loading');
  }

  // ------------------------------------------------------------ layout ---
  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.8) * (this.quality ?? 1);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(dpr);
    this.composer.setSize(w, h);
    this.bloom.setSize(w * dpr, h * dpr);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // ----------------------------------------------------------- helpers ---
  _sampleKeys(p) {
    let a = CAM_KEYS[0];
    let b = CAM_KEYS[CAM_KEYS.length - 1];
    for (let i = 0; i < CAM_KEYS.length - 1; i++) {
      if (p >= CAM_KEYS[i].p && p <= CAM_KEYS[i + 1].p) {
        a = CAM_KEYS[i];
        b = CAM_KEYS[i + 1];
        break;
      }
    }
    const span = Math.max(1e-6, b.p - a.p);
    const t = THREE.MathUtils.clamp((p - a.p) / span, 0, 1);
    const e = t * t * (3 - 2 * t);
    return {
      pos: new THREE.Vector3(
        THREE.MathUtils.lerp(a.pos[0], b.pos[0], e),
        THREE.MathUtils.lerp(a.pos[1], b.pos[1], e),
        THREE.MathUtils.lerp(a.pos[2], b.pos[2], e)
      ),
      look: new THREE.Vector3(
        THREE.MathUtils.lerp(a.look[0], b.look[0], e),
        THREE.MathUtils.lerp(a.look[1], b.look[1], e),
        THREE.MathUtils.lerp(a.look[2], b.look[2], e)
      ),
    };
  }

  _updateTitleCard(p) {
    const since = (performance.now() - this.loadedAt) / 1000;
    const fadeIn = THREE.MathUtils.clamp(since / 1.7, 0, 1);
    const fadeOut = 1 - THREE.MathUtils.clamp((p - 0.012) / 0.028, 0, 1);
    const v = Math.min(fadeIn, fadeOut);
    const card = this.titleCard;
    card.style.opacity = String(v);
    card.style.visibility = v > 0.002 ? 'visible' : 'hidden';

    const eyebrow = card.querySelector('.title-card__eyebrow');
    const title = card.querySelector('.title-card__title');
    const sub = card.querySelector('.title-card__subtitle');
    const hint = card.querySelector('.title-card__hint');
    const actions = card.querySelector('.title-card__actions');

    eyebrow.style.opacity = String(fadeIn);
    eyebrow.style.transform = `translate3d(0, ${(1 - fadeIn) * 14}px, 0)`;
    title.style.opacity = String(fadeIn);
    title.style.transform = `translate3d(0, ${(1 - fadeIn) * 26}px, 0)`;
    title.style.filter = `blur(${(1 - fadeIn) * 12}px)`;
    title.style.letterSpacing = `${0.16 + (1 - fadeIn) * 0.1}em`;
    sub.style.opacity = String(fadeIn * 0.95);
    sub.style.transform = `translate3d(0, ${(1 - fadeIn) * 18}px, 0)`;
    hint.style.opacity = String(fadeIn * (1 - THREE.MathUtils.clamp((p - 0.006) / 0.02, 0, 1)));
    if (actions) {
      actions.style.opacity = String(fadeIn);
      actions.style.transform = `translate3d(0, ${(1 - fadeIn) * 18}px, 0)`;
      actions.style.pointerEvents = v > 0.6 ? 'auto' : 'none';
    }
  }

  _updateLabel(p) {
    let label = '';
    for (const s of SECTION_LABELS) if (p >= s.at) label = s.text;
    if (this.sceneLabelSpan.textContent !== label) this.sceneLabelSpan.textContent = label;
    const visible = p > 0.03 && p < 0.72;
    this.sceneLabel.classList.toggle('is-visible', visible);
    this.chapterRail.classList.toggle('is-visible', p > 0.03 && p < 0.88);
    this.chapterFill.style.height = `${Math.min(100, p * 100)}%`;
    this.nav.classList.add('is-visible');
  }

  // -------------------------------------------------------------- loop ---
  _loop() {
    this._raf = requestAnimationFrame(this._loop.bind(this));
    const dt = Math.min(0.05, this.clock.getDelta());
    this.elapsed += dt;

    const p = this.scroll.update(dt);
    const ptr = this.pointer.update(dt);

    // ---------------------------------------------------------- camera --
    const k = this._sampleKeys(p);
    this.camera.position.copy(k.pos);
    this.camera.lookAt(k.look);

    // ------------------------------------------------------ model state --
    // UV lithography window: device fades out smoothly so the notched wafer + UV beam take focus
    const lithoFocus = THREE.MathUtils.smoothstep(p, 0.505, 0.555) *
                       (1 - THREE.MathUtils.smoothstep(p, 0.72, 0.79));

    if (this.fab) {
      const fab = this.fab;
      const reveal = THREE.MathUtils.clamp((p - 0.04) / 0.065, 0, 1);
      const panels = THREE.MathUtils.clamp((p - 0.075) / 0.05, 0, 1);
      fab.setEdgeReveal(reveal);

      const dissolve = THREE.MathUtils.smoothstep(p, 0.305, 0.36) *
                       (1 - THREE.MathUtils.smoothstep(p, 0.525, 0.56));
      const fabVis = 1 - lithoFocus;
      fab.group.visible = fabVis > 0.02;
      fab.setSolidOpacity(panels * (1 - dissolve * 0.97) * fabVis);

      const settled = THREE.MathUtils.lerp(
        1.0, 0.12, THREE.MathUtils.smoothstep(p, 0.1, 0.145)
      );
      fab.setEdgeOpacity((settled + dissolve * 0.28) * fabVis);

      this.inertia.yaw += ptr.vx * 0.55;
      this.inertia.pitch += ptr.vy * 0.28;
      this.inertia.yaw *= 0.93;
      this.inertia.pitch *= 0.93;

      const orbitY = ptr.x * 0.42 + this.inertia.yaw;
      const orbitX = ptr.y * 0.16 + this.inertia.pitch;
      fab.group.rotation.y = orbitY;
      fab.group.rotation.x = THREE.MathUtils.clamp(orbitX, -0.28, 0.28);
      fab.group.rotation.z = Math.sin(this.elapsed * 0.18) * 0.035;
      fab.root.rotation.y += dt * 0.055;
      fab.update(dt, this.elapsed);

      const dim = 1 - 0.55 * THREE.MathUtils.smoothstep(p, 0.305, 0.37) *
                        (1 - THREE.MathUtils.smoothstep(p, 0.52, 0.565));
      fab.coreLight.intensity = 1.5 * dim * fabVis;
    }

    // ----------------------------------------------------- scene state --
    const camDist = Math.max(6, this.camera.position.length());
    const wdist = camDist * 3.2 + 46;
    this.wafer.group.position.set(-14, -4, -wdist);
    this.wafer.group.scale.setScalar(wdist / 150);
    this.wafer.group.rotation.y += dt * 0.012;

    // dim backdrop wafer during theory text and while close-up UV lithography is active
    const theoryDim = 1 - 0.50 * THREE.MathUtils.smoothstep(p, 0.30, 0.37) *
                          (1 - THREE.MathUtils.smoothstep(p, 0.52, 0.565));
    const waferReveal = THREE.MathUtils.clamp((p - 0.03) / 0.09, 0, 1) *
                        theoryDim * (1 - lithoFocus * 0.85);
    this.wafer.update(p, waferReveal);

    // scroll-driven UV lithography & chip formation
    this.litho.update(p, this.elapsed);

    this.theory.setHidden(false);
    this.theory.update(p);
    this.endLinks.update(p);
    this._updateTitleCard(p);
    this._updateLabel(p);

    // ------------------------------------------------------- rendering --
    const overLab = window.scrollY > this.scroll.maxScroll - window.innerHeight * 0.15;
    this.nav.classList.toggle('is-over-lab', overLab);
    this.topBtn?.classList.toggle('is-visible', overLab);

    const pastFilm = window.scrollY > this.scroll.maxScroll + window.innerHeight * 0.6;
    this.stage.style.visibility = pastFilm ? 'hidden' : 'visible';
    if (!pastFilm) this.composer.render();
  }
}
