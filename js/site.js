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
const DONATE_LABEL = 'Donate';
const DONATION_PRODUCT_HANDLE = 'donate';
const DONATION_FALLBACK_STORE = 'https://shop.hoodhoodgolf.com';
const DONATION_FALLBACK_VARIANTS = {
  10: '50190780530881',
  25: '50190780563649',
  50: '50190780596417',
  100: '50190780629185'
};

function parseDonationConfig() {
  const links = window.HHG_SHOPIFY_LINKS || {};
  const donateUrl = String(links.donate || '');
  const cartMatch = donateUrl.match(/^https?:\/\/[^/]+\/cart\/(\d+):\d+\?checkout/i);
  const store = donateUrl.match(/^https?:\/\/[^/]+/i);
  return {
    store: store ? store[0] : DONATION_FALLBACK_STORE,
    seedVariantId: cartMatch ? cartMatch[1] : DONATION_FALLBACK_VARIANTS[10]
  };
}

function clampDonationAmount(value) {
  const num = Number.parseInt(String(value || ''), 10);
  if (Number.isNaN(num)) return DONATION_MIN;
  return Math.min(DONATION_MAX, Math.max(DONATION_MIN, num));
}

function toDonationVariantMap(variants) {
  const output = {};
  if (!Array.isArray(variants)) return output;

  variants.forEach((variant) => {
    const amount = Number(variant?.price) / 100;
    if (!Number.isFinite(amount) || amount <= 0 || !variant?.id) return;
    if (Number.isInteger(amount)) {
      output[amount] = String(variant.id);
    }
  });

  return output;
}

function buildDonationCartFromAmount(amount, variantMap) {
  const target = clampDonationAmount(amount);
  const denominations = Object.keys(variantMap)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => b - a);

  if (!denominations.length) {
    return {
      target: DONATION_MIN,
      exact: false,
      items: [{ variantId: DONATION_FALLBACK_VARIANTS[10], qty: 1 }]
    };
  }

  const tryGreedy = (value) => {
    let remainder = value;
    const items = [];

    denominations.forEach((denomination) => {
      const qty = Math.floor(remainder / denomination);
      if (qty > 0) {
        items.push({ variantId: variantMap[denomination], qty });
        remainder -= denomination * qty;
      }
    });

    if (remainder === 0) return items;
    return null;
  };

  let resolvedAmount = target;
  let lineItems = tryGreedy(target);

  if (!lineItems) {
    for (let delta = 1; delta <= DONATION_MAX; delta += 1) {
      const down = target - delta;
      if (down >= DONATION_MIN) {
        lineItems = tryGreedy(down);
        if (lineItems) {
          resolvedAmount = down;
          break;
        }
      }

      const up = target + delta;
      if (up <= DONATION_MAX) {
        lineItems = tryGreedy(up);
        if (lineItems) {
          resolvedAmount = up;
          break;
        }
      }
    }
  }

  if (!lineItems) {
    lineItems = tryGreedy(DONATION_MIN) || [{ variantId: variantMap[10] || DONATION_FALLBACK_VARIANTS[10], qty: 1 }];
    resolvedAmount = DONATION_MIN;
  }

  return {
    target: resolvedAmount,
    exact: resolvedAmount === target,
    items: lineItems
  };
}

function buildDonateCheckoutUrlFromCart(store, cart) {
  const itemsPart = cart.items.map((item) => `${item.variantId}:${item.qty}`).join(',');
  return `${store}/cart/${itemsPart}?checkout`;
}

async function fetchDonateVariantMap(store) {
  try {
    const response = await fetch(`${store}/products/${DONATION_PRODUCT_HANDLE}.js`, { credentials: 'omit' });
    if (!response.ok) return {};
    const payload = await response.json();
    return toDonationVariantMap(payload?.variants);
  } catch (_error) {
    return {};
  }
}

