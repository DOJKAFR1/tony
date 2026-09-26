/* ==========================================================================
   TONY COSMETICS — checkout.js
   Order form: validation, totals, and a simulated order confirmation.
   ========================================================================== */
(function (global) {
  'use strict';

  var TC = global.TC;
  var D = global.TCData;
  var $ = TC.$, $$ = TC.$$, esc = TC.esc;

  var PROMOS = (D.content && D.content.promos) || {};
  var COD_FEE = (D.content && D.content.codFee) || 10;
  /* نفس قائمة المناطق في السلة، لكن كخريطة id -> منطقة */
  var AREAS = {};
  ((D.content && D.content.areas) || []).forEach(function (a) { AREAS[a.id] = a; });
  var promo = sessionStorage.getItem('tc_promo') || '';
  if (promo && !PROMOS[promo]) promo = '';

  var pay = 'cod';
  var form = null;

  /* ------------------------------------------------------------- totals */
  function totals() {
    var sub = TC.Cart.subtotal();
    var code = PROMOS[promo];
    var disc = (code && code.type === 'pct') ? Math.round(sub * code.value / 100) : 0;
    var base = sub - disc;
    var ship = base >= D.shop.freeShipFrom ? 0 : (code && code.type === 'ship' ? 0 : AREAS.center.fee);
    var cod = pay === 'cod' && base > 0 ? COD_FEE : 0;
    return { sub: sub, disc: disc, ship: ship, cod: cod, total: base + ship + cod };
  }

  /* ------------------------------------------------------------ summary */
  function renderSide() {
    var rows = TC.Cart.detailed();
    var t = totals();

    var lines = rows.map(function (r) {
      return '<div class="co-line">' +
        '<span class="co-line__media"><img src="' + TC.imgOf(r.p) + '" alt="" width="52" height="58" loading="lazy">' +
          '<span class="co-line__q">' + r.it.q + '</span></span>' +
        '<span>' +
          '<span class="co-line__name">' + esc(r.p.name) + '</span><br>' +
          (r.it.v ? '<span class="co-line__variant">' + esc(r.it.v) + '</span>' : '') +
        '</span>' +
        '<span class="co-line__price">' + TC.plainMoney(r.line) + '</span>' +
      '</div>';
    }).join('');

    var feeEl = $('[data-cod-fee]');
    if (feeEl) feeEl.textContent = '+ ' + TC.plainMoney(COD_FEE) + ' رسوم تحصيل';

    $('[data-side]').innerHTML =
      '<div class="summary__title">طلبك (' + TC.num(TC.Cart.count()) + ' قطعة)</div>' +
      '<div class="co-list">' + lines + '</div>' +
      '<div class="summary__row"><span>المجموع الفرعي</span><b>' + TC.plainMoney(t.sub) + '</b></div>' +
      (t.disc ? '<div class="summary__row summary__row--save"><span>' + esc(PROMOS[promo].label) + '</span><span>-' + TC.plainMoney(t.disc) + '</span></div>' : '') +
      '<div class="summary__row"><span>الشحن</span><span>' + (t.ship ? TC.plainMoney(t.ship) : '<b style="color:var(--tc-brand)">مجاني</b>') + '</span></div>' +
      (t.cod ? '<div class="summary__row"><span>رسوم الدفع عند الاستلام</span><span>' + TC.plainMoney(t.cod) + '</span></div>' : '') +
      '<div class="summary__row summary__row--total"><span>الإجمالي</span><b>' + TC.plainMoney(t.total) + '</b></div>' +
      (pay === 'cod'
        ? '<div class="summary__note">ستدفع <b>' + TC.plainMoney(t.total) + '</b> نقداً للمندوب عند الاستلام.</div>'
        : '<div class="summary__note">ستُحوَّل <b>' + TC.plainMoney(t.total) + '</b> عبر بوابة دفع آمنة.</div>') +
      '<a class="btn btn--light btn--sm btn--block" style="margin-top:12px" href="cart.html">تعديل السلة</a>';
  }

  /* --------------------------------------------------------- validation */
  function bad(input, on) {
    var f = input.closest('.field');
    if (f) f.classList.toggle('is-bad', !!on);
  }

  function validators() {
    return [
      { sel: '[name="name"]', test: function (v) { return v.trim().length >= 2; } },
      { sel: '[name="phone"]', test: function (v) { return /^0?5[0-9]{8}$/.test(v.replace(/[\s-]/g, '')); } },
      { sel: '[name="email"]', test: function (v) { return !v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()); } },
      { sel: '[name="area"]', test: function (v) { return !!AREAS[v]; } },
      { sel: '[name="addr"]', test: function (v) { return v.trim().length >= 5; } }
    ];
  }

  function validate(show) {
    var ok = true;
    validators().forEach(function (v) {
      var el = form.querySelector(v.sel);
      if (!el) return;
      var good = v.test(el.value);
      if (!good) ok = false;
      if (show) bad(el, !good);
    });
    return ok;
  }

  /* ------------------------------------------------------- order number */
  function orderNo() {
    var d = new Date();
    var p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return 'TC' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' +
      p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
  }

  function saveOrder(data, t) {
    var o = {
      no: orderNo(),
      at: new Date().toISOString(),
      customer: data,
      items: TC.Cart.detailed().map(function (r) {
        return { id: r.p.id, name: r.p.name, v: r.it.v, q: r.it.q, line: r.line };
      }),
      totals: t
    };
    try {
      var all = JSON.parse(localStorage.getItem('tc_orders') || '[]');
      all.unshift(o);
      localStorage.setItem('tc_orders', JSON.stringify(all.slice(0, 20)));
    } catch (e) { /* storage unavailable — order still confirmed on screen */ }
    return o;
  }

  /* --------------------------------------------------------- success UI */
  function renderDone(o) {
    var t = o.totals;
    $('[data-checkout-root]').innerHTML =
      '<div class="order-done">' +
        '<div class="order-done__ico">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>' +
        '</div>' +
        '<h1 class="h-lg">تم استلام طلبك بنجاح!</h1>' +
        '<p class="muted" style="margin-top:8px">شكراً لك يا ' + esc(o.customer.name) + ' — سنتواصل معك على الرقم ' + esc(o.customer.phone) + ' خلال ساعات قليلة لتأكيد الطلب.</p>' +
        '<div class="order-done__no">' + esc(o.no) + '</div>' +

        '<div class="order-done__box">' +
          '<div class="summary__row"><span>المنتجات</span><b>' + o.items.length + ' صنف</b></div>' +
          '<div class="summary__row"><span>طريقة الدفع</span><b>' + (o.customer.pay === 'cod' ? 'عند الاستلام' : 'بطاقة ائتمان') + '</b></div>' +
          '<div class="summary__row"><span>المحافظة</span><b>' + esc(AREAS[o.customer.area].name) + '</b></div>' +
          '<div class="summary__row"><span>موعد التوصيل المتوقع</span><b>' + AREAS[o.customer.area].eta + '</b></div>' +
          '<div class="summary__row summary__row--total"><span>الإجمالي</span><b>' + TC.plainMoney(t.total) + '</b></div>' +
        '</div>' +

        '<div class="note-ok" style="max-width:430px;margin:20px auto 0;text-align:start">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' +
          '<span>هل لديك سؤال عن الطلب؟ راسلنا على واتساب وسنساعدك فوراً.</span>' +
        '</div>' +

        '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:24px">' +
          '<a class="btn btn--primary" href="collection.html?c=all">متابعة التسوّق</a>' +
          '<a class="btn btn--light" href="https://wa.me/' + D.shop.whatsapp + '" target="_blank" rel="noopener">تواصل عبر واتساب</a>' +
        '</div>' +
      '</div>';

    document.title = 'تم استلام طلبك | تونى كوزمتكس';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------------------------------------------------------------- boot */
  function renderEmpty() {
    $('[data-checkout-root]').innerHTML =
      '<div class="empty-state" style="margin-block:40px">' +
        TC.icon('cartEmpty') +
        '<div class="empty-state__title">لا يمكن إتمام طلب فارغ</div>' +
        '<div class="empty-state__text">أضف منتجات إلى السلة أولاً ثم ارجع لإتمام الطلب.</div>' +
        '<a class="btn btn--primary" href="collection.html?c=all">تصفّح المنتجات</a>' +
      '</div>';
  }

  function boot() {
    if (!$('[data-order-form]')) return;
    if (!TC.Cart.count()) { renderEmpty(); return; }

    form = $('[data-order-form]');
    renderSide();

    /* restore saved customer details for a faster repeat order */
    try {
      var saved = JSON.parse(localStorage.getItem('tc_cust') || '{}');
      ['name', 'phone', 'email', 'addr', 'note'].forEach(function (k) {
        if (saved[k] && form.elements[k]) form.elements[k].value = saved[k];
      });
      if (saved.area && AREAS[saved.area]) form.elements.area.value = saved.area;
    } catch (e) { /* no saved details */ }

    document.addEventListener('change', function (e) {
      if (e.target.name === 'pay') {
        pay = e.target.value;
        $$('[data-pay]').forEach(function (l) { l.classList.toggle('is-active', l.dataset.pay === pay); });
        renderSide();
      }
      if (e.target.name === 'area') {
        bad(e.target, false);
        renderSide();
      }
    });

    document.addEventListener('input', function (e) {
      if (e.target.closest('.field') && e.target.closest('.field').classList.contains('is-bad')) {
        validators().forEach(function (v) {
          if (form.querySelector(v.sel) === e.target) bad(e.target, !v.test(e.target.value));
        });
      }
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      if (!validate(true)) {
        var first = form.querySelector('.field.is-bad .input, .field.is-bad .select');
        if (first) first.focus();
        TC.toast('يرجى إكمال الحقول المطلوبة', 'err');
        return;
      }

      var data = {
        name: form.elements.name.value.trim(),
        phone: form.elements.phone.value.trim(),
        email: form.elements.email.value.trim(),
        area: form.elements.area.value,
        addr: form.elements.addr.value.trim(),
        note: form.elements.note.value.trim(),
        pay: pay
      };

      try {
        localStorage.setItem('tc_cust', JSON.stringify({
          name: data.name, phone: data.phone, email: data.email,
          addr: data.addr, note: data.note, area: data.area
        }));
      } catch (err) { /* storage unavailable */ }

      var btn = $('[data-submit]');
      btn.disabled = true;
      btn.textContent = 'جارٍ تأكيد الطلب…';

      setTimeout(function () {
        var t = totals();
        var order = saveOrder(data, t);
        TC.Cart.clear();
        sessionStorage.removeItem('tc_promo');
        renderDone(order);
        TC.toast('تم تأكيد طلبك بنجاح');
      }, 850);
    });
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
