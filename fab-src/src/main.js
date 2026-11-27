import { Narrative } from './core/app.js';

document.documentElement.classList.add('is-loading');

function fallbackToLab() {
  document.documentElement.classList.remove('is-loading');
  document.body.classList.remove('is-loading');
  document.getElementById('loader')?.classList.add('is-done');
  document.getElementById('hud-nav')?.classList.add('is-visible', 'is-over-lab');
  const runway = document.getElementById('runway');
  if (runway) runway.style.display = 'none';
  const stage = document.getElementById('stage');
  if (stage) stage.style.display = 'none';
  const titleCard = document.getElementById('title-card');
  if (titleCard) titleCard.style.display = 'none';
}

try {
  const app = new Narrative();
  app.load().then(() => {
    document.documentElement.classList.remove('is-loading');
    if (window.location.hash === '#lab') {
      app.jumpToLab(false);
    } else {
      window.scrollTo(0, 0);
    }
  }).catch(fallbackToLab);

  // expose for debugging / automated visual checks
  window.__cascade = app;
} catch (err) {
  console.warn('[cascade] WebGL unavailable, falling back to NBL lab page', err);
  fallbackToLab();
}
