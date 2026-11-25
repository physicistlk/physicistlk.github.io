import { Narrative } from './core/app.js';

document.documentElement.classList.add('is-loading');

const app = new Narrative();
app.load().then(() => {
  document.documentElement.classList.remove('is-loading');
  window.scrollTo(0, 0);
});

// expose for debugging / automated visual checks
window.__cascade = app;
