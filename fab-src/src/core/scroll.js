/**
 * Scroll controller: tracks global scroll progress, damps it for camera motion,
 * and can freeze the document scroll (used to lock the viewer inside the cinema).
 */
export class ScrollController {
  constructor({ onLock, onUnlock } = {}) {
    this.raw = 0;        // instantaneous progress 0..1
    this.smooth = 0;     // damped progress used by the camera
    this.velocity = 0;
    this.locked = false;
    this._savedY = 0;
    this.onLock = onLock;
    this.onUnlock = onUnlock;

    this._onScroll = this._onScroll.bind(this);
    this._onResize = this._onResize.bind(this);
    window.addEventListener('scroll', this._onScroll, { passive: true });
    window.addEventListener('resize', this._onResize);
    this._onScroll();
    this.smooth = this.raw;
  }

  get maxScroll() {
    // progress is measured over the film runway only; the lab landing page
    // that follows it scrolls as an ordinary document
    const runway = document.getElementById('runway');
    const h = runway ? runway.offsetHeight : document.documentElement.scrollHeight;
    return Math.max(1, h - window.innerHeight);
  }

  get progress() {
    return this.raw;
  }

  _onScroll() {
    if (this.locked) return;
    this.raw = Math.min(1, Math.max(0, window.scrollY / this.maxScroll));
  }

  _onResize() {
    this._onScroll();
  }

  /** Freeze the page so the viewer cannot scroll out of the film. */
  lock() {
    if (this.locked) return;
    this.locked = true;
    this._savedY = window.scrollY;
    const body = document.body;
    body.dataset.prevTop = body.style.top || '';
    body.style.position = 'fixed';
    body.style.top = `-${this._savedY}px`;
    body.style.left = '0';
    body.style.width = '100%';
    this.onLock?.();
  }

  unlock() {
    if (!this.locked) return;
    this.locked = false;
    const body = document.body;
    body.style.position = '';
    body.style.top = body.dataset.prevTop || '';
    body.style.left = '';
    body.style.width = '';
    window.scrollTo(0, this._savedY);
    this._onScroll();
    this.onUnlock?.();
  }

  /** Jump the document to an absolute progress value (0..1). */
  scrollToProgress(p) {
    const y = Math.min(1, Math.max(0, p)) * this.maxScroll;
    window.scrollTo({ top: y, behavior: 'auto' });
    this.raw = Math.min(1, Math.max(0, window.scrollY / this.maxScroll));
  }

  update(dt) {
    const prev = this.smooth;
    // frame-rate independent damping
    const k = 1 - Math.pow(0.0015, dt);
    this.smooth += (this.raw - this.smooth) * k;
    this.velocity = (this.smooth - prev) / Math.max(dt, 1e-4);
    return this.smooth;
  }

  dispose() {
    window.removeEventListener('scroll', this._onScroll);
    window.removeEventListener('resize', this._onResize);
  }
}
