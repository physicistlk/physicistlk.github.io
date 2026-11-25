import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

import { ScrollController } from './scroll.js';
import { createEnvironment } from './environment.js';
import { Pointer } from './pointer.js';
import { createWafer } from '../scenes/wafer.js';
import { loadFabTool } from '../scenes/fabtool.js';
import { createTheory } from '../scenes/theory.js';
import { createTunnel } from '../scenes/tunnel.js';
import { ContrastField } from '../scenes/contrast.js';
import { createEpilogue } from '../scenes/epilogue.js';
import { TITLE_CARD, SECTION_LABELS, FILM } from '../content.js';
import modelUrl from '../assets/fab-tool.glb?url';

const GATE = 0.565;          // scroll progress where the cinema takes over
const EPILOGUE_AT = 0.62;

/** Camera choreography: position + look-at keyframes across the narrative. */
const CAM_KEYS = [
  { p: 0.000, pos: [0, 2.0, 31], look: [0, 0.8, 0] },
  { p: 0.060, pos: [0, 1.1, 20], look: [0, 0.2, 0] },
  { p: 0.130, pos: [5.5, 2.4, 16], look: [0, 0.3, 0] },
  { p: 0.230, pos: [8.6, 3.6, 17], look: [0, 0.1, 0] },
  { p: 0.310, pos: [11.5, 4.8, 16.5], look: [-2.4, 1.0, 0] },
  { p: 0.420, pos: [14.0, 6.0, 16.0], look: [-3.2, 1.3, 0] },
  { p: 0.500, pos: [16.0, 7.0, 15.5], look: [-3.6, 1.5, 0] },
  { p: 0.560, pos: [17.5, 7.8, 15.0], look: [-3.8, 1.6, 0] },
  { p: 0.640, pos: [30, 17, 52], look: [0, 0.4, 0] },
  { p: 0.760, pos: [48, 27, 86], look: [0, 0.4, 0] },
  { p: 1.000, pos: [74, 42, 150], look: [0, 0.4, 0] },
];

export class Narrative {
  constructor() {
    this.canvas = document.getElementById('stage');
    this.overlay = document.getElementById('overlay');
    this.elapsed = 0;
    this.loadedAt = performance.now();
    this.film = { active: false, played: false, t: 0, duration: FILM.duration };
    this.inertia = { yaw: 0, pitch: 0 };

    this._initRenderer();
    this._initScene();
    this._initDom();

    this.scroll = new ScrollController({
      onLock: () => document.body.classList.add('is-filming'),
      onUnlock: () => document.body.classList.remove('is-filming'),
    });
    this.pointer = new Pointer(window);

    this._onResize = this._onResize.bind(this);
    window.addEventListener('resize', this._onResize);
    this._onResize();

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
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.scene.fog = new THREE.FogExp2(0x000000, 0.0085);

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 900);
    this.camera.position.set(0, 2.4, 44);
    this.scene.add(this.camera);

    // procedural cleanroom IBL — gives the metal something to reflect
    this.scene.environment = createEnvironment(this.renderer);
    this.scene.environmentIntensity = 1.35;

    // ambient so the metal never reads as pure black
    this.scene.add(new THREE.AmbientLight(0x33465c, 1.1));

    // the wafer is anchored to the camera so it always sits behind the tool
    this.wafer = createWafer({ radius: 60 });
    this.wafer.group.position.set(-16, -5, -150);
    this.camera.add(this.wafer.group);

    this.theory = createTheory(this.overlay, this.scene);
    this.epilogue = createEpilogue(this.overlay);

    this.tunnel = createTunnel();
    this.scene.add(this.tunnel.group);

    this.contrast = new ContrastField({ camera: this.camera });
    this.camera.add(this.contrast.group);

