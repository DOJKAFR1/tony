/* ==========================================================================
   TONY COSMETICS — product.js
   Product detail page: gallery, variants, buy box, specs, reviews, related.
   ========================================================================== */
(function (global) {
  'use strict';

  var TC = global.TC;
  var D = global.TCData;
  var Art = global.TCArt;
  var $ = TC.$, $$ = TC.$$, esc = TC.esc;

  var pid = TC.qs('p', '') || (D.products[0] && D.products[0].id);
  var P = TC.byId(pid);
  if (!P) P = D.products[0];

  var selected = (P.variants && P.variants[0]) || '';
  var qty = 1;

  /* ---------------------------------------------------------- gallery art */
  /* each product gets 4 shots: default + palette swaps + zoom crop */
  function shots() {
    var a = P.art || {};
    return [
      Art.img(a),
      Art.img({ shape: a.shape, c1: TCArt.lighten(a.c1 || '#d94b8a', 0.28), c2: a.c2, bg: '#faf4f7' }),
      Art.img({ shape: a.shape, c1: a.c2 || '#b23a6d', c2: a.c1 || '#d94b8a', bg: '#faf4f7' }),
      Art.img({ shape: a.shape, c1: a.c1 || '#d94b8a', c2: a.c2, bg: '#fdeef4', tag: TC.brandName(P.brand).name })
    ];
  }

  function stockClass() {
    if (P.stock === 0) return 'stock--out';
    if (P.stock <= 8) return 'stock--low';
    return '';
  }
  function stockText() {
    if (P.stock === 0) return 'نفدت الكمية — أبلغني عند التوفّر';
    if (P.stock <= 8) return 'بقي ' + P.stock + ' قطع فقط — سارّع بالطلب';
    return 'متوفر في المخزون — جاهز للشحن';
  }

  /* ------------------------------------------------------------------ main */
  function renderMain() {
    var b = TC.brandName(P.brand);
    var cat = TC.catName(P.cat);
    var imgs = shots();
    var off = TC.off(P);

    var badges = '';
    if (P.badge === 'sale' || (P.was && !P.badge)) badges += '<span class="badge badge--sale">خصم ' + off + '%</span>';
    if (P.badge === 'new') badges += '<span class="badge badge--new">جديد</span>';
    if (P.badge === 'best') badges += '<span class="badge badge--best">الأكثر مبيعاً</span>';
    if (P.badge === 'hot') badges += '<span class="badge badge--hot">الأكثر طلباً</span>';

    var priceHTML =
      '<span class="price__now">' + TC.money(P.price) + '</span>' +
      (P.was ? '<span class="price__was">' + TC.num(P.was) + '</span>' : '') +
      (off ? '<span class="price__off">وفّر ' + off + '%</span>' : '');

    $('[data-crumbs]').innerHTML =
      '<a href="index.html">الرئيسية</a>' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg>' +
      '<a href="' + TC.catUrl('all') + '">المتجر</a>' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg>' +
      '<a href="' + TC.catUrl(P.cat) + '">' + esc(cat.name) + '</a>' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg>' +
      '<span class="crumbs__now">' + esc(P.name) + '</span>';

    $('[data-product]').innerHTML =
      /* ---------- gallery ---------- */
      '<div class="gallery">' +
        '<div class="gallery__main" data-zoom>' +
          '<img src="' + imgs[0] + '" alt="' + esc(P.name) + '" id="mainImg" width="600" height="630">' +
          '<div class="gallery__flags">' + badges + '</div>' +
        '</div>' +
        '<div class="gallery__thumbs">' +
          imgs.map(function (s, i) {
            return '<button class="gallery__thumb' + (i === 0 ? ' is-active' : '') + '" data-thumb="' + i + '" aria-label="صورة ' + (i + 1) + '">' +
              '<img src="' + s + '" alt="" width="76" height="76" loading="lazy"></button>';
          }).join('') +
        '</div>' +
      '</div>' +

      /* ---------- info ---------- */
      '<div class="pinfo">' +
        '<a class="pinfo__vendor" href="collection.html?c=all&brand=' + b.id + '">' + esc(b.name) + '</a>' +
        '<h1 class="pinfo__title">' + esc(P.name) + '</h1>' +
        '<div class="pinfo__rating">' + TC.stars(P.rating) +
          '<b>' + P.rating + '</b>' +
          '<a href="#reviews" data-jump-reviews>' + TC.num(P.reviews) + ' تقييم</a>' +
        '</div>' +

        '<div class="pinfo__price">' + priceHTML + '</div>' +

        '<div class="stock ' + stockClass() + '"><span class="stock__dot"></span>' + esc(stockText()) + '</div>' +

        (P.variants && P.variants.length > 1
          ? '<div class="opt">' +
              '<div class="opt__label">المقاس / الخيار <span data-variant-label>' + esc(selected) + '</span></div>' +
              '<div class="swatches" data-variants>' +
                P.variants.map(function (v, i) {
                  return '<button class="swatch' + (i === 0 ? ' is-active' : '') + '" data-variant="' + esc(v) + '">' + esc(v) + '</button>';
                }).join('') +
              '</div>' +
            '</div>'
          : '') +

        '<div class="pinfo__buy">' +
          '<div class="qty">' +
            '<button class="qty__btn" data-p-dec aria-label="إنقاص">' + TC.icon('minus') + '</button>' +
            '<input class="qty__input" type="text" inputmode="numeric" value="1" data-p-qty aria-label="الكمية">' +
            '<button class="qty__btn" data-p-inc aria-label="زيادة">' + TC.icon('plus') + '</button>' +
          '</div>' +
          '<button class="btn btn--primary btn--lg" data-buy' + (P.stock === 0 ? ' disabled' : '') + '>' +
            TC.icon('cart') + (P.stock === 0 ? ' نفدت الكمية' : ' أضف إلى السلة') +
          '</button>' +
          '<button class="icon-btn' + (TC.Wish.has(P.id) ? ' is-active' : '') + '" data-p-wish aria-label="المفضلة">' + TC.icon('heart') + '</button>' +
        '</div>' +

        '<button class="btn btn--dark btn--block btn--lg" style="margin-bottom:18px" data-buy-now' + (P.stock === 0 ? ' disabled' : '') + '>' +
          TC.icon('bag') + ' شراء الآن</button>' +

        '<div class="ship-list">' +
          '<div class="ship-list__item">' + TC.icon('truck') +
            '<span><b>شحن سريع لكل فلسطين</b><span>خلال 24 – 72 ساعة · مجاني للطلبات فوق ' + TC.plainMoney(D.shop.freeShipFrom) + '</span></span></div>' +
          '<div class="ship-list__item">' + TC.icon('refresh') +
            '<span><b>إرجاع مجاني خلال 14 يوم</b><span>إذا لم يعجبك المنتج نسترجعه من بابك</span></span></div>' +
          '<div class="ship-list__item">' + TC.icon('shield') +
            '<span><b>منتج أصلي 100٪</b><span>ضمان الجودة والاستبدال في حال وجود عيب</span></span></div>' +
          '<div class="ship-list__item">' + TC.icon('card') +
            '<span><b>الدفع عند الاستلام أو بطاقة</b><span>آمن 100٪ · لوجستيات محلية معتمدة</span></span></div>' +
        '</div>' +

        '<div class="acc" style="margin-top:22px">' +
          accItem('وصف المنتج', '<ul style="list-style:none">' + P.desc.map(function (d) {
            return '<li>• ' + esc(d) + '</li>';
          }).join('') + '</ul>', true) +
          accItem('المواصفات', '<table><tbody>' + P.specs.map(function (s) {
            return '<tr><th style="width:38%">' + esc(s[0]) + '</th><td>' + esc(s[1]) + '</td></tr>';
          }).join('') + '</tbody></table>') +
          accItem('الشحن والتوصيل', shipCopy()) +
          accItem('الاستبدال والإرجاع', returnsCopy()) +
        '</div>' +
      '</div>';

    document.title = P.name + ' | تونى كوزمتكس';
  }

  function accItem(title, body, open) {
    return '<div class="acc__item' + (open ? ' is-open' : '') + '">' +
      '<button class="acc__head">' + esc(title) +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>' +
      '</button>' +
      '<div class="acc__panel">' + body + '</div>' +
    '</div>';
  }

  function shipCopy() {
    return '<p>نشحن جميع الطلبات من رام الله خلال 24 ساعة عمل. مدة التوصيل:</p>' +
      '<ul><li>• رام الله والقدس: خلال 24 ساعة (رسوم 15 شيكل)</li>' +
      '<li>• باقي محافظات فلسطين : خلال 48 – 72 ساعة (رسوم 20 شيكل)</li>' +
      '<li>• الطلبات فوق ' + TC.plainMoney(D.shop.freeShipFrom) + ' : الشحن مجاني</li></ul>' +
      '<p>يمكن الدفع عند الاستلام أو ببطاقة الائتمان عبر بوابة دفع آمنة.</p>';
  }

  function returnsCopy() {
    return '<p>يمكنك استبدال أو إرجاع المنتج خلال <b>14 يوماً</b> من تاريخ الاستلام بشرط:</p>' +
      '<ul><li>• أن يكون المنتج بحالته الأصلية وبغلافه.</li>' +
      '<li>• مرفقاً الفاتورة ورقم الطلب.</li>' +
      '<li>• ألّا يكون منتجاً تم فتحه للاستخدام الشخصي.</li></ul>' +
      '<p>في حال وصول المنتج تالفاً أو غير مطابق، تواصل معنا خلال 48 ساعة عبر واتساب وسنتولّى الباقي.</p>';
  }

  /* --------------------------------------------------------------- reviews */
  function renderReviews() {
    var dist = [5, 4, 3, 2, 1].map(function (n) {
      var w = { 5: 0.62, 4: 0.24, 3: 0.09, 2: 0.03, 1: 0.02 }[n];
      return { n: n, pct: Math.round(w * 100) };
    });

    var list = D.reviews.slice(0, 5).map(function (r, i) {
      return '<article class="review-item">' +
        '<div class="review-item__head">' +
          '<span class="review-item__av">' + esc(r.name.charAt(0)) + '</span>' +
          '<span><span class="review-item__name">' + esc(r.name) + '</span><br>' +
          '<span class="review-item__date">مشترٍ موثّق · ' + (i + 1) + ' أسبوع مضت</span></span>' +
          '<span class="spacer"></span>' + TC.stars(r.rating) +
        '</div>' +
        '<p class="review-item__text">' + esc(r.text) + '</p>' +
      '</article>';
    }).join('');

    $('[data-reviews]').innerHTML =
      '<div class="container">' +
        '<div class="section-head"><div><h2 class="section-head__title h-lg" id="reviews">تقييمات العملاء</h2>' +
        '<p class="section-head__sub">تقييمات حقيقية من عملائنا في فلسطين</p></div></div>' +
        '<div class="acc is-open" style="border-radius:16px;padding:20px">' +
          '<div class="review-sum">' +
            '<div class="review-sum__score">' +
              '<div class="review-sum__num">' + P.rating + '</div>' +
              '<div class="review-sum__stars">' + TC.stars(P.rating) + '</div>' +
              '<div class="review-sum__count">بناءً على ' + TC.num(P.reviews) + ' تقييم</div>' +
            '</div>' +
            '<div class="review-bars">' +
              dist.map(function (d) {
                return '<div class="review-bar"><span>' + d.n + ' نجوم</span>' +
                  '<span class="review-bar__track"><span class="review-bar__fill" style="width:' + d.pct + '%"></span></span>' +
                  '<span class="fcount">' + d.pct + '%</span></div>';
              }).join('') +
            '</div>' +
          '</div>' +
          '<hr style="border:0;border-top:1px solid var(--tc-border-soft);margin:20px 0">' +
          list +
          '<div style="text-align:center;margin-top:18px">' +
            '<button class="btn btn--light btn--sm" data-jump-reviews>اكتب تقييمك</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  /* --------------------------------------------------------------- related */
  function renderRelated() {
    var pool = D.products.filter(function (p) {
      return p.id !== P.id && (p.cat === P.cat || p.brand === P.brand);
    });
    if (pool.length < 4) {
      D.products.forEach(function (p) {
        if (p.id !== P.id && pool.indexOf(p) === -1) pool.push(p);
      });
    }
    $('[data-related]').innerHTML = pool.slice(0, 8).map(function (p) { return TC.cardHTML(p); }).join('');
    $('[data-cat-link]').href = TC.catUrl(P.cat);
  }

  /* ------------------------------------------------------------------ wire */
  function setQty(v) {
    qty = Math.max(1, Math.min(P.stock || 99, v));
    var input = $('[data-p-qty]');
    if (input) input.value = qty;
  }

  function buy(now) {
    if (P.stock === 0) { TC.toast('نفدت الكمية من هذا المنتج', 'err'); return; }
    TC.Cart.add(P.id, selected, qty);
    TC.toast('أُضيف «' + P.name + '» إلى السلة');
    if (now) {
      setTimeout(function () { location.href = 'cart.html'; }, 500);
    } else {
      TC.openDrawer('cart');
    }
  }

  function boot() {
    if (!$('[data-product]')) return;
    renderMain();
    renderReviews();
    renderRelated();

    document.addEventListener('click', function (e) {
      var th = e.target.closest('[data-thumb]');
      if (th) {
        var imgs = shots();
        $('#mainImg').src = imgs[+th.dataset.thumb];
        $$('[data-thumb]').forEach(function (b) { b.classList.toggle('is-active', b === th); });
        return;
      }
      var v = e.target.closest('[data-variant]');
      if (v) {
        selected = v.dataset.variant;
        $$('[data-variant]').forEach(function (b) { b.classList.toggle('is-active', b === v); });
        var lbl = $('[data-variant-label]');
        if (lbl) lbl.textContent = selected;
        return;
      }
      if (e.target.closest('[data-p-inc]')) setQty(qty + 1);
      if (e.target.closest('[data-p-dec]')) setQty(qty - 1);
      if (e.target.closest('[data-buy]')) buy(false);
      if (e.target.closest('[data-buy-now]')) buy(true);
      if (e.target.closest('[data-p-wish]')) {
        var added = TC.Wish.toggle(P.id);
        e.target.closest('[data-p-wish]').classList.toggle('is-active', added);
        TC.toast(added ? 'أُضيف إلى المفضلة' : 'أُزيل من المفضلة');
      }
      if (e.target.closest('[data-jump-reviews]')) {
        e.preventDefault();
        var r = $('[data-reviews]');
        if (r) window.scrollTo({ top: r.offsetTop - 100, behavior: 'smooth' });
        else TC.toast('شكراً لك! قسم التقييمات سيتوفر قريباً');
      }
    });

    document.addEventListener('change', function (e) {
      if (e.target.closest('[data-p-qty]')) setQty(parseInt(e.target.value, 10) || 1);
    });

    var zoom = $('[data-zoom]');
    if (zoom) {
      zoom.addEventListener('click', function () { zoom.classList.toggle('is-zoom'); });
      zoom.style.cursor = 'zoom-in';
    }
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
