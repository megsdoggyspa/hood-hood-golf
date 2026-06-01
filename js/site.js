const EVENT_DATE = new Date('2026-09-26T08:00:00-04:00');

function initCountdown() {
  const root = document.querySelector('[data-countdown]');
  if (!root) return;

  const render = () => {
    const diff = EVENT_DATE.getTime() - Date.now();
    if (diff <= 0) {
      root.innerHTML = '<div class="time-box"><strong>Live</strong><span>Now</span></div>';
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((diff / (1000 * 60)) % 60);
    const secs = Math.floor((diff / 1000) % 60);

    root.innerHTML = [
      ['Days', days],
      ['Hours', hours],
      ['Mins', mins],
      ['Secs', secs]
    ].map(([label, value]) => `<div class="time-box"><strong>${value}</strong><span>${label}</span></div>`).join('');
  };

  render();
  setInterval(render, 1000);
}

function initShareButtons() {
  const url = encodeURIComponent(window.location.href);
  const text = encodeURIComponent('Hood Hood Golf Invitational II - Register now');
  document.querySelectorAll('[data-share]').forEach((btn) => {
    const channel = btn.getAttribute('data-share');
    const links = {
      x: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      whatsapp: `https://wa.me/?text=${text}%20${url}`
    };
    btn.setAttribute('href', links[channel] || '#');
    btn.setAttribute('target', '_blank');
    btn.setAttribute('rel', 'noopener');
  });
}

function initUtmLinks() {
  const ctas = document.querySelectorAll('[data-utm]');
  ctas.forEach((el) => {
    const base = el.getAttribute('href');
    if (!base || base.startsWith('#')) return;
    const joiner = base.includes('?') ? '&' : '?';
    const source = el.dataset.utm || 'site';
    el.setAttribute('href', `${base}${joiner}utm_source=${source}&utm_medium=cta&utm_campaign=hhgi2`);
  });
}

function initYear() {
  const y = document.querySelector('[data-year]');
  if (y) y.textContent = String(new Date().getFullYear());
}

function initMobileNav() {
  const nav = document.querySelector('.nav');
  const btn = document.querySelector('[data-nav-toggle]');
  if (!nav || !btn) return;
  btn.addEventListener('click', () => {
    nav.classList.toggle('nav-open');
  });
}

function initShopifyLinks() {
  const links = window.HHG_SHOPIFY_LINKS || {};
  document.querySelectorAll('[data-shopify-key]').forEach((el) => {
    const key = el.getAttribute('data-shopify-key');
    const url = links[key];
    if (url && /^https?:\/\//i.test(url)) {
      el.setAttribute('href', url);
    } else {
      el.setAttribute('href', '#');
      el.setAttribute('aria-disabled', 'true');
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initCountdown();
  initShareButtons();
  initUtmLinks();
  initYear();
  initMobileNav();
  initShopifyLinks();
});
