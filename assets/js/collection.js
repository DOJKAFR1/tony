/* ==========================================================================
   TONY COSMETICS — collection.js
   Listing / search page: faceted filters, sorting, pagination, URL sync.
   Shared by collection.html and search.html.
   ========================================================================== */
(function (global) {
  'use strict';

  var TC = global.TC;
  var D = global.TCData;
  var $ = TC.$, $$ = TC.$$, esc = TC.esc;

  var PER_PAGE = 12;
  var isSearchPage = /search\.html$/.test(location.pathname);

  /* ---------------------------------------------------------------- state */
  var state = {
    q: TC.qs('q', ''),
    cat: TC.qs('c', 'all') || 'all',
    brand: TC.qsAll('brand'),
    audience: TC.qsAll('audience'),
    scent: TC.qsAll('scent'),
    note: TC.qsAll('note'),
    cat2: TC.qsAll('sub'),
    min: TC.qs('min', ''),
    max: TC.qs('max', ''),
    rating: TC.qs('rating', ''),
    stock: TC.qs('stock', '') === '1',
    sort: TC.qs('sort', 'featured'),
    page: Math.max(1, parseInt(TC.qs('page', '1'), 10) || 1)
  };

  function writeURL(push) {
    var p = new URLSearchParams();
    if (state.q) p.set('q', state.q);
    if (state.cat && state.cat !== 'all') p.set('c', state.cat);
    if (state.cat2.length) p.set('sub', state.cat2.join('|'));
    ['brand', 'audience', 'scent', 'note'].forEach(function (k) {
      if (state[k].length) p.set(k, state[k].join('|'));
    });
    if (state.min) p.set('min', state.min);
    if (state.max) p.set('max', state.max);
    if (state.rating) p.set('rating', state.rating);
    if (state.stock) p.set('stock', '1');
    if (state.sort !== 'featured') p.set('sort', state.sort);
    if (state.page > 1) p.set('page', String(state.page));
    var url = location.pathname + (p.toString() ? '?' + p.toString() : '');
    if (push) history.pushState(null, '', url);
    else history.replaceState(null, '', url);
  }

  /* -------------------------------------------------------------- matching */
  function matchQuery(p, q) {
    if (!q) return true;
    var b = TC.brandName(p.brand);
    var hay = (p.name + ' ' + b.name + ' ' + b.nameAr + ' ' + TC.catName(p.cat).name + ' ' +
      p.tags.join(' ') + ' ' + p.short).toLowerCase();
    return String(q).toLowerCase().trim().split(/\s+/).every(function (w) { return hay.indexOf(w) > -1; });
  }

  function filtered() {
    var out = D.products.filter(function (p) {
      if (!matchQuery(p, state.q)) return false;

      if (state.cat === 'offers' && !p.was) return false;
      else if (state.cat === 'new-arrivals' && !(p.badge === 'new' || p.tags.indexOf('جديد') > -1)) return false;
      else if (state.cat === 'best-sellers' && p.badge !== 'best' && p.badge !== 'hot') return false;
      else if (state.cat !== 'all' && p.cat !== state.cat) return false;

      if (state.cat2.length && state.cat2.indexOf(p.cat) === -1) return false;
      if (state.brand.length && state.brand.indexOf(p.brand) === -1) return false;
      if (state.audience.length && !state.audience.some(function (t) { return p.tags.indexOf(t) > -1; })) return false;
      if (state.scent.length && !state.scent.some(function (t) { return p.tags.indexOf(t) > -1; })) return false;
      if (state.note.length && !state.note.some(function (t) { return p.tags.indexOf(t) > -1; })) return false;
      if (state.min && p.price < +state.min) return false;
      if (state.max && p.price > +state.max) return false;
      if (state.rating && p.rating < +state.rating) return false;
      if (state.stock && p.stock === 0) return false;
      return true;
    });

    var s = state.sort;
    if (s === 'price-asc') out.sort(function (a, b) { return a.price - b.price; });
    else if (s === 'price-desc') out.sort(function (a, b) { return b.price - a.price; });
    else if (s === 'rating') out.sort(function (a, b) { return b.rating - a.rating || b.reviews - a.reviews; });
    else if (s === 'popular') out.sort(function (a, b) { return (b.reviews * b.rating) - (a.reviews * a.rating); });
    else if (s === 'new') out.sort(function (a, b) { return (b.badge === 'new' ? 1 : 0) - (a.badge === 'new' ? 1 : 0); });
    else if (state.cat === 'best-sellers') out.sort(function (a, b) { return (b.reviews * b.rating) - (a.reviews * a.rating); });
    else out.sort(function (a, b) {
      var w = { best: 3, hot: 2, new: 1 };
      return (w[b.badge] || 0) - (w[a.badge] || 0) || b.rating - a.rating;
    });
    return out;
  }

  /* ----------------------------------------------------------------- chips */
  var CHIP_LABEL = {
    brand: 'الماركة', audience: 'الفئة', scent: 'العائلة العطرية',
    note: 'المزايا', cat2: 'القسم'
  };
  function chipHTML(key, val) {
    var label = key === 'brand' ? (TC.brandName(val).nameAr || TC.brandName(val).name) : val;
    if (key === 'cat2') label = TC.catName(val).name;
    return '<span class="chip" data-chip-key="' + key + '" data-chip-val="' + esc(val) + '">' +
      esc(CHIP_LABEL[key]) + ': ' + esc(label) +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>' +
    '</span>';
  }
  function renderChips() {
    var out = '';
    ['brand', 'audience', 'scent', 'note', 'cat2'].forEach(function (k) {
      state[k].forEach(function (v) { out += chipHTML(k, v); });
    });
    if (state.min) out += chipHTML('price', 'min:' + state.min);
    if (state.max) out += chipHTML('price', 'max:' + state.max);
    if (state.rating) out += chipHTML('rating', state.rating);
    if (state.stock) out += chipHTML('stock', '1');
    var wrap = $('[data-chips]');
    wrap.innerHTML = out;
  }

  /* --------------------------------------------------------------- results */
  function render() {
    var list = filtered();
    var pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
    if (state.page > pages) state.page = pages;
    var slice = list.slice((state.page - 1) * PER_PAGE, state.page * PER_PAGE);

    var titleEl = $('[data-title]');
    var descEl = $('[data-desc]');
    var crumbsEl = $('[data-crumbs]');
    var c = TC.catName(state.cat);
    var heading;

    if (isSearchPage) {
      heading = state.q ? 'نتائج البحث عن «' + state.q + '»' : 'البحث';
      document.title = (state.q ? 'نتائج البحث عن ' + state.q : 'البحث') + ' | تونى كوزمتكس';
      if (titleEl) titleEl.textContent = heading;
    } else if (state.cat === 'offers') {
      heading = 'العروض والتخفيضات';
      if (titleEl) titleEl.textContent = heading;
    } else if (state.cat === 'new-arrivals') {
      heading = 'وصل حديثاً';
      if (titleEl) titleEl.textContent = heading;
    } else if (state.cat === 'best-sellers') {
      heading = 'الأكثر مبيعاً';
      if (titleEl) titleEl.textContent = heading;
    } else {
      heading = c.name;
      if (titleEl) titleEl.textContent = heading;
    }

    if (descEl) {
      if (isSearchPage) descEl.textContent = '';
      else if (state.cat === 'offers') descEl.textContent = 'خصومات تصل إلى 50٪ على منتجات مختارة';
      else if (state.cat === 'new-arrivals') descEl.textContent = 'أحدث المنتجات التي أضفناها إلى المتجر';
      else if (state.cat === 'best-sellers') descEl.textContent = 'اختيارات عملائنا الأكثر طلباً';
      else descEl.textContent = c.id === 'all' ? 'كل منتجات تونى كوزمتكس في مكان واحد' : '';
    }

    /* breadcrumbs */
    if (crumbsEl) {
      crumbsEl.innerHTML =
        '<a href="index.html">الرئيسية</a>' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg>' +
        (state.cat !== 'all' || isSearchPage
          ? '<a href="' + TC.catUrl('all') + '">المتجر</a>' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg>' +
            '<span class="crumbs__now">' + esc(heading) + '</span>'
          : '<span class="crumbs__now">كل المنتجات</span>');
    }

    var countEl = $('[data-count]');
    if (countEl) {
      countEl.innerHTML = 'عرض <b>' + TC.num(list.length) + '</b> منتج' +
        (list.length > PER_PAGE ? ' — صفحة ' + state.page + ' من ' + pages : '');
    }

    $('[data-results]').innerHTML = list.length
      ? slice.map(function (p) { return TC.cardHTML(p); }).join('')
      : emptyState();

    renderPagination(pages);
    renderChips();
    syncFilterUI();
    writeURL(false);
  }

  function emptyState() {
    return '<div class="empty-state" style="grid-column:1/-1">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3M8 11h6"/></svg>' +
      '<div class="empty-state__title">لا توجد نتائج مطابقة</div>' +
      '<div class="empty-state__text">جرّب تعديل الفلاتر أو البحث بكلمات أخرى.</div>' +
      '<button class="btn btn--primary" data-clear-all>مسح كل الفلاتر</button>' +
    '</div>';
  }

  function renderPagination(pages) {
    var wrap = $('[data-pagination]');
    if (pages <= 1) { wrap.innerHTML = ''; return; }
    var html = '<div class="pagination">';
    html += '<button data-page="' + (state.page - 1) + '"' + (state.page === 1 ? ' disabled' : '') + ' aria-label="السابق">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 18l-6-6 6-6"/></svg></button>';

    for (var i = 1; i <= pages; i++) {
      if (pages > 7 && i > 2 && i < pages - 1 && Math.abs(i - state.page) > 1) {
        if (Math.abs(i - state.page) === 2) html += '<span class="muted" style="padding:0 4px">…</span>';
        continue;
      }
      html += '<button data-page="' + i + '" class="' + (i === state.page ? 'is-active' : '') + '">' + i + '</button>';
    }
    html += '<button data-page="' + (state.page + 1) + '"' + (state.page === pages ? ' disabled' : '') + ' aria-label="التالي">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg></button>';
    wrap.innerHTML = html + '</div>';
  }

  /* --------------------------------------------------------------- filters */
  function fblock(id, title, body, open) {
    return '<div class="fblock' + (open ? ' is-open' : '') + '">' +
      '<button class="fblock__head">' + esc(title) +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>' +
      '</button>' +
      '<div class="fblock__body">' + body + '</div>' +
    '</div>';
  }

  function countIn(key, val) {
    return D.products.filter(function (p) {
      if (state.cat === 'offers' && !p.was) return false;
      if (state.cat !== 'all' && ['offers', 'new-arrivals', 'best-sellers'].indexOf(state.cat) === -1 && p.cat !== state.cat) return false;
      if (!matchQuery(p, state.q)) return false;
      if (key === 'brand') return p.brand === val;
      if (key === 'cat2') return p.cat === val;
      return p.tags.indexOf(val) > -1;
    }).length;
  }

  function checks(key, list, labels) {
    return '<div class="fblock__list">' + list.map(function (v, i) {
      var n = countIn(key, v);
      var label = (labels && labels[i]) || v;
      return '<label class="check"><input type="checkbox" data-f="' + key + '" value="' + esc(v) + '"' +
        (state[key].indexOf(v) > -1 ? ' checked' : '') + '>' +
        '<span class="check__box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></span>' +
        '<span>' + esc(label) + '</span>' +
        '<span class="fcount">' + n + '</span></label>';
    }).join('') + '</div>';
  }

  function buildFilters() {
    var h = '';

    /* related categories — only when a real category is selected */
    if (state.cat && ['all', 'offers', 'new-arrivals', 'best-sellers'].indexOf(state.cat) === -1) {
      var related = D.categories.filter(function (c) { return !c.virtual && c.id !== state.cat; }).slice(0, 6);
      h += fblock('sub', 'أقسام أخرى', checks('cat2', related.map(function (c) { return c.id; }),
        related.map(function (c) { return c.name; })), false);
    }

    h += fblock('cat', 'القسم',
      '<div class="fblock__list">' +
        D.categories.map(function (c) {
          var n = TC.productsOf(c.id).length;
          return '<a class="dropdown__link" href="' + TC.catUrl(c.id) + '">' + esc(c.name) +
            '<span>' + n + '</span></a>';
        }).join('') +
      '</div>', true);

    h += fblock('brand', 'الماركة', checks('brand',
      D.brands.map(function (b) { return b.id; }),
      D.brands.map(function (b) { return b.nameAr || b.name; })), true);

    h += fblock('audience', 'الفئة المستهدفة', checks('audience', D.filterOptions.audience), true);
    h += fblock('scent', 'العائلة العطرية', checks('scent', D.filterOptions.scent), false);
    h += fblock('note', 'المزايا', checks('note', D.filterOptions.note), false);

    h += fblock('price', 'السعر',
      '<div class="price-range">' +
        '<input class="input" type="number" inputmode="numeric" placeholder="من" data-price="min" value="' + esc(state.min) + '">' +
        '<span>—</span>' +
        '<input class="input" type="number" inputmode="numeric" placeholder="إلى" data-price="max" value="' + esc(state.max) + '">' +
      '</div>' +
      '<div class="price-chips">' +
        [[0, 50], [50, 100], [100, 200], [200, 500]].map(function (r) {
          return '<button class="swatch" data-range="' + r[0] + '|' + r[1] + '" style="font-size:12px">' + r[0] + '–' + r[1] + '</button>';
        }).join('') +
      '</div>', true);

    h += fblock('rating', 'التقييم',
      '<div class="fblock__list">' +
        [4.5, 4, 3.5].map(function (r) {
          return '<label class="check"><input type="checkbox" data-f="rating" value="' + r + '"' +
            (state.rating === String(r) ? ' checked' : '') + '>' +
            '<span class="check__box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg></span>' +
            '<span>' + TC.stars(r) + '&nbsp;' + r + ' فأعلى</span></label>';
        }).join('') +
      '</div>', false);

    h += fblock('stock', 'التوفّر',
      '<label class="check"><input type="checkbox" data-f="stock" value="1"' + (state.stock ? ' checked' : '') + '>' +
      '<span class="check__box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg></span>' +
      '<span>المتوفر فقط</span></label>', false);

    return h;
  }

  function syncFilterUI() {
    $$('[data-f]').forEach(function (el) {
      var k = el.dataset.f, v = el.value;
      if (k === 'rating') el.checked = state.rating === v;
      else if (k === 'stock') el.checked = state.stock;
      else el.checked = state[k].indexOf(v) > -1;
    });
    $$('[data-price]').forEach(function (el) { el.value = state[el.dataset.price]; });
  }

  /* ---------------------------------------------------------- search page */
  var QUICK = ['عود', 'مسك', 'نسائي', 'رجالي', 'سيروم', 'عطر خليجي', 'مرطب', 'أحمر شفاه'];

  function quickTags() {
    var wrap = $('[data-quick]');
    if (!wrap) return;
    wrap.innerHTML = '<span class="small muted" style="align-self:center">بحث شائع:</span>' +
      QUICK.map(function (t) {
        return '<button class="swatch" data-quick-tag="' + esc(t) + '">' + esc(t) + '</button>';
      }).join('');
  }

  function sugHTML(q) {
    var res = TC.searchProducts(q).slice(0, 7);
    if (!res.length) return '';
    return res.map(function (p) {
      return '<a class="search-sug__item" href="' + TC.prodUrl(p) + '">' +
        '<span class="search-sug__media"><img src="' + TC.imgOf(p) + '" alt="" width="38" height="42" loading="lazy"></span>' +
        '<span><span class="search-sug__name">' + esc(p.name) + '</span><br>' +
        '<span class="search-sug__cat">' + esc(TC.brandName(p.brand).name) + ' · ' + esc(TC.catName(p.cat).name) + '</span></span>' +
        '<span class="search-sug__price">' + TC.plainMoney(p.price) + '</span>' +
      '</a>';
    }).join('') +
    '<a class="search-sug__all" href="' + location.pathname + '?q=' + encodeURIComponent(q) + '">عرض كل النتائج</a>';
  }

  function initSearchPage() {
    var input = $('[data-q]');
    if (!input) return;
    var sug = $('[data-sug]');

    input.value = state.q;
    quickTags();

    function push() {
      state.q = input.value.trim();
      state.page = 1;
      render();
    }

    input.addEventListener('input', TC.debounce(function () {
      push();
      var html = input.value.trim().length >= 2 ? sugHTML(input.value.trim()) : '';
      sug.innerHTML = html;
      sug.classList.toggle('hidden', !html);
    }, 240));

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        sug.classList.add('hidden');
        push();
        window.scrollTo({ top: $('[data-results]').offsetTop - 140, behavior: 'smooth' });
      }
      if (e.key === 'Escape') sug.classList.add('hidden');
    });

    $('[data-go]').addEventListener('click', function () {
      sug.classList.add('hidden');
      push();
      window.scrollTo({ top: $('[data-results]').offsetTop - 140, behavior: 'smooth' });
    });

    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-quick-tag]')) {
        input.value = e.target.closest('[data-quick-tag]').dataset.quickTag;
        sug.classList.add('hidden');
        push();
        return;
      }
      if (!e.target.closest('.search-wrap')) sug.classList.add('hidden');
    });
  }

  /* ----------------------------------------------------------------- boot */
  function setFilter(key, val, on) {
    var arr = state[key];
    if (key === 'stock') { state.stock = on; }
    else if (key === 'rating') { state.rating = on ? val : ''; }
    else {
      var i = arr.indexOf(val);
      if (on && i === -1) arr.push(val);
      if (!on && i > -1) arr.splice(i, 1);
    }
    state.page = 1;
    render();
  }

  function bind() {
    document.addEventListener('change', function (e) {
      var f = e.target.closest('[data-f]');
      if (f) { setFilter(f.dataset.f, f.value, f.checked); return; }
      var s = e.target.closest('[data-sort]');
      if (s) { state.sort = s.value; state.page = 1; render(); }
    });

    document.addEventListener('input', TC.debounce(function (e) {
      var p = e.target.closest('[data-price]');
      if (p) { state[p.dataset.price] = p.value; state.page = 1; render(); }
    }, 420));

    document.addEventListener('click', function (e) {
      var c = e.target.closest('[data-clear-all]');
      if (c) {
        state.brand = []; state.audience = []; state.scent = []; state.note = []; state.cat2 = [];
        state.min = ''; state.max = ''; state.rating = ''; state.stock = false; state.page = 1;
        render();
        return;
      }
      var r = e.target.closest('[data-range]');
      if (r) {
        var a = r.dataset.range.split('|');
        state.min = a[0] === '0' ? '' : a[0];
        state.max = a[1]; state.page = 1; render();
        return;
      }
      var pg = e.target.closest('[data-page]');
      if (pg && !pg.disabled) {
        state.page = +pg.dataset.page;
        render();
        window.scrollTo({ top: $('[data-results]').offsetTop - 140, behavior: 'smooth' });
        return;
      }
      var chip = e.target.closest('[data-chip-key]');
      if (chip) {
        var k = chip.dataset.chipKey, v = chip.dataset.chipVal;
        if (k === 'price') { var w = v.split(':'); state[w[0]] = w[1] === '0' ? '' : w[1]; }
        else if (k === 'rating') state.rating = '';
        else if (k === 'stock') state.stock = false;
        else {
          var i = state[k].indexOf(v);
          if (i > -1) state[k].splice(i, 1);
        }
        state.page = 1;
        render();
        return;
      }
      if (e.target.closest('[data-open-filters]')) {
        $('#tcFilterDrawer').classList.add('is-open');
        $('.overlay').classList.add('is-open');
        document.body.classList.add('is-locked');
      }
      if (e.target.closest('[data-close-filters]')) TC.closeAll();
    });

    window.addEventListener('popstate', function () { location.reload(); });
  }

  function boot() {
    if (!$('[data-results]')) return;

    var roots = $$('[data-filter-root]');
    roots.forEach(function (r) { r.innerHTML = buildFilters(); });

    var sortSel = $('[data-sort]');
    if (sortSel) sortSel.value = state.sort;

    if (isSearchPage) initSearchPage();

    bind();
    render();
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
