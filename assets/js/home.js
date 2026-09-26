/* ==========================================================================
   TONY COSMETICS — home.js
   Fills the dynamic regions of the homepage.
   ========================================================================== */
(function (global) {
  'use strict';

  var TC = global.TC;
  var D = global.TCData;
  var Art = global.TCArt;
  var $ = TC.$, $$ = TC.$$, esc = TC.esc;

  /* The home page waits for the data to load, then fills its regions. */
  function run() {

    function art(o) { return Art.img(o); }

    renderHero();
    renderTicker();

    /* --------------------------------------------------------- hero + ticker
       الشرائح والشريط المتحرك يأتيان من D.content، فيمكن تعديلهما من لوحة التحكم. */
    function heroHTML() {
      var list = (D.content && D.content.hero) || [];
      if (!list.length) return '';
      return list.map(function (h) {
        var bg = Art.banner({ c1: h.c1, c2: h.c2, seed: h.seed, w: 1600, h: 700 });
        var acts = (h.actions || []).map(function (a) {
          return '<a class="btn ' + a.cls + '" href="' + a.href + '">' + esc(a.label) + '</a>';
        }).join('\n        ');
        return '<article class="hero__slide">' +
          '<img class="hero__bg" src="' + bg + '" alt="" width="1600" height="700">' +
          '<div class="hero__inner">' +
            (h.eyebrow ? '<span class="hero__eyebrow">' + h.eyebrow + '</span>' : '') +
            '<h1 class="hero__title">' + h.title + '</h1>' +
            (h.text ? '<p class="hero__text">' + h.text + '</p>' : '') +
            (acts ? '<div class="hero__actions">\n        ' + acts + '\n      </div>' : '') +
          '</div>' +
        '</article>';
      }).join('\n\n');
    }

    function renderHero() {
      var track = $('[data-hero-track]');
      if (!track) return;
      track.innerHTML = heroHTML();
      var root = track.closest('[data-hero]') || document;
      var imgs = $$('[data-art="banner"]', root);
      imgs.forEach(function (img) {
        if (img.dataset.done) return;
        img.dataset.done = '1';
        img.src = Art.banner({
          c1: img.dataset.c1, c2: img.dataset.c2,
          seed: +(img.dataset.seed || 1), w: 1600, h: 700
        });
      });
      /* the slides are now in the DOM, so we initialize the slider */
      if (typeof TC.initHero === 'function') TC.initHero();
    }

    function renderTicker() {
      var track = $('[data-ticker]');
      if (!track) return;
      var list = (D.content && D.content.ticker) || [];
      if (!list.length) return;
      /* the CSS animation is a marquee, so we duplicate the list for a seamless loop */
      var html = list.map(function (t) {
        return '<a class="ticker__item" href="' + t.href + '">' + esc(t.label) + '</a>';
      }).join('\n        ');
      track.innerHTML = html + '\n        ' + html;
    }

    /* ------------------------------------------------------ trust strip */
    var TRUST = (D.content && D.content.trust) || [];
    var trust = $('[data-trust]');
    if (trust) {
      trust.innerHTML = TRUST.map(function (f) {
        return '<div class="feature">' +
          '<span class="feature__icon">' + TC.icon(f.i) + '</span>' +
          '<span><span class="feature__title">' + esc(f.t) + '</span>' +
          '<span class="feature__text">' + esc(f.s) + '</span></span>' +
        '</div>';
      }).join('');
    }

    /* ------------------------------------------------- category circles */
    var catsWrap = $('[data-cats]');
    if (catsWrap) {
      catsWrap.innerHTML = D.categories.filter(function (c) { return !c.virtual; }).map(function (c) {
        var n = TC.productsOf(c.id).length;
        return '<a class="cat" href="' + TC.catUrl(c.id) + '">' +
          '<span class="cat__media"><img src="' + art(c.art) + '" alt="' + esc(c.name) + '" width="104" height="104" loading="lazy"></span>' +
          '<span class="cat__name">' + esc(c.name) + '</span>' +
          '<span class="cat__count">' + n + ' منتج</span>' +
        '</a>';
      }).join('');
    }

    /* ------------------------------------------------------ banner grid */
    var BANNERS = (D.content && D.content.banners) || {};
    Object.keys(BANNERS).forEach(function (k) {
      var wrap = $('[data-banners="' + k + '"]');
      if (!wrap) return;
      wrap.innerHTML = BANNERS[k].map(function (b) {
        return '<a class="banner" href="' + b.href + '" style="min-height:' + b.h + 'px">' +
          '<img class="banner__img" src="' + Art.banner({ c1: b.c1, c2: b.c2, seed: b.seed, w: 1200, h: 600 }) + '" alt="" loading="lazy">' +
          '<span class="banner__body">' +
            '<span class="banner__title">' + esc(b.t) + '</span>' +
            '<span class="banner__text">' + esc(b.s) + '</span>' +
            '<span class="btn btn--white btn--sm" style="margin-top:6px">' + esc(b.btn) + '</span>' +
          '</span>' +
        '</a>';
      }).join('');
    });

    /* --------------------------------------------- product list fillers */
    function fillList(el) {
      var cat = el.dataset.list;
      var limit = +(el.dataset.limit || 8);
      var items = TC.productsOf(cat).slice(0, limit);
      el.innerHTML = items.map(function (p) { return TC.cardHTML(p); }).join('');
    }
    $$('[data-list]').forEach(fillList);

    /* --------------------------------------------------- sale group tabs */
    $$('[data-sale-group]').forEach(function (el) {
      var cats = el.dataset.saleGroup.split(',');
      var limit = +(el.dataset.limit || 4);
      var out = [];
      cats.forEach(function (c) {
        TC.productsOf(c).forEach(function (p) {
          if (p.was && out.length < limit) out.push(p);
        });
      });
      el.innerHTML = out.map(function (p) { return TC.cardHTML(p); }).join('');
    });

    /* -------------------------------------------------------- category tiles */
    var tiles = $('[data-tiles]');
    if (tiles) {
      var layout = (D.content && D.content.tiles) || [];
      tiles.innerHTML = layout.map(function (t) {
        var c = TC.catName(t.c);
        return '<a class="tile ' + t.cls + '" href="' + TC.catUrl(t.c, t.q) + '">' +
          '<img class="tile__img" src="' + art(c.art) + '" alt="' + esc(t.label) + '" loading="lazy">' +
          '<span class="tile__body">' +
            '<span class="tile__title">' + esc(t.label) + '</span>' +
            '<span class="tile__sub">' + TC.productsOf(t.c).length + ' منتج</span>' +
          '</span>' +
        '</a>';
      }).join('');
    }

    /* -------------------------------------------------------------- brands */
    var brandsWrap = $('[data-brands]');
    if (brandsWrap) {
      var html = D.brands.map(function (b) {
        return '<a class="brands__item" href="collection.html?c=all&brand=' + b.id + '" title="' + esc(b.nameAr) + '">' + esc(b.name) + '</a>';
      }).join('');
      brandsWrap.innerHTML = html + html;
    }
  }

  if (global.TCReady) global.TCReady(run);
  else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})(window);
