/* ==========================================================================
   Attomik Base Theme — JavaScript
   ========================================================================== */

(function () {
  'use strict';

  /* --------------------------------------------------------------------------
     AJAX Cart — Add to cart without page reload
     -------------------------------------------------------------------------- */

  function initAjaxCart() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-atc]');
      if (!btn) return;

      e.preventDefault();

      var variantId = btn.getAttribute('data-variant-id');
      var textEl = btn.querySelector('[data-atc-text]');
      if (!variantId || btn.disabled) return;

      var originalText = textEl ? textEl.textContent : '';

      // Loading state
      btn.classList.add('product-card__atc--loading');
      btn.disabled = true;
      if (textEl) textEl.textContent = 'Adding\u2026';

      fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: parseInt(variantId, 10), quantity: 1 }),
      })
        .then(function (res) {
          if (!res.ok) throw new Error(res.statusText);
          return res.json();
        })
        .then(function () {
          // Success state
          btn.classList.remove('product-card__atc--loading');
          btn.classList.add('product-card__atc--success');
          if (textEl) textEl.textContent = 'Added \u2713';

          updateCartCount();

          setTimeout(function () {
            btn.classList.remove('product-card__atc--success');
            btn.disabled = false;
            if (textEl) textEl.textContent = originalText;
          }, 1500);
        })
        .catch(function () {
          // Error state
          btn.classList.remove('product-card__atc--loading');
          btn.disabled = false;
          if (textEl) textEl.textContent = 'Error — try again';

          setTimeout(function () {
            if (textEl) textEl.textContent = originalText;
          }, 2000);
        });
    });
  }

  function updateCartCount() {
    fetch('/cart.js', {
      headers: { 'Content-Type': 'application/json' },
    })
      .then(function (res) { return res.json(); })
      .then(function (cart) {
        var counters = document.querySelectorAll('[data-cart-count]');
        counters.forEach(function (el) {
          el.textContent = cart.item_count;
          el.hidden = cart.item_count === 0;
        });
      })
      .catch(function () {});
  }

  /* --------------------------------------------------------------------------
     Variant pill selector
     -------------------------------------------------------------------------- */

  function initVariantPills() {
    document.addEventListener('click', function (e) {
      var pill = e.target.closest('[data-variant-id]');
      if (!pill || !pill.closest('[data-variant-pills]')) return;

      var container = pill.closest('[data-variant-pills]');
      var card = pill.closest('.product-card');
      if (!card) return;

      // Update active state
      container.querySelectorAll('.product-card__variant-pill').forEach(function (p) {
        p.classList.remove('product-card__variant-pill--active');
      });
      pill.classList.add('product-card__variant-pill--active');

      // Update ATC button variant ID and availability
      var atcBtn = card.querySelector('[data-atc]');
      var atcText = card.querySelector('[data-atc-text]');
      var variantId = pill.getAttribute('data-variant-id');
      var available = pill.getAttribute('data-variant-available') === 'true';

      if (atcBtn) {
        atcBtn.setAttribute('data-variant-id', variantId);
        atcBtn.disabled = !available;
        if (atcText) {
          atcText.textContent = available ? 'Add to Cart' : 'Sold Out';
        }
      }
    });
  }

  /* --------------------------------------------------------------------------
     Init
     -------------------------------------------------------------------------- */

  document.addEventListener('DOMContentLoaded', function () {
    initAjaxCart();
    initVariantPills();
  });
})();
