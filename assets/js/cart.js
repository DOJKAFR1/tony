/* ==========================================================================
   TONY COSMETICS — cart.js
   Full cart page: line items, coupon, order summary, cross-sell.
   ========================================================================== */
(function (global) {
  'use strict';

  var TC = global.TC;
  var D = global.TCData;
  var $ = TC.$, $$ = TC.$$, esc = TC.esc;

  /* --------------------------------------------------------- promo codes */
  var PROMOS = (D.content && D.content.promos) || {};
  var AREAS = (D.content && D.content.areas) || [];
  var promo = sessionStorage.getItem('tc_promo') || '';
  if (promo && !PROMOS[promo]) promo = '';

  /* ------------------------------------------------------------- shipping */

  function shipFee(sub) {
    if (sub <= 0) return 0;
    if (sub >= D.shop.freeShipFrom) return 0;
    var code = PROMOS[promo];
    if (code && code.type === 'ship') return 0;
    return AREAS[1].fee;
  }

  function discount(sub) {
    var code = PROMOS[promo];
    if (!code || code.type !== 'pct') return 0;
    return Math.round(sub * code.value / 100);
  }

  /* ---------------------------------------------------------------- lines */
  function linesHTML() {
    var rows = TC.Cart.detailed();
    if (!rows.length) {
      return '<div class="empty-state" style="border:1px solid var(--tc-border-soft);border-radius:var(--r-md);background:#fff">' +
        TC.icon('cartEmpty', 'empty-state__icon') +
        '<div class="empty-state__title">سلتك فارغة</div>' +
        '<div class="empty-state__text">ابدأ التسوّق وأضف منتجاتك المفضلة — الشحن مجاني للطلبات فوق ' + TC.plainMoney(D.shop.freeShipFrom) + '.</div>' +
        '<a class="btn btn--primary" href="collection.html?c=all">تصفّح المنتجات</a>' +
      '</div>';
    }

    var head = '<div class="cart-list"><div class="cart-list__head">' +
      '<span>المنتج</span><span></span><span>الكمية</span><span>الإجمالي</span><span></span></div>';

    var body = rows.map(function (r, i) {
      var p = r.p;
      return '<div class="cart-line" data-line="' + i + '">' +
        '<a class="cart-line__media" href="' + TC.prodUrl(p) + '">' +
          '<img src="' + TC.imgOf(p) + '" alt="' + esc(p.name) + '" width="88" height="100" loading="lazy"></a>' +
        '<div class="cart-line__info">' +
          '<a class="cart-line__name" href="' + TC.prodUrl(p) + '">' + esc(p.name) + '</a>' +
          (p.variants && p.variants.length > 1 && r.it.v
            ? '<div class="cart-line__variant">الخيار: ' + esc(r.it.v) + '</div>' : '') +
          '<div class="cart-line__each">سعر القطعة: ' + TC.plainMoney(p.price) +
            (p.was ? ' <s style="opacity:.6">' + TC.num(p.was) + '</s>' : '') + '</div>' +
          (p.stock <= 8 && p.stock > 0
            ? '<div class="cart-line__variant" style="color:var(--tc-sale);font-weight:700">بقي ' + p.stock + ' فقط</div>' : '') +
          (p.stock === 0 ? '<div class="cart-line__variant" style="color:var(--tc-sale);font-weight:700">نفدت الكمية</div>' : '') +
        '</div>' +
        '<div class="cart-line__qty">' +
          '<div class="qty">' +
            '<button class="qty__btn" data-c-dec aria-label="إنقاص">' + TC.icon('minus') + '</button>' +
            '<input class="qty__input" type="text" inputmode="numeric" value="' + r.it.q + '" data-c-qty aria-label="الكمية">' +
            '<button class="qty__btn" data-c-inc aria-label="زيادة">' + TC.icon('plus') + '</button>' +
          '</div>' +
        '</div>' +
        '<div class="cart-line__total">' + TC.plainMoney(r.line) + '</div>' +
        '<button class="cart-line__rm" data-c-rm aria-label="إزالة">' + TC.icon('close') + '</button>' +
      '</div>';
    }).join('');

    var foot = '<div class="cart-list__foot">' +
      '<button class="btn btn--light btn--sm" data-c-clear>' + TC.icon('trash') + ' إفراغ السلة</button>' +
      '<a class="btn btn--light btn--sm" href="collection.html?c=all">متابعة التسوّق</a>' +
    '</div>';

    return head + body + foot + '</div>';
  }

  /* -------------------------------------------------------------- summary */
  function sideHTML() {
    var sub = TC.Cart.subtotal();
    var save = TC.Cart.savings();
    var disc = discount(sub);
    var fee = shipFee(sub - disc);
    var total = Math.max(0, sub - disc + fee);

    var code = PROMOS[promo];

    return '<div class="summary">' +
      '<div class="summary__title">ملخّص الطلب</div>' +

      '<div class="summary__row"><span>المجموع الفرعي (' + TC.num(TC.Cart.count()) + ' قطعة)</span><b>' + TC.plainMoney(sub) + '</b></div>' +
      (save > 0 ? '<div class="summary__row summary__row--save"><span>خصم المنتجات</span><span>-' + TC.plainMoney(save) + '</span></div>' : '') +
      (disc ? '<div class="summary__row summary__row--save"><span>' + esc(code.label) + '</span><span>-' + TC.plainMoney(disc) + '</span></div>' : '') +
      '<div class="summary__row"><span>الشحن</span><span>' + (fee ? TC.plainMoney(fee) : '<b style="color:var(--tc-brand)">مجاني</b>') + '</span></div>' +
      '<div class="summary__row summary__row--total"><span>الإجمالي</span><b>' + TC.plainMoney(total) + '</b></div>' +

      '<form class="promo-form" data-promo-form>' +
        '<input class="input" name="code" placeholder="كود الخصم" value="' + esc(promo) + '" autocomplete="off">' +
        '<button class="btn btn--dark" type="submit">تطبيق</button>' +
      '</form>' +
      (promo ? '<div class="summary__row" style="color:var(--tc-brand);font-weight:700"><span>✔ ' + esc(code.label) + '</span>' +
        '<button data-promo-clear style="color:var(--tc-sale);font-weight:700;font-size:12px">إزالة</button></div>' : '') +

      (sub >= D.shop.freeShipFrom
        ? '<div class="summary__note" style="color:var(--tc-brand);font-weight:700">مبروك! حصلت على شحن مجاني</div>'
        : '<div class="summary__note">أضف بقيمة ' + TC.plainMoney(D.shop.freeShipFrom - sub) + ' للحصول على شحن مجاني</div>') +

      '<div style="display:grid;gap:10px;margin-top:16px">' +
        '<a class="btn btn--primary btn--lg btn--block" href="checkout.html" data-checkout' + (sub ? '' : ' aria-disabled="true"') + '>' +
          TC.icon('lock') + ' إتمام الطلب بأمان</a>' +
        '<a class="btn btn--light btn--block" href="collection.html?c=offers">استخدم كود خصم</a>' +
      '</div>' +

      '<div class="summary__note">الدفع عند الاستلام متاح · بياناتك محمية 100٪' +
        '<br>الشحن: ' + AREAS.map(function (a) { return a.name + ' ' + a.eta; }).join(' · ') + '</div>' +
    '</div>';
  }

  /* ------------------------------------------------------------ cross-sell */
  function renderCross() {
    var rows = TC.Cart.detailed();
    var inCart = rows.map(function (r) { return r.p.cat; });
    var pool = D.products.filter(function (p) {
      return inCart.indexOf(p.cat) > -1 && p.stock > 0 &&
        !rows.some(function (r) { return r.p.id === p.id; });
    });
    if (pool.length < 4) {
      D.products.forEach(function (p) {
        if (p.stock > 0 && pool.indexOf(p) === -1) pool.push(p);
      });
    }
    if (!pool.length) { $('[data-cross]').innerHTML = ''; return; }

    $('[data-cross]').innerHTML =
      '<div class="container">' +
        '<div class="section-head">' +
          '<div><h2 class="section-head__title h-lg">أضف إلى طلبك</h2>' +
          '<p class="section-head__sub">منتجات يشتريها العملاء عادةً مع طلبك</p></div>' +
          '<a class="section-head__link" href="collection.html?c=best-sellers">عرض الكل' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>' +
          '</a>' +
        '</div>' +
        '<div class="p-grid">' + pool.slice(0, 4).map(function (p) { return TC.cardHTML(p); }).join('') + '</div>' +
      '</div>';
  }

  /* ----------------------------------------------------------------- boot */
  function render() {
    var n = TC.Cart.count();
    $('[data-head-count]').textContent = n ? '(' + n + ')' : '';
    $('[data-items]').innerHTML = linesHTML();
    $('[data-side]').innerHTML = sideHTML();

    var trust = $('[data-trust]');
    if (trust) {
      trust.innerHTML = [
        { i: 'truck', t: 'شحن سريع لكل فلسطين', s: 'خلال 24 – 72 ساعة' },
        { i: 'refresh', t: 'إرجاع مجاني', s: 'خلال 14 يوم' },
        { i: 'shield', t: 'أصلي 100٪', s: 'منتجات مضمونة' },
        { i: 'headset', t: 'دعم واتساب', s: 'استشارة مجانية' }
      ].map(function (x) {
        return '<div class="feature">' +
          '<span class="feature__icon">' + TC.icon(x.i) + '</span>' +
          '<span><span class="feature__title">' + x.t + '</span>' +
          '<span class="feature__text">' + x.s + '</span></span>' +
        '</div>';
      }).join('');
    }
  }

  function boot() {
    if (!$('[data-items]')) return;
    render();
    renderCross();

    TC.on('cart', render);

    document.addEventListener('click', function (e) {
      var line = e.target.closest('[data-line]');
      if (!line) return;
      var i = +line.dataset.line;

      if (e.target.closest('[data-c-inc]')) {
        TC.Cart.setQty(i, TC.Cart.items[i].q + 1);
        return;
      }
      if (e.target.closest('[data-c-dec]')) {
        TC.Cart.setQty(i, TC.Cart.items[i].q - 1);
        return;
      }
      if (e.target.closest('[data-c-rm]')) {
        TC.Cart.remove(i);
        TC.toast('تمت إزالة المنتج من السلة');
        return;
      }
    });

    document.addEventListener('change', function (e) {
      var inp = e.target.closest('[data-c-qty]');
      if (!inp) return;
      var line = inp.closest('[data-line]');
      TC.Cart.setQty(+line.dataset.line, parseInt(inp.value, 10) || 1);
    });

    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-c-clear]')) {
        TC.Cart.clear();
        TC.toast('تم إفراغ السلة');
        return;
      }
      if (e.target.closest('[data-promo-clear]')) {
        promo = '';
        sessionStorage.removeItem('tc_promo');
        render();
        return;
      }
      var co = e.target.closest('[data-checkout]');
      if (co && !TC.Cart.count()) {
        e.preventDefault();
        TC.toast('السلة فارغة — أضف منتجات أولاً', 'err');
      }
    });

    document.addEventListener('submit', function (e) {
      var f = e.target.closest('[data-promo-form]');
      if (!f) return;
      e.preventDefault();
      var code = (f.code.value || '').trim().toUpperCase();
      if (PROMOS[code]) {
        promo = code;
        sessionStorage.setItem('tc_promo', code);
        TC.toast('تم تفعيل ' + PROMOS[code].label);
      } else {
        promo = '';
        sessionStorage.removeItem('tc_promo');
        TC.toast('كود الخصم غير صحيح', 'err');
      }
      render();
    });

    if (!TC.Cart.count()) renderCross();
  }

  /* ننتظر تحميل البيانات أولاً (priority 100) ثم جاهزية DOM،
     وبعدها يعمل app.js boot (priority 200) في آخر الطريق. */
  function start() {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }
  if (global.TCReady) global.TCReady(start);
  else start();
})(window);
