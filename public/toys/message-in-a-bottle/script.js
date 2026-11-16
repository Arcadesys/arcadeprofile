'use strict';
// The complete campaign remains readable with JavaScript disabled.
const larger = document.querySelector('#large-text');
const print = document.querySelector('#print');
larger.hidden = false;
print.hidden = false;
larger.addEventListener('click', () => {
  const enabled = document.body.classList.toggle('larger-text');
  larger.setAttribute('aria-pressed', String(enabled));
  larger.textContent = enabled ? 'Standard text' : 'Larger text';
});
print.addEventListener('click', () => window.print());
// Show the currently read session with both an underline and an ARIA label.
if ('IntersectionObserver' in window) {
  const links = [...document.querySelectorAll('.contents a[href^="#session-"]')];
  const visible = new Map();
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => visible.set(entry.target.id, entry.isIntersecting));
    const current = links.find(link => visible.get(link.hash.slice(1)));
    links.forEach(link => {
      if (link === current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }, {rootMargin: '-5% 0px -50% 0px'});
  document.querySelectorAll('.chapter').forEach(chapter => observer.observe(chapter));
}
