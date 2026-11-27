import * as THREE from 'three';
import { END } from '../content.js';

/**
 * Scene 4 — the way out.
 *
 * Not an epilogue: the last movement simply opens the rest of the site. The
 * links are set large, because this is the one page of the narrative you are
 * meant to read from across the room.
 */
export function createEndLinks(root) {
  const wrap = document.createElement('div');
  wrap.className = 'endlinks';
  wrap.innerHTML = `
    <p class="endlinks__kicker">${END.kicker}</p>
    <nav class="endlinks__list" aria-label="More from this site">
      ${END.links
        .map(
          (l) => `
        <a class="endlink" href="${l.href}">
          <span class="endlink__label">${l.label}</span>
          <span class="endlink__note">${l.note}</span>
        </a>`
        )
        .join('')}
    </nav>
    <p class="endlinks__foot">${END.foot}</p>
  `;
  root.appendChild(wrap);

  const links = Array.from(wrap.querySelectorAll('.endlink'));

  return {
    element: wrap,

    /**
     * @param {number} p global scroll progress
     */
    update(p) {
      const inView = p > 0.605 && p < 0.965;
      if (!inView) {
        wrap.style.opacity = '0';
        wrap.style.visibility = 'hidden';
        wrap.style.pointerEvents = 'none';
        return;
      }

      // fade out smoothly before the lab landing section rises into view
      const fadeOut = 1 - THREE.MathUtils.smoothstep(p, 0.87, 0.96);
      wrap.style.opacity = String(fadeOut);
      wrap.style.visibility = fadeOut > 0.01 ? 'visible' : 'hidden';
      const list = wrap.querySelector('.endlinks__list');
      if (list) list.style.pointerEvents = fadeOut > 0.25 ? 'auto' : 'none';

      // the links arrive one after another
      const t = THREE.MathUtils.clamp((p - 0.625) / 0.17, 0, 1);
      links.forEach((el, i) => {
        const u = THREE.MathUtils.clamp((t - i * 0.055) / 0.55, 0, 1);
        const e = u * u * (3 - 2 * u);
        el.style.opacity = String(e);
        el.style.transform = `translate3d(0, ${(1 - e) * 38}px, 0)`;
      });
    },
  };
}