    // composer: bloom is what makes the wafer and the lamps glow
    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.62, 0.68, 0.62);
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

    this.titleCard = document.getElementById('title-card');
    this.sceneLabel = document.getElementById('scene-label');
    this.sceneLabelSpan = this.sceneLabel.querySelector('span');
    this.chapterRail = document.getElementById('chapter-rail');
    this.chapterFill = this.chapterRail.querySelector('.chapter-rail__fill');
    this.filmEl = document.getElementById('film');
    this.filmCode = document.getElementById('film-code');
    this.filmNote = document.getElementById('film-note');
    this.filmTime = document.getElementById('film-time');
    this.nav = document.getElementById('hud-nav');
    this.loader = document.getElementById('loader');
    this.loaderFill = document.getElementById('loader-fill');
    this.loaderPct = document.getElementById('loader-pct');

    document.getElementById('film-skip')?.addEventListener('click', () => this._endFilm(true));
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.film.active) this._endFilm(true);
    });
  }

  // ------------------------------------------------------------ assets ---
  async load() {
    const progress = (v) => {
      this.loaderFill.style.width = `${Math.round(v * 100)}%`;
      this.loaderPct.textContent = `${Math.round(v * 100)}%`;
    };
    progress(0.05);

    const manager = new THREE.LoadingManager();
    manager.onProgress = (_url, loaded, total) => {
      progress(0.05 + 0.8 * (total ? loaded / total : 0));
    };

    try {
      this.fab = await loadFabTool(modelUrl, manager);
      this.scene.add(this.fab.group);
      progress(0.9);
    } catch (err) {
      console.error('[cascade] model failed to load', err);
      progress(1);
    }

    // pre-warm the shader compile so the first scroll is smooth
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
    // quality can be scaled down on weak GPUs (and by the automated visual checks)
    const dpr = Math.min(window.devicePixelRatio || 1, 1.8) * (this.quality ?? 1);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(dpr);
    this.composer.setSize(w, h);
    this.bloom.setSize(w * dpr, h * dpr);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.contrast.layout();
    this.contrast.setPixelScale(this.renderer);
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
    // the card fades up on load, then dissolves as soon as the visitor scrolls
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

    eyebrow.style.opacity = String(fadeIn);
    eyebrow.style.transform = `translate3d(0, ${(1 - fadeIn) * 14}px, 0)`;
    title.style.opacity = String(fadeIn);
    title.style.transform = `translate3d(0, ${(1 - fadeIn) * 26}px, 0)`;
    title.style.filter = `blur(${(1 - fadeIn) * 12}px)`;
    title.style.letterSpacing = `${0.16 + (1 - fadeIn) * 0.1}em`;
    sub.style.opacity = String(fadeIn * 0.95);
    sub.style.transform = `translate3d(0, ${(1 - fadeIn) * 18}px, 0)`;
    hint.style.opacity = String(fadeIn * (1 - THREE.MathUtils.clamp((p - 0.006) / 0.02, 0, 1)));
  }

  _updateLabel(p) {
    let label = '';
    for (const s of SECTION_LABELS) if (p >= s.at) label = s.text;
    if (this.sceneLabelSpan.textContent !== label) this.sceneLabelSpan.textContent = label;
    const visible = p > 0.03 && p < 0.6;
    this.sceneLabel.classList.toggle('is-visible', visible);
    this.chapterRail.classList.toggle('is-visible', p > 0.03 && p < 0.6);
    this.chapterFill.style.height = `${Math.min(100, p * 100)}%`;
    this.nav.classList.toggle('is-visible', p > 0.035);
  }

  // -------------------------------------------------------------- film ---
  _startFilm() {
    if (this.film.played) return;
    this.film.played = true;
    this.film.active = true;
    this.film.t = 0;
    this.scroll.lock();
    this.filmEl.classList.add('is-visible');
    document.body.classList.add('is-filming');
  }

  _endFilm(skipped = false) {
    if (!this.film.active) return;
    this.film.active = false;
    this.filmEl.classList.remove('is-visible');
    document.body.classList.remove('is-filming');
    this.scroll.unlock();
    // hand the viewer back just past the gate so the epilogue is next
    this.scroll.scrollToProgress(EPILOGUE_AT - 0.02);
  }

  _updateFilm(dt) {
    if (!this.film.active) return;
    this.film.t += dt / this.film.duration;
    const t = Math.min(1, this.film.t);

    // HUD
    const secs = Math.floor(t * this.film.duration);
    const mm = String(Math.floor(secs / 60)).padStart(2, '0');
    const ss = String(secs % 60).padStart(2, '0');
    const ff = String(Math.floor((t * this.film.duration * 24) % 24)).padStart(2, '0');
    this.filmTime.textContent = `00:${mm}:${ss}:${ff}`;

    let sec = FILM.sections[0];
    for (const s of FILM.sections) if (t >= s.at) sec = s;
    if (this.filmCode.textContent !== sec.code) {
      this.filmCode.textContent = sec.code;
      this.filmNote.textContent = sec.note;
    }

    if (t >= 1) this._endFilm();
  }

  // -------------------------------------------------------------- loop ---
  _loop() {
    this._raf = requestAnimationFrame(this._loop.bind(this));
    const dt = Math.min(0.05, this.clock.getDelta());
    this.elapsed += dt;

    const p = this.scroll.update(dt);
    const ptr = this.pointer.update(dt);

    // ---------------------------------------------------------- camera --
    if (this.film.active) {
      this.tunnel.presence = Math.min(1, this.tunnel.presence + dt * 1.6);
      this.tunnel.group.visible = true;
      this.tunnel.placeCamera(this.camera, this.film.t, this.elapsed);
      if (this.fab) {
        this.fab.group.visible = false;
        this.wafer.group.visible = false;
      }
      this.contrast.setOpacity(0.55 * this.tunnel.presence);
      this.contrast.group.visible = true;
      this.bloom.strength = 0.62 - 0.26 * this.tunnel.presence;
      this.bloom.radius = 0.68 - 0.3 * this.tunnel.presence;
    } else {
      this.tunnel.presence = Math.max(0, this.tunnel.presence - dt * 2.2);
      this.tunnel.group.visible = false;
      this.contrast.setOpacity(0);
      this.bloom.strength = 0.62;
      this.bloom.radius = 0.68;
      if (this.fab) this.fab.group.visible = true;
      this.wafer.group.visible = true;

      const k = this._sampleKeys(p);
      this.camera.position.copy(k.pos);
      this.camera.lookAt(k.look);
    }

    // ------------------------------------------------------ model state --
    if (this.fab) {
      const fab = this.fab;
      // entry: edges draw in, then the panels materialise
      const reveal = THREE.MathUtils.clamp((p - 0.04) / 0.065, 0, 1);
      const panels = THREE.MathUtils.clamp((p - 0.075) / 0.05, 0, 1);
      fab.setEdgeReveal(reveal);

      // during the theory chapter the tool dissolves into a wireframe
      const dissolve = THREE.MathUtils.smoothstep(p, 0.305, 0.36) *
                       (1 - THREE.MathUtils.smoothstep(p, 0.525, 0.56));
      fab.setSolidOpacity(panels * (1 - dissolve * 0.97));

      // the edges are a reveal, not a permanent overlay: they light up during
      // the draw-in, settle to a whisper, and come back for the wireframe
      // decomposition in the theory chapter
      const settled = THREE.MathUtils.lerp(
        1.0, 0.12, THREE.MathUtils.smoothstep(p, 0.1, 0.145)
      );
      fab.setEdgeOpacity(settled + dissolve * 0.28);

      // pointer orbit with inertia
      this.inertia.yaw += ptr.vx * 0.55;
      this.inertia.pitch += ptr.vy * 0.28;
      this.inertia.yaw *= 0.93;
      this.inertia.pitch *= 0.93;

      const orbitY = ptr.x * 0.42 + this.inertia.yaw;
      const orbitX = ptr.y * 0.16 + this.inertia.pitch;
      fab.group.rotation.y = orbitY;
      fab.group.rotation.x = THREE.MathUtils.clamp(orbitX, -0.28, 0.28);
      fab.group.rotation.z = Math.sin(this.elapsed * 0.18) * 0.035;

      // the tool turns slowly of its own accord
      fab.root.rotation.y += dt * 0.055;

      fab.update(dt, this.elapsed);
      this.wafer.group.rotation.y += dt * 0.02;
    }

    // ----------------------------------------------------- scene state --
    // keep the wafer behind the tool and a constant apparent size
    if (!this.film.active) {
      const camDist = Math.max(6, this.camera.position.length());
      const wdist = camDist * 3.2 + 46;
      this.wafer.group.position.set(-14, -4, -wdist);
      this.wafer.group.scale.setScalar(wdist / 150);
    }

    // the wafer dims while the chapter text is on screen so the type reads
    const dim = 1 - 0.55 * THREE.MathUtils.smoothstep(p, 0.30, 0.37) *
                    (1 - THREE.MathUtils.smoothstep(p, 0.52, 0.565));
    const waferReveal = THREE.MathUtils.clamp((p - 0.03) / 0.09, 0, 1) * dim;
    this.wafer.update(p, waferReveal);
    this.theory.setHidden(this.film.active);
    this.theory.update(p);
    this.epilogue.update(p);
    this._updateTitleCard(p);
    this._updateLabel(p);
    this.tunnel.update(dt, this.elapsed);

    // the fab lights dim while the theory chapter is on screen
    if (this.fab) {
      const dim = 1 - 0.55 * THREE.MathUtils.smoothstep(p, 0.305, 0.37) *
                        (1 - THREE.MathUtils.smoothstep(p, 0.52, 0.565));
      this.fab.coreLight.intensity = 9 * dim;
    }

    // -------------------------------------------------------- the film --
    if (!this.film.played && p >= GATE && !this.scroll.locked) {
      this._startFilm();
    }
    this._updateFilm(dt);

    // ------------------------------------------------------- rendering --
    if (this.film.active) {
      // sample the tunnel's own contrast, then draw it with the bloom pass
      this.contrast.sample(this.renderer, this.scene, this.camera, [this.contrast.group]);
    }
    this.composer.render();

    if (this.film.active) this.contrast.setPixelScale(this.renderer);
  }
}
