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

const DONATION_PRESETS = [10, 25, 50, 100, 250, 500];
const DONATION_MIN = 10;
const DONATION_MAX = 500;
const DONATION_STEP = 1;
const DONATION_FALLBACK_VARIANT_ID = '50190780530881';
const DONATION_FALLBACK_STORE = 'https://shop.hoodhoodgolf.com';

function parseDonationConfig() {
  const links = window.HHG_SHOPIFY_LINKS || {};
  const donateUrl = String(links.donate || '');
  const cartMatch = donateUrl.match(/^https?:\/\/[^/]+\/cart\/(\d+):\d+\?checkout/i);
  if (cartMatch) {
    const store = donateUrl.match(/^https?:\/\/[^/]+/i);
    return {
      store: store ? store[0] : DONATION_FALLBACK_STORE,
      variantId: cartMatch[1]
    };
  }

  return {
    store: DONATION_FALLBACK_STORE,
    variantId: DONATION_FALLBACK_VARIANT_ID
  };
}

function clampDonationAmount(value) {
  const num = Number.parseInt(String(value || ''), 10);
  if (Number.isNaN(num)) return DONATION_MIN;
  return Math.min(DONATION_MAX, Math.max(DONATION_MIN, num));
}

function buildDonateCheckoutUrl(amount) {
  const config = parseDonationConfig();
  const qty = clampDonationAmount(amount);
  return `${config.store}/cart/${config.variantId}:${qty}?checkout`;
}

function createDonateModal() {
  const wrapper = document.createElement('div');
  wrapper.className = 'donate-modal';
  wrapper.setAttribute('data-donate-modal', '');
  wrapper.setAttribute('hidden', 'hidden');
  wrapper.innerHTML = `
    <div class="donate-modal__backdrop" data-donate-close></div>
    <div class="donate-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="donate-modal-title">
      <button type="button" class="donate-modal__close" aria-label="Close" data-donate-close>&times;</button>
      <p class="donate-modal__kicker">Support HHG</p>
      <h3 id="donate-modal-title">Donate Any Amount</h3>
      <p class="donate-modal__helper">$1 quantity = $1 donated. Choose a preset or enter your own amount.</p>

      <div class="donate-presets" role="group" aria-label="Donation presets">
        ${DONATION_PRESETS.map((amount) => `<button type="button" class="donate-preset" data-donate-preset="${amount}">$${amount}</button>`).join('')}
      </div>

      <label class="donate-label" for="donation-amount">Donation Amount</label>
      <input
        id="donation-amount"
        class="donate-input"
        type="number"
        min="${DONATION_MIN}"
        max="${DONATION_MAX}"
        step="${DONATION_STEP}"
        value="${DONATION_MIN}"
        inputmode="numeric"
      />

      <a class="btn btn-primary donate-submit" data-donate-submit href="${buildDonateCheckoutUrl(DONATION_MIN)}">Donate Any Amount</a>
    </div>
  `;
  document.body.appendChild(wrapper);
  return wrapper;
}

function initDonateFlow() {
  const donateLinks = Array.from(document.querySelectorAll('[data-shopify-key="donate"]'));
  if (!donateLinks.length) return;

  donateLinks.forEach((el) => {
    el.textContent = 'Donate Any Amount';
    el.setAttribute('href', buildDonateCheckoutUrl(DONATION_MIN));
  });

  const modal = createDonateModal();
  const input = modal.querySelector('.donate-input');
  const submit = modal.querySelector('[data-donate-submit]');
  const presetButtons = Array.from(modal.querySelectorAll('[data-donate-preset]'));

  const updateSelectedPreset = () => {
    const value = clampDonationAmount(input.value);
    presetButtons.forEach((btn) => {
      const amount = Number.parseInt(btn.getAttribute('data-donate-preset') || '', 10);
      btn.classList.toggle('is-active', amount === value);
    });
    submit.setAttribute('href', buildDonateCheckoutUrl(value));
  };

  const openModal = () => {
    modal.hidden = false;
    document.body.classList.add('modal-open');
    updateSelectedPreset();
    input.focus();
    input.select();
  };

  const closeModal = () => {
    modal.hidden = true;
    document.body.classList.remove('modal-open');
  };

  donateLinks.forEach((el) => {
    el.addEventListener('click', (event) => {
      event.preventDefault();
      openModal();
    });
  });

  modal.querySelectorAll('[data-donate-close]').forEach((el) => {
    el.addEventListener('click', closeModal);
  });

  presetButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const amount = Number.parseInt(btn.getAttribute('data-donate-preset') || '', 10);
      input.value = String(clampDonationAmount(amount));
      updateSelectedPreset();
    });
  });

  input.addEventListener('input', () => {
    updateSelectedPreset();
  });

  input.addEventListener('blur', () => {
    input.value = String(clampDonationAmount(input.value));
    updateSelectedPreset();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.hidden) {
      closeModal();
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
  initDonateFlow();
});