function buildFallbackMapFromSeed(seedVariantId) {
  const fallback = { ...DONATION_FALLBACK_VARIANTS };
  if (seedVariantId && !Object.values(fallback).includes(seedVariantId)) {
    fallback[10] = seedVariantId;
  }
  return fallback;
}

function createDonateModal(initialHref) {
  const wrapper = document.createElement('div');
  wrapper.className = 'donate-modal';
  wrapper.setAttribute('data-donate-modal', '');
  wrapper.setAttribute('hidden', 'hidden');
  wrapper.innerHTML = `
    <div class="donate-modal__backdrop" data-donate-close></div>
    <div class="donate-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="donate-modal-title">
      <button type="button" class="donate-modal__close" aria-label="Close" data-donate-close>&times;</button>
      <p class="donate-modal__kicker">Support HHG</p>
      <h3 id="donate-modal-title">${DONATE_LABEL}</h3>
      <p class="donate-modal__helper">$1 quantity = $1 donated. Choose a preset or enter your own amount.</p>
      <p class="donate-modal__note" data-donate-note hidden></p>

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

      <a class="btn btn-primary donate-submit" data-donate-submit href="${initialHref}">${DONATE_LABEL}</a>
    </div>
  `;
  document.body.appendChild(wrapper);
  return wrapper;
}

function initDonateFlow() {
  const donateLinks = Array.from(document.querySelectorAll('[data-shopify-key="donate"]'));
  if (!donateLinks.length) return;
  const donateConfig = parseDonationConfig();
  const fallbackVariantMap = buildFallbackMapFromSeed(donateConfig.seedVariantId);
  let activeVariantMap = fallbackVariantMap;
  const initialCart = buildDonationCartFromAmount(DONATION_MIN, activeVariantMap);
  const initialHref = buildDonateCheckoutUrlFromCart(donateConfig.store, initialCart);

  donateLinks.forEach((el) => {
    el.textContent = DONATE_LABEL;
    el.setAttribute('href', initialHref);
  });

  const modal = createDonateModal(initialHref);
  const dialog = modal.querySelector('.donate-modal__dialog');
  const input = modal.querySelector('.donate-input');
  const submit = modal.querySelector('[data-donate-submit]');
  const note = modal.querySelector('[data-donate-note]');
  const presetButtons = Array.from(modal.querySelectorAll('[data-donate-preset]'));

  const setNote = (message) => {
    if (!message) {
      note.setAttribute('hidden', 'hidden');
      note.textContent = '';
      return;
    }
    note.textContent = message;
    note.removeAttribute('hidden');
  };

  const updateSelectedPreset = () => {
    const value = clampDonationAmount(input.value);
    const cart = buildDonationCartFromAmount(value, activeVariantMap);
    input.value = String(cart.target);
    presetButtons.forEach((btn) => {
      const amount = Number.parseInt(btn.getAttribute('data-donate-preset') || '', 10);
      btn.classList.toggle('is-active', amount === cart.target);
    });
    submit.setAttribute('href', buildDonateCheckoutUrlFromCart(donateConfig.store, cart));
    if (cart.exact) {
      setNote('');
    } else {
      setNote(`Adjusted to $${cart.target} based on available donation options.`);
    }
  };

  const openModal = async () => {
    if (!modal.dataset.loaded) {
      const fetchedMap = await fetchDonateVariantMap(donateConfig.store);
      if (Object.keys(fetchedMap).length) {
        activeVariantMap = fetchedMap;
      }
      modal.dataset.loaded = 'true';
    }

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
    el.addEventListener('click', async (event) => {
      event.preventDefault();
      await openModal();
    });
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

  modal.addEventListener('click', (event) => {
    if (modal.hidden) return;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.closest('[data-donate-close]')) {
      event.preventDefault();
      event.stopPropagation();
      closeModal();
      return;
    }

    if (!dialog.contains(target)) {
      event.preventDefault();
      event.stopPropagation();
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
