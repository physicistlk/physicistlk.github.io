import { EPILOGUE } from '../content.js';

/**
 * Scene 4 — Epilogue: credits rolling over the returning fab tool, closing
 * with a quote. Rendered as DOM so the type stays crisp at any distance.
 */
export function createEpilogue(root) {
  const wrap = document.createElement('div');
  wrap.className = 'epilogue';
  wrap.innerHTML = `
    <div class="epilogue__roll">
      <div class="epilogue__kicker">${EPILOGUE.kicker}</div>
      <div class="epilogue__credits">
        ${EPILOGUE.credits
          .map(
            (c) => `<div class="credit">
              <span class="credit__role">${c.role}</span>
              <span class="credit__value">${c.value}</span>
            </div>`
          )
          .join('')}
      </div>
    </div>
    <figure class="epilogue__quote">
      <blockquote>${EPILOGUE.quote}</blockquote>
    </figure>
  `;
  root.appendChild(wrap);

  const roll = wrap.querySelector('.epilogue__roll');
  const quote = wrap.querySelector('.epilogue__quote');

  return {
    element: wrap,
    /**
     * @param {number} p global scroll progress
     */
    update(p) {
      // credits roll upward through the epilogue window
      const rollT = THREE_clamp((p - 0.62) / 0.24);
      const inView = p > 0.605 && p < 0.985;
      wrap.style.opacity = inView ? '1' : '0';
      wrap.style.visibility = inView ? 'visible' : 'hidden';
      if (!inView) return;

      roll.style.transform = `translate3d(-50%, ${(1 - rollT) * 46}vh, 0)`;
      // the credits clear out before the quote takes the centre
      roll.style.opacity = String(1 - THREE_clamp((p - 0.83) / 0.09));

      // the quote arrives last, centred, and holds
      const qT = THREE_clamp((p - 0.855) / 0.075);
      quote.style.opacity = String(qT);
      quote.style.transform = `translate3d(-50%, calc(-50% + ${(1 - qT) * 18}px), 0)`;
      quote.style.letterSpacing = `${0.02 + (1 - qT) * 0.05}em`;
    },
  };
}

function THREE_clamp(v) {
  return Math.min(1, Math.max(0, v));
}
