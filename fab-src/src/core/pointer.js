/**
 * Pointer with inertia: the raw mouse position is damped toward a target so the
 * camera settles instead of snapping — the "feel the scale" orbit in Scene 1.
 */
export class Pointer {
  constructor(el = window) {
    this.target = { x: 0, y: 0 };
    this.value = { x: 0, y: 0 };
    this.velocity = { x: 0, y: 0 };
    this.active = false;

    this._onMove = (e) => {
      const t = e.touches ? e.touches[0] : e;
      if (!t) return;
      this.target.x = (t.clientX / window.innerWidth) * 2 - 1;
      this.target.y = -((t.clientY / window.innerHeight) * 2 - 1);
      this.active = true;
    };
    this._onLeave = () => {
      this.target.x = 0;
      this.target.y = 0;
    };

    el.addEventListener('mousemove', this._onMove, { passive: true });
    el.addEventListener('touchmove', this._onMove, { passive: true });
    el.addEventListener('mouseleave', this._onLeave, { passive: true });
    el.addEventListener('touchend', this._onLeave, { passive: true });
  }

  update(dt) {
    const k = 1 - Math.pow(0.008, dt);
    const px = this.value.x;
    const py = this.value.y;
    this.value.x += (this.target.x - this.value.x) * k;
    this.value.y += (this.target.y - this.value.y) * k;
    this.velocity.x = (this.value.x - px) / Math.max(dt, 1e-4);
    this.velocity.y = (this.value.y - py) / Math.max(dt, 1e-4);
    return { x: this.value.x, y: this.value.y, vx: this.velocity.x, vy: this.velocity.y };
  }
}
