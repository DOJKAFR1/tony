/* ==========================================================================
   TONY COSMETICS — app.js
   Shared runtime: icons, formatting, storage (cart / wishlist),
   header + nav + footer rendering, drawer, sliders, toasts, widgets.
   ========================================================================== */
(function (global) {
  'use strict';

  var D = global.TCData;
  var Art = global.TCArt;
  var shop = D.shop;

  /* ================================================================ utils */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function num(n) { return new Intl.NumberFormat('en-US').format(Math.round(n)); }
  function money(n) { return '<b>' + num(n) + '</b><sup>' + shop.currencySymbol + '</sup>'; }
  function plainMoney(n) { return num(n) + ' ' + shop.currencySymbol; }
  function on(root, evt, sel, fn) {
    if (typeof root === 'string') { TC.on(root, evt); return; }   /* bus subscription */
    if (!root || typeof root.addEventListener !== 'function') return;
    root.addEventListener(evt, function (e) {
      var t = e.target.closest(sel);
      if (t && root.contains(t)) fn(e, t);
    });
  }
  function qs(name, dflt) {
    var v = new URLSearchParams(location.search).get(name);
    return v === null ? (dflt === undefined ? null : dflt) : v;
  }
  function qsAll(name) {
    var v = qs(name, '');
    return v ? v.split('|').filter(Boolean) : [];
  }
  function debounce(fn, ms) {
    var t; return function () {
      var a = arguments, c = this;
      clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms || 180);
    };
  }
  function store(key, val) {
    try {
      if (val === undefined) {
        var raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      }
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) { /* private mode */ }
    return null;
  }

  /* ================================================================ icons */
  var ICONS = {
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    cart: '<circle cx="9" cy="20" r="1.6"/><circle cx="18" cy="20" r="1.6"/><path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L21 7H6"/>',
    heart: '<path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 1 0-7.1 7.1l8.8 8.8 8.8-8.8a5 5 0 0 0 0-7.1z"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    close: '<path d="M18 6L6 18M6 6l12 12"/>',
    down: '<path d="M6 9l6 6 6-6"/>',
    up: '<path d="M18 15l-6-6-6 6"/>',
    left: '<path d="M9 18l6-6-6-6"/>',
    right: '<path d="M15 18l-6-6 6-6"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
    star: '<path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5-5.9-3.1-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" fill="currentColor" stroke="none"/>',
    starO: '<path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5-5.9-3.1-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/>',
    truck: '<rect x="1" y="6" width="13" height="10" rx="1"/><path d="M14 9h4l3 3v4h-7z"/><circle cx="6" cy="18.5" r="1.8"/><circle cx="17" cy="18.5" r="1.8"/>',
    shield: '<path d="M12 2l8 3.5v6c0 5-3.4 9.2-8 10.5-4.6-1.3-8-5.5-8-10.5v-6z"/><path d="M9 12l2 2 4-4"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
    headset: '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="2" y="13" width="4" height="7" rx="1.5"/><rect x="18" y="13" width="4" height="7" rx="1.5"/><path d="M20 20a3 3 0 0 1-3 2h-3"/>',
    gift: '<rect x="2" y="8" width="20" height="4"/><path d="M4 12v9h16v-9M12 8v13"/><path d="M12 8S9 3 7 4.5 9 8 12 8zM12 8s3-5 5-3.5S15 8 12 8z"/>',
    tag: '<path d="M20.6 13.4L12 22l-9-9V3h10z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 6 10-6"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    filter: '<path d="M3 5h18M6 12h12M10 19h4"/>',
    sort: '<path d="M3 6h13M3 12h9M3 18h5M17 8l3 3 3-3M20 11V3"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    whatsapp: '<path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2z" fill="currentColor" stroke="none"/><path d="M8.5 8c.2-.4.4-.4.6-.4h.5c.2 0 .4 0 .6.5l.7 1.7c.1.2 0 .4-.1.6l-.4.5c-.1.2-.2.3 0 .6a6 6 0 0 0 2.7 2.4c.3.1.4.1.6-.1l.6-.7c.2-.2.3-.2.6-.1l1.6.8c.3.1.4.3.4.5a2 2 0 0 1-1.9 2c-1 0-2.2-.3-3.6-1.3a9 9 0 0 1-3.4-3.8c-.5-1-.6-1.9-.6-2.5 0-.6.2-1 .3-1.2z" fill="#25d366" stroke="none"/>',
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/>',
    facebook: '<path d="M15 3h-3a4 4 0 0 0-4 4v3H5v4h3v7h4v-7h3l1-4h-4V7a1 1 0 0 1 1-1h3z" fill="currentColor" stroke="none"/>',
    tiktok: '<path d="M16 3c.4 2.2 1.9 3.7 4 4v3c-1.6 0-3-.5-4-1.4V15a6 6 0 1 1-6-6c.3 0 .7 0 1 .1v3.2A2.9 2.9 0 1 0 13 15V3z" fill="currentColor" stroke="none"/>',
    zoom: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5M11 8v6M8 11h6"/>',
    box: '<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
    leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15 5 17 4 20 2c0 3-1 9-4 12-2 2-5 2-5 2z"/><path d="M2 21c0-3 1.9-5.5 5-7"/>',
    drop: '<path d="M12 2.7s6 6.6 6 10.5A6 6 0 0 1 6 13.2C6 9.3 12 2.7 12 2.7z"/>',
    flask: '<path d="M9 2h6M10 2v6L4.5 18A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-3L14 8V2"/><path d="M7.5 15h9"/>',
    perfume: '<path d="M6 21h12v-8a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2z"/><path d="M9 11V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v5M10 15h4"/>',
    smoke: '<path d="M3 18c3 0 3-3 6-3s3 3 6 3 3-3 6-3"/><path d="M5 12c2.5 0 2.5-2.5 5-2.5S12.5 12 15 12s2.5-2 4-2"/><path d="M7 7c2 0 2-2 4-2s2 2 4 2"/>',
    bear: '<circle cx="12" cy="13" r="7"/><circle cx="6.5" cy="6" r="2"/><circle cx="17.5" cy="6" r="2"/><ellipse cx="12" cy="15" rx="3" ry="2.4"/>',
    lipstick: '<path d="M9 10h6v11H9z"/><rect x="10" y="4" width="4" height="6" rx="1"/><path d="M8 21h8"/>',
    droplet: '<path d="M12 2.7s6 6.6 6 10.5A6 6 0 0 1 6 13.2C6 9.3 12 2.7 12 2.7z"/>',
    sparkle: '<path d="M12 2l1.8 5.6L19 9.4l-5.2 1.8L12 17l-1.8-5.8L5 9.4l5.2-1.8z"/><path d="M18.5 15l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    bag: '<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/>',
    percent: '<path d="M19 5L5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
    award: '<circle cx="12" cy="9" r="6"/><path d="M9 14l-2 8 5-3 5 3-2-8"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    cartEmpty: '<path d="M3 4h2.2l2.3 11.2A2 2 0 0 0 9.4 17H19a2 2 0 0 0 2-1.6L22.5 7H6"/><circle cx="10" cy="20" r="1.5"/><circle cx="19" cy="20" r="1.5"/>',
    heartBig: '<path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 1 0-7.1 7.1l8.8 8.8 8.8-8.8a5 5 0 0 0 0-7.1z"/>',
    empty: '<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3M8 11h6"/>'
  };

  function icon(name, cls) {
    var p = ICONS[name] || '';
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
      'stroke-linecap="round" stroke-linejoin="round"' + (cls ? ' class="' + cls + '"' : '') +
      ' aria-hidden="true">' + p + '</svg>';
  }
  function stars(rating) {
    var out = '<span class="stars">';
    for (var i = 1; i <= 5; i++) {
      out += '<svg viewBox="0 0 24 24" class="' + (i <= Math.round(rating) ? 'is-on' : '') + '">' + ICONS.star + '</svg>';
    }
    return out + '</span>';
  }

  /* =============================================================== catalog */
  function byId(pid) {
    for (var i = 0; i < D.products.length; i++) if (D.products[i].id === pid) return D.products[i];
    return null;
  }
  function brandName(id) {
    for (var i = 0; i < D.brands.length; i++) if (D.brands[i].id === id) return D.brands[i];
    return { id: id, name: id, nameAr: id };
  }
  function catName(id) {
    for (var i = 0; i < D.categories.length; i++) if (D.categories[i].id === id) return D.categories[i];
    return { id: id, name: id };
  }
  function imgOf(p) { return Art.img(p.art || {}); }
  function catUrl(id, extra) {
    return 'collection.html?c=' + encodeURIComponent(id) + (extra ? '&' + extra : '');
  }
  function prodUrl(p) { return 'product.html?p=' + encodeURIComponent(p.id); }

  /* Resolve a list of products for a (possibly virtual) category id. */
  function productsOf(cat) {
    if (!cat || cat === 'all') return D.products.slice();
    if (cat === 'offers') return D.products.filter(function (p) { return p.was; });
    if (cat === 'new-arrivals') return D.products.filter(function (p) {
      return p.badge === 'new' || p.tags.indexOf('جديد') > -1;
    });
    if (cat === 'best-sellers') return D.products.filter(function (p) {
      return p.badge === 'best' || p.badge === 'hot';
    }).sort(function (a, b) {
      return (b.reviews * b.rating) - (a.reviews * a.rating);
    });
    return D.products.filter(function (p) { return p.cat === cat; });
  }

  /* ================================================================ stores */
  var CART_KEY = 'tc_cart_v1';
  var WISH_KEY = 'tc_wish_v1';

  var Cart = {
    items: store(CART_KEY) || [],
    save: function () { store(CART_KEY, this.items); TC.emit('cart'); },
    add: function (pid, variant, qty) {
      qty = qty || 1;
      variant = variant || '';
      var found = null;
      for (var i = 0; i < this.items.length; i++) {
        if (this.items[i].pid === pid && this.items[i].v === variant) { found = this.items[i]; break; }
      }
      if (found) found.q = Math.min(99, found.q + qty);
      else this.items.push({ pid: pid, v: variant, q: qty, t: Date.now() });
      this.save();
    },
    setQty: function (i, q) {
      if (q <= 0) return this.remove(i);
      this.items[i].q = Math.min(99, q);
      this.save();
    },
    remove: function (i) { this.items.splice(i, 1); this.save(); },
    clear: function () { this.items = []; this.save(); },
    count: function () {
      return this.items.reduce(function (a, b) { return a + b.q; }, 0);
    },
    detailed: function () {
      return this.items.map(function (it) {
        var p = byId(it.pid) || { id: it.pid, name: 'منتج', price: 0, art: {} };
        return { it: it, p: p, line: p.price * it.q };
      }).filter(function (r) { return r.p; });
    },
    subtotal: function () {
      return this.detailed().reduce(function (a, r) { return a + r.line; }, 0);
    },
    savings: function () {
      return this.detailed().reduce(function (a, r) { return a + (r.p.was ? (r.p.was - r.p.price) * r.it.q : 0); }, 0);
    }
  };

  var Wish = {
    list: store(WISH_KEY) || [],
    save: function () { store(WISH_KEY, this.list); TC.emit('wish'); },
    has: function (pid) { return this.list.indexOf(pid) > -1; },
    toggle: function (pid) {
      var i = this.list.indexOf(pid);
      if (i > -1) { this.list.splice(i, 1); this.save(); return false; }
      this.list.unshift(pid);
      if (this.list.length > 60) this.list.pop();
      this.save();
      return true;
    },
    count: function () { return this.list.length; },
    clear: function () { this.list = []; this.save(); },
    detailed: function () {
      return this.list.map(byId).filter(Boolean);
    }
  };

  /* ================================================================ events */
  var listeners = {};
  var TC = {
    on: function (n, f) { (listeners[n] = listeners[n] || []).push(f); },
    emit: function (n, d) { (listeners[n] || []).forEach(function (f) { f(d); }); }
  };

  /* ================================================================ toast */
  function toast(msg, kind) {
    var wrap = $('[data-tc-toast]');
    if (!wrap) return;
    var t = document.createElement('div');
    t.className = 'toast' + (kind === 'err' ? ' toast--err' : '');
    t.innerHTML = '<span class="toast__icon">' + icon(kind === 'err' ? 'close' : 'check') + '</span><span>' + esc(msg) + '</span>';
    wrap.appendChild(t);
    setTimeout(function () {
      t.classList.add('is-out');
      setTimeout(function () { t.remove(); }, 320);
    }, 2600);
  }

  /* ============================================================== product card */
  function cardHTML(p, opts) {
    opts = opts || {};
    var b = brandName(p.brand);
    var badge = '';
    if (p.badge === 'sale' || (p.was && !p.badge)) badge = '<span class="badge badge--sale">-' + off(p) + '%</span>';
    else if (p.badge === 'new') badge = '<span class="badge badge--new">جديد</span>';
    else if (p.badge === 'best') badge = '<span class="badge badge--best">الأكثر مبيعاً</span>';
    else if (p.badge === 'hot') badge = '<span class="badge badge--hot">الأكثر طلباً</span>';

    if (p.stock === 0) badge = '<span class="badge badge--out">نفدت الكمية</span>';

    var price = '<span class="price"><span class="price__now">' + money(p.price) + '</span>' +
      (p.was ? '<span class="price__was">' + num(p.was) + '</span>' : '') + '</span>';

    return '' +
      '<article class="card' + (opts.cls ? ' ' + opts.cls : '') + '" data-pid="' + p.id + '">' +
        '<a class="card__media" href="' + prodUrl(p) + '" aria-label="' + esc(p.name) + '">' +
          '<img class="card__img" src="' + imgOf(p) + '" alt="' + esc(p.name) + '" loading="lazy" width="400" height="470">' +
        '</a>' +
        '<div class="card__flags">' + badge + '</div>' +
        '<button class="card__wish' + (Wish.has(p.id) ? ' is-active' : '') + '" data-wish="' + p.id + '" aria-label="أضف إلى المفضلة">' + icon('heart') + '</button>' +
        (p.stock > 0
          ? '<div class="card__quick"><button class="btn btn--primary btn--sm" data-add="' + p.id + '">' + icon('cart') + ' إضافة سريعة</button></div>'
          : '') +
        '<div class="card__body">' +
          '<span class="card__vendor">' + esc(b.name) + '</span>' +
          '<a class="card__name" href="' + prodUrl(p) + '">' + esc(p.name) + '</a>' +
          '<div class="card__meta">' + stars(p.rating) + '<span>(' + num(p.reviews) + ')</span></div>' +
          '<div class="card__foot">' + price + '</div>' +
        '</div>' +
      '</article>';
  }
  function off(p) { return p.was ? Math.round((1 - p.price / p.was) * 100) : 0; }

  /* ================================================================ header */
  /* النصوص قابلة للتعديل من لوحة التحكم (D.content.promoLines).
     {{freeShipFrom}} يُستبدل تلقائياً بحد الشحن المجاني الحالي. */
  var PROMO_TOKENS = {
    freeShipFrom: function () { return plainMoney(D.shop.freeShipFrom); },
    currency: function () { return D.shop.currency || '₪'; }
  };
  function promoLine(s) {
    return String(s == null ? '' : s).replace(/\{\{\s*(\w+)\s*\}\}/g, function (m, k) {
      var f = PROMO_TOKENS[k];
      return f ? f() : m;
    });
  }
  function promoLines() {
    var list = (D.content && D.content.promoLines) || [];
    if (!list.length) return [promoLine('{{freeShipFrom}}')];
    return list.map(promoLine);
  }


  function navItemHTML(item) {
    var isActive = isActiveNav(item);
    var h = '<li class="nav__item">';
    if (item.children) {
      h += '<a class="nav__link' + (isActive ? ' is-active' : '') + '" href="' + (item.href || '#') + '">' +
        esc(item.label) + icon('down') + '</a>';
      var grid = item.children.length > 5 ? ' dropdown__grid' : '';
      h += '<div class="dropdown' + (item.mega ? ' dropdown--mega' : '') + '">' +
        (item.mega ? '<div class="dropdown__head">تصفّح المتجر</div>' : '') +
        '<div class="' + (grid ? grid.slice(2) : '') + '">';
      item.children.forEach(function (c) {
        var p = productsOf(new URL(c.href, location.href).searchParams.get('c'));
        var n = p.length ? '<span>' + p.length + '</span>' : '';
        h += '<a class="dropdown__link" href="' + c.href + '">' + esc(c.label) + n + '</a>';
      });
      h += '</div>';
      if (item.mega) {
        h += '<div class="dropdown__promo"><span>خصم 15٪ على أول طلب</span><span>' + icon('gift') + '</span></div>';
      }
      h += '</div>';
    } else {
      h += '<a class="nav__link' + (isActive ? ' is-active' : '') + '" href="' + item.href + '"' +
        (item.hot ? ' style="color:var(--tc-sale)"' : '') + '>' + esc(item.label) + '</a>';
    }
    return h + '</li>';
  }

  function isActiveNav(item) {
    var page = location.pathname.split('/').pop() || 'index.html';
    if (item.href) {
      var f = item.href.split('?')[0];
      if (f !== page) return false;
      var q = item.href.split('?')[1] || '';
      var cur = location.search.slice(1);
      if (q && q !== cur) {
        // treat "offers"/"new-arrivals" as active only when exactly that category
        return false;
      }
    }
    if (item.children) {
      return item.children.some(function (c) {
        return c.href && c.href.split('?')[0] === page &&
          c.href.indexOf(location.search) > -1 && location.search.length > 1;
      });
    }
    return false;
  }

  function headerHTML() {
    var promo = promoLines().concat(promoLines()).map(function (l) {
      return '<div class="promo__item">' + l + '</div>';
    }).join('');

    return '' +
      /* promo bar */
      '<div class="promo"><div class="promo__track">' + promo + '</div></div>' +

      '<header class="header" id="tcHeader">' +
        '<div class="container">' +
          '<div class="header__top">' +
            '<div class="burger-box">' +
              '<button class="icon-btn" data-open-menu aria-label="القائمة">' + icon('menu') + '</button>' +
            '</div>' +
            '<a class="logo" href="index.html" aria-label="' + esc(shop.name) + '">' +
              '<span class="logo__text">' +
                '<span class="logo__name">TONY <em>COSMETICS</em></span>' +
                '<span class="logo__tag">TONY COSMETICS PS</span>' +
              '</span>' +
            '</a>' +
            '<div class="header__search">' +
              '<input class="input" id="tcSearch" type="search" autocomplete="off" placeholder="ابحث عن عطرك المفضّل..." aria-label="بحث">' +
              '<button class="header__search-btn" data-go-search aria-label="بحث">' + icon('search') + '</button>' +
              '<div class="suggest" id="tcSuggest"></div>' +
            '</div>' +
            '<div class="header__actions">' +
              '<a class="icon-btn icon-btn--label" href="#account" data-noop>' + icon('user') + '<span>حسابي</span></a>' +
              '<button class="icon-btn" data-open-wish aria-label="المفضلة">' + icon('heart') +
                '<span class="icon-btn__count" data-wish-count>0</span></button>' +
              '<button class="icon-btn" data-open-cart aria-label="عربة التسوق">' + icon('cart') +
                '<span class="icon-btn__count" data-cart-count>0</span></button>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<nav class="nav" aria-label="القائمة الرئيسية"><div class="container"><ul class="nav__list">' +
          D.nav.map(navItemHTML).join('') +
        '</ul></div></nav>' +
      '</header>';
  }

  function mobileMenuHTML() {
    var body = D.nav.map(function (item) {
      if (!item.children) {
        return '<div class="m-acc"><a class="m-acc__head" href="' + item.href + '">' + esc(item.label) + icon('left') + '</a></div>';
      }
      return '<div class="m-acc">' +
        '<button class="m-acc__head" data-acc>' + esc(item.label) + icon('down') + '</button>' +
        '<div class="m-acc__panel">' + item.children.map(function (c) {
          return '<a href="' + c.href + '">' + esc(c.label) + '</a>';
        }).join('') + '</div>' +
      '</div>';
    }).join('');

    return '<div class="overlay" data-overlay></div>' +
      '<aside class="mmenu" id="tcMmenu" aria-label="قائمة الجوال">' +
        '<div class="mmenu__head">' +
          '<span class="logo__text"><span class="logo__name" style="font-size:19px">TONY <em>COSMETICS</em></span></span>' +
          '<button class="icon-btn" data-close-menu aria-label="إغلاق">' + icon('close') + '</button>' +
        '</div>' +
        '<div class="mmenu__body">' + body +
          '<div class="m-acc"><a class="m-acc__head" href="cart.html">' + esc('عربة التسوق') + icon('left') + '</a></div>' +
          '<div class="m-acc"><a class="m-acc__head" href="contact.html">' + esc('تواصل معنا') + icon('left') + '</a></div>' +
        '</div>' +
        '<div class="mmenu__foot">' +
          '<a class="mmenu__social" href="' + shop.social.instagram + '" target="_blank" rel="noopener" aria-label="انستغرام">' + icon('instagram') + '</a>' +
          '<a class="mmenu__social" href="' + shop.social.facebook + '" target="_blank" rel="noopener" aria-label="فيسبوك">' + icon('facebook') + '</a>' +
          '<a class="mmenu__social" href="' + shop.social.tiktok + '" target="_blank" rel="noopener" aria-label="تيك توك">' + icon('tiktok') + '</a>' +
          '<a class="mmenu__social" href="https://wa.me/' + shop.whatsapp + '" target="_blank" rel="noopener" aria-label="واتساب">' + icon('whatsapp') + '</a>' +
        '</div>' +
      '</aside>';
  }

  function drawerHTML() {
    return '<aside class="drawer" id="tcDrawer" aria-label="لوحة">' +
      '<div class="drawer__head">' +
        '<span class="drawer__title" data-drawer-title>' + icon('cart') + ' عربة التسوق <span class="drawer__count" data-drawer-count>0</span></span>' +
        '<button class="icon-btn" data-close-drawer aria-label="إغلاق">' + icon('close') + '</button>' +
      '</div>' +
      '<div class="drawer__body" data-drawer-body></div>' +
      '<div class="drawer__foot" data-drawer-foot></div>' +
    '</aside>';
  }

  function mobileBarHTML() {
    return '<nav class="m-bottom" aria-label="شريط الجوال">' +
      '<a class="m-bottom__item" href="index.html">' + icon('grid') + '<span>الرئيسية</span></a>' +
      '<a class="m-bottom__item" href="collection.html?c=all">' + icon('flask') + '<span>الأقسام</span></a>' +
      '<button class="m-bottom__item" data-open-cart>' + icon('cart') + '<span>السلة</span><span class="m-bottom__count" data-cart-count>0</span></button>' +
      '<button class="m-bottom__item" data-open-wish>' + icon('heart') + '<span>المفضلة</span><span class="m-bottom__count" data-wish-count>0</span></button>' +
      '<button class="m-bottom__item" data-open-menu>' + icon('menu') + '<span>القائمة</span></button>' +
    '</nav>';
  }

  /* ================================================================ footer */
  function footerHTML() {
    var shopLinks = D.categories.filter(function (c) { return !c.virtual; }).slice(0, 7).map(function (c) {
      return '<li><a href="' + catUrl(c.id) + '">' + esc(c.name) + '</a></li>';
    }).join('');

    return '<footer class="footer">' +
      '<div class="container">' +
        '<div class="footer__top">' +
          '<div class="footer__col footer__col--about">' +
            '<span class="logo__text"><span class="logo__name">TONY <em>COSMETICS</em></span>' +
            '<span class="logo__tag">TONY COSMETICS PS</span></span>' +
            '<p class="footer__about">متجر توني كوزمتكس — وجهتك الأولى للعطور الفاخرة، مسك، دخون ومنتجات العناية بالبشرة. منتجات أصلية 100٪ وأسعار تنافسية مع شحن سريع لكل فلسطين.</p>' +
            '<div class="footer__social">' +
              '<a href="' + shop.social.instagram + '" target="_blank" rel="noopener" aria-label="انستغرام">' + icon('instagram') + '</a>' +
              '<a href="' + shop.social.facebook + '" target="_blank" rel="noopener" aria-label="فيسبوك">' + icon('facebook') + '</a>' +
              '<a href="' + shop.social.tiktok + '" target="_blank" rel="noopener" aria-label="تيك توك">' + icon('tiktok') + '</a>' +
              '<a href="https://wa.me/' + shop.whatsapp + '" target="_blank" rel="noopener" aria-label="واتساب">' + icon('whatsapp') + '</a>' +
            '</div>' +
          '</div>' +

          '<div class="footer__col">' +
            '<h4 class="footer__title">المتجر</h4>' +
            '<ul class="footer__links">' + shopLinks + '</ul>' +
          '</div>' +

          '<div class="footer__col">' +
            '<h4 class="footer__title">خدمة العملاء</h4>' +
            '<ul class="footer__links">' +
              '<li><a href="collection.html?c=offers">العروض والتخفيضات</a></li>' +
              '<li><a href="collection.html?c=new-arrivals">وصل حديثاً</a></li>' +
              '<li><a href="collection.html?c=best-sellers">الأكثر مبيعاً</a></li>' +
              '<li><a href="shipping.html">الشحن والتوصيل</a></li>' +
              '<li><a href="returns.html">الاستبدال والإرجاع</a></li>' +
              '<li><a href="contact.html">تواصل معنا</a></li>' +
            '</ul>' +
          '</div>' +

          '<div class="footer__col">' +
            '<h4 class="footer__title">تواصل معنا</h4>' +
            '<ul class="footer__contact">' +
              '<li>' + icon('phone') + '<span dir="ltr">' + esc(shop.phone) + '</span></li>' +
              '<li>' + icon('whatsapp') + '<a href="https://wa.me/' + shop.whatsapp + '" target="_blank" rel="noopener">واتساب</a></li>' +
              '<li>' + icon('mail') + '<a href="mailto:' + shop.email + '" dir="ltr">' + esc(shop.email) + '</a></li>' +
              '<li>' + icon('pin') + '<span>' + esc(shop.address) + '</span></li>' +
              '<li>' + icon('clock') + '<span>' + esc(shop.hours) + '</span></li>' +
            '</ul>' +
          '</div>' +

          '<div class="footer__col">' +
            '<h4 class="footer__title">النشرة البريدية</h4>' +
            '<p class="small muted" style="margin-bottom:12px">اشترك ليصلك كل جديد والعروض الحصرية قبل الجميع.</p>' +
            '<form class="newsletter__form" data-newsletter style="flex-direction:column">' +
              '<input class="input" type="email" required placeholder="بريدك الإلكتروني">' +
              '<button class="btn btn--primary btn--block" type="submit">اشترك الآن</button>' +
            '</form>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="footer__bottom"><div class="container footer__bottom-in">' +
        '<span class="footer__copy">© <span data-year></span> TONY COSMETICS — جميع الحقوق محفوظة</span>' +
        '<div class="footer__pay">' +
          
        '</div>' +
      '</div></div>' +
    '</footer>';
  }

  /* ============================================================== furniture */
  function widgetsHTML() {
    return '<div class="toast-wrap" data-tc-toast></div>' +
      '<a class="wa-float" href="https://wa.me/' + shop.whatsapp + '?text=' +
        encodeURIComponent(shop.whatsappText) + '" target="_blank" rel="noopener" aria-label="تواصل عبر واتساب">' + icon('whatsapp') + '</a>' +
      '<button class="back-top" data-back-top aria-label="العودة للأعلى">' + icon('up') + '</button>';
  }

  /* ============================================================== mounting */
  function mount() {
    var h = $('[data-tc-header]');
    if (h) h.innerHTML = headerHTML() + mobileMenuHTML() + drawerHTML() + mobileBarHTML();
    var f = $('[data-tc-footer]');
    if (f) f.outerHTML = footerHTML() + widgetsHTML();
    var y = $('[data-year]');
    if (y) y.textContent = new Date().getFullYear();
  }

  /* ================================================================ drawer */
  var drawerMode = 'cart';

  function freeShipBlock() {
    var sub = Cart.subtotal();
    var left = shop.freeShipFrom - sub;
    var pct = Math.max(0, Math.min(100, (sub / shop.freeShipFrom) * 100));
    return '<div class="free-ship">' +
      '<div class="free-ship__text">' + (left > 0
        ? 'باقي <b>' + plainMoney(left) + '</b> للحصول على شحن مجاني'
        : '🎉 تهانينا! حصلت على <b>شحن مجاني</b>') + '</div>' +
      '<div class="free-ship__bar"><div class="free-ship__fill" style="width:' + pct + '%"></div></div>' +
    '</div>';
  }

  function renderDrawer() {
    var body = $('[data-drawer-body]');
    var foot = $('[data-drawer-foot]');
    var title = $('[data-drawer-title]');
    var count = $('[data-drawer-count]');
    if (!body) return;

    if (drawerMode === 'wish') {
      var w = Wish.detailed();
      if (title) title.innerHTML = icon('heart') + ' المفضلة <span class="drawer__count">' + w.length + '</span>';
      body.innerHTML = w.length
        ? w.map(function (p, i) {
            return cartRowHTML({ it: { pid: p.id, v: '', q: 1 }, p: p, line: p.price }, true, i);
          }).join('')
        : emptyCartHTML('قائمة المفضلة فارغة', 'أضف المنتجات التي تعجبك لتجدها هنا لاحقاً.');
      if (foot) {
        foot.innerHTML = w.length
          ? '<div class="drawer__actions"><button class="btn btn--primary" data-add-all-wish>' +
            icon('cart') + ' إضافة الكل إلى السلة</button></div>'
          : '<div class="drawer__actions"><a class="btn btn--light" href="collection.html?c=all">تصفّح المنتجات</a></div>';
      }
      return;
    }

    var rows = Cart.detailed();
    if (title) title.innerHTML = icon('cart') + ' عربة التسوق <span class="drawer__count">' + Cart.count() + '</span>';
    body.innerHTML = rows.length
      ? freeShipBlock() + rows.map(function (r, i) { return cartRowHTML(r, false, i); }).join('')
      : emptyCartHTML('عربة التسوق فارغة', 'لم تقم بإضافة أي منتجات بعد.');

    if (foot) {
      if (rows.length) {
        foot.innerHTML =
          '<div class="drawer__line"><span>المجموع الفرعي</span><b>' + plainMoney(Cart.subtotal()) + '</b></div>' +
          (Cart.savings() > 0 ? '<div class="drawer__line" style="color:var(--tc-sale);font-weight:700"><span>وفّرت</span><span>-' + plainMoney(Cart.savings()) + '</span></div>' : '') +
          '<div class="drawer__line"><span>الشحن</span><span class="muted">يُحتسب عند الدفع</span></div>' +
          '<div class="drawer__actions">' +
            '<a class="btn btn--primary" href="cart.html">إتمام الطلب</a>' +
            '<button class="btn btn--light" data-go-checkout>الدفع السريع</button>' +
          '</div>';
      } else {
        foot.innerHTML = '<div class="drawer__actions"><a class="btn btn--primary" href="collection.html?c=all">ابدأ التسوّق</a></div>';
      }
    }
  }

  function emptyCartHTML(t, s) {
    return '<div class="cart-empty">' + icon('cartEmpty') +
      '<div class="cart-empty__title">' + esc(t) + '</div>' +
      '<div class="cart-empty__text">' + esc(s) + '</div>' +
      '<a class="btn btn--primary" href="collection.html?c=all">تصفّح المنتجات</a></div>';
  }

  function cartRowHTML(r, isWish, i) {
    var p = r.p;
    return '<div class="cart-row" data-row="' + (i || 0) + '" data-pid="' + p.id + '">' +
      '<a class="cart-row__media" href="' + prodUrl(p) + '"><img src="' + imgOf(p) + '" alt="' + esc(p.name) + '" width="74" height="84"></a>' +
      '<div class="cart-row__body">' +
        '<a class="cart-row__name" href="' + prodUrl(p) + '">' + esc(p.name) + '</a>' +
        (r.it.v ? '<span class="cart-row__variant">' + esc(r.it.v) + '</span>' : '') +
        '<div class="cart-row__foot">' +
          (isWish ? '' :
            '<div class="qty">' +
              '<button class="qty__btn" data-dec aria-label="إنقاص">' + icon('minus') + '</button>' +
              '<input class="qty__input" type="text" inputmode="numeric" value="' + r.it.q + '" data-qty aria-label="الكمية">' +
              '<button class="qty__btn" data-inc aria-label="زيادة">' + icon('plus') + '</button>' +
            '</div>') +
          '<span class="cart-row__price">' + plainMoney(p.price) + '</span>' +
        '</div>' +
      '</div>' +
      '<button class="cart-row__rm" data-rm aria-label="إزالة">' + icon('close') + '</button>' +
    '</div>';
  }

  function syncBadges() {
    var c = Cart.count(), w = Wish.count();
    $$('[data-cart-count]').forEach(function (n) {
      n.textContent = c;
      n.classList.toggle('is-active', c > 0);
    });
    $$('[data-wish-count]').forEach(function (n) {
      n.textContent = w;
      n.classList.toggle('is-active', w > 0);
    });
  }

  function openDrawer(mode) {
    drawerMode = mode || 'cart';
    renderDrawer();
    var d = $('#tcDrawer');
    if (!d) return;
    d.classList.add('is-open');
    $('.overlay').classList.add('is-open');
    document.body.classList.add('is-locked');
  }
  function closeAll() {
    $$('.drawer, .mmenu').forEach(function (n) { n.classList.remove('is-open'); });
    var o = $('.overlay'); if (o) o.classList.remove('is-open');
    document.body.classList.remove('is-locked');
  }

  /* ============================================================== sliders */
  function initHero() {
    $$('[data-hero]').forEach(function (root) {
      var track = $('.hero__track', root);
      var slides = $$('.hero__slide', track);
      if (slides.length < 2) return;
      var dotsWrap = $('.hero__dots', root);
      dotsWrap.innerHTML = slides.map(function (_, i) {
        return '<button class="hero__dot' + (i === 0 ? ' is-active' : '') + '" data-go="' + i + '" aria-label="الشريحة ' + (i + 1) + '"></button>';
      }).join('');

      var idx = 0, timer;
      function go(i) {
        idx = (i + slides.length) % slides.length;
        track.scrollTo({ left: slides[idx].offsetLeft * (idx === 0 ? 1 : 1), behavior: 'smooth' });
        /* offsetLeft is relative to the padding box in RTL; use scrollLeft directly */
        var target = slides[idx].offsetLeft;
        if (getComputedStyle(root).direction === 'rtl' && track.scrollLeft < 0) {
          track.scrollTo({ left: -target, behavior: 'smooth' });
        } else {
          track.scrollTo({ left: target, behavior: 'smooth' });
        }
        $$('.hero__dot', dotsWrap).forEach(function (d, j) { d.classList.toggle('is-active', j === idx); });
      }
      function play() { clearInterval(timer); timer = setInterval(function () { go(idx + 1); }, 5200); }

      root.addEventListener('click', function (e) {
        var b = e.target.closest('[data-go]');
        if (b) { go(+b.dataset.go); play(); return; }
        if (e.target.closest('[data-hero-prev]')) { go(idx - 1); play(); }
        if (e.target.closest('[data-hero-next]')) { go(idx + 1); play(); }
      });

      track.addEventListener('scroll', debounce(function () {
        var best = 0, bestD = Infinity;
        slides.forEach(function (s, i) {
          var d = Math.abs(s.offsetLeft - Math.abs(track.scrollLeft));
          if (d < bestD) { bestD = d; best = i; }
        });
        idx = best;
        $$('.hero__dot', dotsWrap).forEach(function (d, j) { d.classList.toggle('is-active', j === idx); });
      }, 90));

      /* keyboard */
      root.setAttribute('tabindex', '0');
      root.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowLeft') { go(idx + 1); play(); }
        if (e.key === 'ArrowRight') { go(idx - 1); play(); }
      });

      play();
    });
  }

  function initScrollers() {
    $$('[data-scroller]').forEach(function (root) {
      var track = $('.scroller__track', root);
      var prev = $('.scroller__nav--prev', root);
      var next = $('.scroller__nav--next', root);
      if (!track) return;
      function step() {
        var first = track.firstElementChild;
        return first ? first.getBoundingClientRect().width + 16 : 320;
      }
      function sync() {
        var max = Math.abs(track.scrollWidth - track.clientWidth) - 1;
        var cur = Math.abs(track.scrollLeft);
        if (prev) prev.disabled = cur <= 1;
        if (next) next.disabled = cur >= max;
      }
      if (prev) prev.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: 'smooth' }); });
      if (next) next.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: 'smooth' }); });
      track.addEventListener('scroll', debounce(sync, 80));
      window.addEventListener('resize', debounce(sync, 150));
      sync();
    });
  }

  function initAccordions() {
    on(document, 'click', '[data-acc]', function (e, t) {
      t.closest('.m-acc').classList.toggle('is-open');
    });
    on(document, 'click', '.acc__head', function (e, t) {
      t.closest('.acc__item').classList.toggle('is-open');
    });
    on(document, 'click', '.fblock__head', function (e, t) {
      t.closest('.fblock').classList.toggle('is-open');
    });
  }

  function initQty() {
    on(document, 'click', '[data-inc]', function (e, t) {
      var wrap = t.closest('.qty');
      var input = $('[data-qty]', wrap);
      var row = t.closest('[data-row]');
      input.value = Math.min(99, (+input.value || 1) + 1);
      if (row) Cart.setQty(+row.dataset.row, +input.value);
    });
    on(document, 'input', '[data-qty]', function (e, t) {
      var row = t.closest('[data-row]');
      if (!row) return;
      var v = Math.max(1, Math.min(99, parseInt(t.value, 10) || 1));
      Cart.setQty(+row.dataset.row, v);
    });
    on(document, 'click', '[data-dec]', function (e, t) {
      var wrap = t.closest('.qty');
      var input = $('[data-qty]', wrap);
      var row = t.closest('[data-row]');
      var v = (+input.value || 1) - 1;
      input.value = Math.max(1, v);
      if (row) Cart.setQty(+row.dataset.row, v);
    });
    on(document, 'click', '[data-rm]', function (e, t) {
      var row = t.closest('[data-row]');
      if (!row) return;
      var i = +row.dataset.row;
      if (drawerMode === 'wish') {
        var pid = row.dataset.pid || Wish.list[i];
        if (Wish.has(pid)) {
          Wish.toggle(pid);
          toast('تمت الإزالة من المفضلة');
        }
      } else {
        Cart.remove(i);
        toast('تمت إزالة المنتج من السلة');
      }
    });
  }

  function initTabs() {
    on(document, 'click', '[data-tab]', function (e, t) {
      var group = t.closest('[data-tabs]');
      $$('[data-tab]', group).forEach(function (b) { b.classList.toggle('is-active', b === t); });
      var scope = group.parentElement;
      $$('[data-tab-panel]', scope).forEach(function (p) {
        p.classList.toggle('is-active', p.dataset.tabPanel === t.dataset.tab);
      });
    });
  }

  function initCountdown() {
    $$('[data-countdown]').forEach(function (root) {
      var end = new Date(root.dataset.countdown).getTime();
      if (isNaN(end)) return;
      var units = { d: $('[data-cd-d]', root), h: $('[data-cd-h]', root), m: $('[data-cd-m]', root), s: $('[data-cd-s]', root) };
      function pad(n) { return n < 10 ? '0' + n : '' + n; }
      function tick() {
        var diff = end - Date.now();
        if (diff <= 0) diff = 0;
        var sec = Math.floor(diff / 1000);
        if (units.d) units.d.textContent = pad(Math.floor(sec / 86400));
        if (units.h) units.h.textContent = pad(Math.floor(sec / 3600) % 24);
        if (units.m) units.m.textContent = pad(Math.floor(sec / 60) % 60);
        if (units.s) units.s.textContent = pad(sec % 60);
      }
      tick();
      setInterval(tick, 1000);
    });
  }

  /* ================================================================ search */
  function searchProducts(q) {
    q = String(q || '').trim().toLowerCase();
    if (q.length < 2) return [];
    return D.products.filter(function (p) {
      var b = brandName(p.brand);
      return (p.name + ' ' + b.name + ' ' + b.nameAr + ' ' + catName(p.cat).name + ' ' + p.tags.join(' ')).toLowerCase().indexOf(q) > -1;
    }).slice(0, 8);
  }

  function initSearch() {
    var input = $('#tcSearch');
    var box = $('#tcSuggest');
    if (!input || !box) return;

    function render() {
      var v = input.value;
      if (v.trim().length < 2) { box.classList.remove('is-open'); box.innerHTML = ''; return; }
      var res = searchProducts(v);
      box.innerHTML = res.length
        ? res.map(function (p) {
            return '<a class="suggest__item" href="' + prodUrl(p) + '">' +
              '<img src="' + imgOf(p) + '" alt="" width="40" height="40">' +
              '<span style="flex:1;min-width:0">' +
                '<span class="suggest__name">' + esc(p.name) + '</span><br>' +
                '<span class="suggest__price">' + plainMoney(p.price) + '</span>' +
              '</span></a>';
          }).join('')
        : '<div class="suggest__empty">لا توجد نتائج لـ «' + esc(v) + '»</div>';
      box.classList.add('is-open');
    }

    input.addEventListener('input', debounce(render, 160));
    input.addEventListener('focus', render);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); location.href = 'search.html?q=' + encodeURIComponent(input.value); }
      if (e.key === 'Escape') { box.classList.remove('is-open'); }
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.header__search')) box.classList.remove('is-open');
    });
    on(document, 'click', '[data-go-search]', function () {
      if (input.value.trim()) location.href = 'search.html?q=' + encodeURIComponent(input.value);
      else input.focus();
    });
  }

  /* ========================================================= global events */
  function initGlobal() {
    on(document, 'click', '[data-open-cart]', function (e) { e.preventDefault(); openDrawer('cart'); });
    on(document, 'click', '[data-open-wish]', function (e) { e.preventDefault(); openDrawer('wish'); });
    on(document, 'click', '[data-open-menu]', function (e) {
      e.preventDefault();
      var m = $('#tcMmenu'); if (!m) return;
      m.classList.add('is-open');
      $('.overlay').classList.add('is-open');
      document.body.classList.add('is-locked');
    });
    on(document, 'click', '[data-close-menu],[data-close-drawer]', closeAll);
    on(document, 'click', '[data-overlay]', closeAll);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); });

    on(document, 'click', '[data-add]', function (e, t) {
      var p = byId(t.dataset.add);
      if (!p) return;
      if (p.stock === 0) { toast('نفدت الكمية من هذا المنتج', 'err'); return; }
      Cart.add(p.id, (p.variants && p.variants[0]) || '', 1);
      toast('أُضيف «' + p.name + '» إلى السلة');
      openDrawer('cart');
    });

    on(document, 'click', '[data-wish]', function (e, t) {
      e.preventDefault();
      var p = byId(t.dataset.wish);
      var added = Wish.toggle(t.dataset.wish);
      t.classList.toggle('is-active', added);
      toast(added ? 'أُضيف إلى المفضلة' : 'أُزيل من المفضلة');
      if (p) renderDrawer();
    });

    on(document, 'click', '[data-add-all-wish]', function () {
      Wish.list.slice().forEach(function (pid) {
        var p = byId(pid);
        if (p && p.stock > 0) Cart.add(pid, (p.variants && p.variants[0]) || '', 1);
      });
      Wish.clear();
      toast('تمت إضافة كل المفضلة إلى السلة');
      openDrawer('cart');
    });

    on(document, 'click', '[data-go-checkout]', function () {
      var name = (qs('name') || '').trim();
      var phone = (qs('phone') || '').trim();
      var city = (qs('city') || '').trim();
      if (!name || !phone || !city) {
        toast('عبّئ الاسم ورقم الهاتف والمدينة', 'err');
        setTimeout(function () { location.href = 'checkout.html'; }, 700);
        return;
      }
      Cart.clear();
      location.href = 'checkout.html';
    });

    on(document, 'click', '[data-noop]', function (e) {
      e.preventDefault();
      toast('قريباً — هذه الصفحة ستتوفر لاحقاً');
    });

    on(document, 'submit', '[data-newsletter]', function (e) {
      e.preventDefault();
      e.target.reset();
      toast('شكراً لك! تم تسجيل بريدك بنجاح');
    });

    on(document, 'click', '[data-copy]', function (e, t) {
      var txt = t.dataset.copy;
      if (navigator.clipboard) navigator.clipboard.writeText(txt);
      toast('تم نسخ الكود: ' + txt);
    });

    /* sticky header shadow */
    var hdr = $('#tcHeader');
    if (hdr) {
      var onScroll = function () {
        hdr.classList.toggle('is-stuck', window.scrollY > 8);
        var bt = $('[data-back-top]');
        if (bt) bt.classList.toggle('is-show', window.scrollY > 600);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }
    on(document, 'click', '[data-back-top]', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });

    /* live badge sync */
    TC.on('cart', function () { syncBadges(); if (drawerMode === 'cart') renderDrawer(); });
    TC.on('wish', function () { syncBadges(); if (drawerMode === 'wish') renderDrawer(); });
    syncBadges();
  }

  /* =============================================================== exports */
  global.TC = {
    $: $, $$: $$, on: on, qs: qs, qsAll: qsAll, esc: esc,
    num: num, money: money, plainMoney: plainMoney, debounce: debounce,
    icon: icon, stars: stars,
    D: D, Art: Art, shop: shop,
    byId: byId, brandName: brandName, catName: catName,
    imgOf: imgOf, catUrl: catUrl, prodUrl: prodUrl, productsOf: productsOf,
    off: off, cardHTML: cardHTML, emptyCartHTML: emptyCartHTML, cartRowHTML: cartRowHTML,
    Cart: Cart, Wish: Wish,
    toast: toast, openDrawer: openDrawer, closeAll: closeAll, renderDrawer: renderDrawer,
    searchProducts: searchProducts,
    initHero: initHero,
    on: on, emit: function (n, d) { TC.emit(n, d); },
    bannerArt: function (o) { return Art.banner(o); }
  };

  /* ================================================================= boot */
  function boot() {
    mount();
    initGlobal();
    initAccordions();
    initQty();
    initTabs();
    initCountdown();
    initHero();
    initScrollers();
    initSearch();
    document.documentElement.classList.add('is-ready');
  }

  /*Boot is the last thing to run (priority 200) so that the page scripts
    have already filled their regions before the page becomes visible.
    If store.js is not loaded, we fall back to the old DOMContentLoaded. */
  function whenDom(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }
  if (global.TCReady) global.TCReady(function () { whenDom(boot); }, 200);
  else whenDom(boot);
})(window);
