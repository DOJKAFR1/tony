/* ==========================================================================
   TONY COSMETICS — admin.js
   لوحة التحكم: تعديل كل محتوى الموقع.

   الأقسام تُحفظ كأقسام كاملة في جدول site_content.
   كل قسم له مفتاح (id) وعمود data بـ JSON.
   ========================================================================== */
(function (global) {
  'use strict';

  var CFG = global.TCConfig;
  var Store = global.TCStore;
  var D = global.TCData;

  var doc = global.document;
  var $ = function (s, r) { return (r || doc).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); };

  /* ============================================================ أدوات عامة */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function money(n) { return (Math.round((+n || 0) * 100) / 100); }
  function nowISO() { return new Date().toISOString(); }

  /* حالة التطبيق */
  var S = {
    session: null,
    token: null,
    view: 'dash',
    editing: null,        /* معرّف العنصر تحت التعديل */
    dirty: {},            /* أي أقسام معدّلة ولم تُحفظ */
    busy: false
  };

  /* ============================================================== الواجهة */
  function toast(msg, kind) {
    var host = $('.toast-host');
    if (!host) { host = doc.createElement('div'); host.className = 'toast-host'; doc.body.appendChild(host); }
    var t = doc.createElement('div');
    t.className = 'toast' + (kind ? ' toast--' + kind : '');
    t.textContent = msg;
    host.appendChild(t);
    setTimeout(function () { t.remove(); }, kind === 'err' ? 5200 : 2800);
  }

  function bar(kind, text) {
    var host = $('#barHost');
    if (!host) return;
    if (!text) { host.innerHTML = ''; return; }
    host.innerHTML = '<div class="bar bar--' + kind + '">' + esc(text) +
      '<span class="bar__x" data-bar-x>&times;</span></div>';
  }
  doc.addEventListener('click', function (e) {
    if (e.target.closest('[data-bar-x]')) bar(null);
  });

  function setBusy(on) {
    S.busy = on;
    doc.body.classList.toggle('is-busy', on);
    $$('[data-busy-btn]').forEach(function (b) {
      var was = b.innerHTML;
      b.dataset.was = b.dataset.was || was;
      b.innerHTML = on ? '<span class="spin"></span> جارٍ الحفظ…' : b.dataset.was;
      b.disabled = on;
    });
  }

  /* ============================================================== الدخول */
  function showLogin() {
    $('#login').style.display = '';
    $('#app').classList.remove('is-on');
    doc.body.classList.remove('is-locked');
  }

  function showApp() {
    $('#login').style.display = 'none';
    $('#app').classList.add('is-on');
    $('#whoami').textContent = S.session && S.session.user ? S.session.user.email : '';
    render();
  }

  /* جلسة وهمية لوضع الحفظ المحلي — لا يوجد خادم، فقط متصفح المستخدم */
  function localSession() {
    return { token: 'local', user: { email: 'محلي — بدون Supabase' }, expires: Infinity };
  }

  function doLogin(e) {
    e.preventDefault();
    var email = $('#lgEmail').value.trim();
    var pass = $('#lgPass').value;
    var err = $('#lgErr');
    err.textContent = '';
    err.style.display = 'none';

    /* وضع محلي: كلمة مرور اختيارية واحدة من config.js */
    if (Store.isLocal()) {
      if (pass !== CFG.localPasscode) {
        err.textContent = 'كلمة المرور غير صحيحة';
        err.style.display = '';
        return;
      }
      S.session = localSession();
      S.token = 'local';
      $('#lgPass').value = '';
      showApp();
      toast('أهلاً بك', 'ok');
      return;
    }

    if (!email || !pass) { err.textContent = 'أدخل البريد وكلمة المرور'; err.style.display = ''; return; }

    var btn = $('#lgBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spin"></span> جارٍ الدخول…';

    Store.signIn(email, pass).then(function (sess) {
      Store.saveSession(sess.token, sess.user, sess.refresh, sess.expires);
      S.session = sess;
      S.token = sess.token;
      $('#lgPass').value = '';
      showApp();
      toast('أهلاً بك', 'ok');
    }).catch(function (e) {
      err.textContent = e.message || 'تعذر تسجيل الدخول';
      err.style.display = '';
    }).then(function () {
      btn.disabled = false;
      btn.textContent = 'دخول';
    });
  }

  function doLogout() {
    Store.signOut();
    S.session = null; S.token = null;
    if (Store.isLocal()) {
      $('#lgEmail').value = '';
      $('#lgPass').value = '';
      showLogin();
      return;
    }
    location.reload();
  }

  /* ==================================================== الحفظ (Supabase أو محلي) */
  function token() {
    /* وضع الحفظ المحلي لا يحتاج رمز دخول */
    if (Store.isLocal()) return Promise.resolve('local');
    /* يجدّد الرمز لو اقترب من الانتهاء */
    if (!S.session) return Promise.reject(new Error('انتهت الجلسة، سجّل الدخول من جديد'));
    return Store.ensureToken(S.session).then(function (sess) {
      S.session = sess;
      S.token = sess.token;
      return sess.token;
    });
  }

  function saveSection(id, data, opts) {
    opts = opts || {};
    return token().then(function (t) {
      return Store.save(id, data, t);
    }).then(function () {
      delete S.dirty[id];
      if (opts.silent !== true) toast('تم حفظ: ' + SECTION_LABEL[id] || id, 'ok');
      return true;
    });
  }

  function resetSection(id) {
    if (!confirm('سيُرجَع قسم "' + (SECTION_LABEL[id] || id) + '" إلى محتواه الافتراضي في data.js.\nهل أنت متأكد؟')) return;
    setBusy(true);
    token().then(function (t) {
      return Store.reset(id, t);
    }).then(function () {
      /* الوضع المحلي: نعيد تحميل الصفحة لأن data.js لا يُقرأ إلا مرة واحدة.
         مع Supabase يكفي إعادة تحميل البيانات. */
      if (Store.isLocal()) {
        toast('تمت الإعادة — يعاد تحميل الصفحة', 'ok');
        setTimeout(function () { location.reload(); }, 500);
        return null;
      }
      return Store.load(S.token);
    }).then(function (r) {
      if (r === null) return;
      toast('تمت الإعادة', 'ok');
      render();
    }).catch(function (e) {
      toast(e.message, 'err');
    }).then(function () {
      setBusy(false);
    });
  }

  var SECTION_LABEL = {
    shop: 'بيانات المتجر',
    brands: 'الماركات',
    categories: 'الأقسام',
    filterOptions: 'خيارات التصفية',
    nav: 'قائمة التنقل',
    products: 'المنتجات',
    reviews: 'آراء العملاء',
    pal: 'لوحة الألوان',
    content: 'النصوص والصور',
    promos: 'أكواد الخصم',
    areas: 'مناطق الشحن',
    theme: 'ألوان الموقع'
  };

  /* ============================================================== التنقل */
  var VIEWS = [
    { id: 'dash',    label: 'نظرة عامة',    ico: '◉' },
    { id: 'products', label: 'المنتجات',   ico: '▤' },
    { id: 'brands',  label: 'الماركات',    ico: '✦' },
    { id: 'cats',    label: 'الأقسام',     ico: '❐' },
    { id: 'text',    label: 'النصوص',      ico: '✎' },
    { id: 'theme',   label: 'الألوان',     ico: '◐' },
    { id: 'media',   label: 'الصور',       ico: '▣' },
    { id: 'settings', label: 'الإعدادات',  ico: '⚙' },
    { id: 'json',    label: 'JSON خام',    ico: '{}' }
  ];

  function renderNav() {
    var host = $('#sideNav');
    host.innerHTML = VIEWS.map(function (v) {
      return '<button class="navlink' + (v.id === S.view ? ' is-active' : '') + '" data-view="' + v.id + '">' +
        '<span class="navlink__ico">' + v.ico + '</span>' + esc(v.label) + '</button>';
    }).join('');
  }

  function render() {
    renderNav();
    var v = S.view;
    var map = {
      dash: viewDash, products: viewProducts, brands: viewBrands, cats: viewCats,
      text: viewText, theme: viewTheme, media: viewMedia, settings: viewSettings, json: viewJson
    };
    $('#body').innerHTML = '<div class="panel" id="panel"></div>';
    (map[v] || viewDash)($('#panel'));
  }

  function title(t, s) {
    $('#tTitle').textContent = t;
    $('#tSub').textContent = s || '';
  }

  /* ========================================================== نظرة عامة */
  /* ========================================================== نظرة عامة */
  function viewDash(p) {
    var local = Store.isLocal();
    title('نظرة عامة', 'حالة الحفظ وحجم البيانات');

    var r = Store.remote || {};
    var mods = Object.keys(r);
    var counts = [
      ['المنتجات', (D.products || []).length],
      ['الماركات', (D.brands || []).length],
      ['الأقسام', (D.categories || []).filter(function (c) { return !c.virtual; }).length],
      ['آراء العملاء', (D.reviews || []).length],
      ['شرائح الواجهة', (D.content && D.content.hero || []).length],
      ['صفحات المحتوى', Object.keys((D.content && D.content.pages) || {}).length]
    ];
    var errs = (D.products || []).filter(function (x) { return !x.price || x.price <= 0; }).length;

    var modeCard = local
      ? '<div class="card"><div class="card__body">' +
          '<div style="font-size:12.5px;color:var(--a-text-2)">نمط الحفظ</div>' +
          '<div style="font-size:18px;font-weight:700;margin-top:3px">' +
          '<span class="chip chip--warn">محلي — داخل هذا المتصفح</span></div>' +
          '<div style="font-size:12px;color:var(--a-text-3);margin-top:5px">' +
          mods.length + ' قسم محفوظ · ' + Store.localSize() + ' كيلوبايت</div>' +
        '</div></div>'
      : '<div class="card"><div class="card__body">' +
          '<div style="font-size:12.5px;color:var(--a-text-2)">حالة الاتصال</div>' +
          '<div style="font-size:18px;font-weight:700;margin-top:3px">' +
          '<span class="chip chip--ok">متصل بـ Supabase</span></div>' +
          '<div style="font-size:12px;color:var(--a-text-3);margin-top:5px">' + esc(CFG.supabaseUrl) + '</div>' +
        '</div></div>';

    var publish = local
      ? '<div class="card"><div class="card__head"><h2 class="card__title">نشر التعديلات لكل الزوار</h2></div>' +
          '<div class="card__body">' +
            '<div class="note note--warn"><b>التعديلات محفوظة عندك فقط حتى ترفع الملف.</b><br>' +
            'اضغط «تنزيل content.local.js»، ارفعه إلى مجلد <code>assets/js/</code> في موقعك، ' +
            'ثم أضف السطر التالي مباشرة بعد <code>data.js</code> في كل صفحة HTML:</div>' +
            '<pre style="background:var(--a-bg);padding:10px;border-radius:8px;overflow:auto;direction:ltr;text-align:left;font-size:12px;margin:0 0 12px">' +
              '&lt;script src="assets/js/content.local.js"&gt;&lt;/script&gt;</pre>' +
            '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
              '<button class="btn btn--primary" data-export' + (mods.length ? '' : ' disabled') + '>' +
                'تنزيل content.local.js</button>' +
              '<button class="btn btn--ghost" data-clearall' + (mods.length ? '' : ' disabled') + '>مسح كل التعديلات</button>' +
            '</div>' +
            (mods.length ? '' : '<div style="margin-top:10px;font-size:12.5px;color:var(--a-text-3)">' +
              'لا توجد تعديلات محفوظة بعد — عدّل أي قسم ثم اضغط «حفظ».</div>') +
          '</div></div>'
      : '';

    p.innerHTML =
      '<div class="grid grid--3" style="margin-bottom:18px">' +
        modeCard +
      '<div class="card"><div class="card__body">' +
        '<div style="font-size:12.5px;color:var(--a-text-2)">أقسام معدّلة</div>' +
        '<div style="font-size:19px;font-weight:700;margin-top:3px">' + mods.length + ' / 12</div>' +
        '<div style="font-size:12px;color:var(--a-text-3);margin-top:5px">غير المعدّل يُقرأ من data.js</div>' +
      '</div></div>' +
      '<div class="card"><div class="card__body">' +
        '<div style="font-size:12.5px;color:var(--a-text-2)">منتجات بلا سعر</div>' +
        '<div style="font-size:19px;font-weight:700;margin-top:3px;color:' + (errs ? 'var(--a-err)' : 'var(--a-ok)') + '">' + errs + '</div>' +
        '<div style="font-size:12px;color:var(--a-text-3);margin-top:5px">تحقق من الأسعار قبل النشر</div>' +
      '</div></div>' +
      '</div>' +

      publish +

      '<div class="card"><div class="card__head"><h2 class="card__title">محتوى المتجر</h2>' +
      '<div class="card__spacer"></div>' +
      '<a class="btn btn--ghost btn--sm" href="index.html" target="_blank" rel="noopener">معاينة الموقع</a></div>' +
      '<div class="card__body"><div class="grid grid--3">' +
      counts.map(function (c) {
        return '<div class="f" style="margin:0"><span class="f__label">' + esc(c[0]) + '</span>' +
          '<div style="font-size:22px;font-weight:700">' + c[1] + '</div></div>';
      }).join('') +
      '</div></div></div>' +

      (local ? '' :
      '<div class="card"><div class="card__head"><h2 class="card__title">حالة كل قسم</h2></div>' +
      '<div class="card__body card__body--flush"><table class="tbl"><thead><tr>' +
      '<th>القسم</th><th>المفتاح</th><th>المصدر</th><th>إجراء</th></tr></thead><tbody>' +
      Object.keys(SECTION_LABEL).map(function (id) {
        var on = Object.prototype.hasOwnProperty.call(r, id);
        return '<tr><td>' + esc(SECTION_LABEL[id]) + '</td>' +
          '<td><code style="font-size:12px">' + esc(id) + '</code></td>' +
          '<td>' + (on ? '<span class="chip chip--ok">من Supabase</span>' : '<span class="chip">من data.js</span>') + '</td>' +
          '<td class="num">' + (on ? '<button class="btn btn--ghost btn--xs" data-reset="' + esc(id) + '">إرجاع للافتراضي</button>' : '') +
          '</td></tr>';
      }).join('') + '</tbody></table></div></div>');
  }

  /* تنزيل الملف المُصدِّر لكل التعديلات المحلية */
  function doExport() {
    if (!Store.isLocal()) { toast('التصدير متاح في الوضع المحلي فقط', 'err'); return; }
    try {
      var src = Store.exportSource();
      var blob = new Blob([src], { type: 'text/javascript;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = doc.createElement('a');
      a.href = url;
      a.download = 'content.local.js';
      doc.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      toast('تم تنزيل content.local.js — ارفعه إلى assets/js/', 'ok');
    } catch (e) {
      toast(e.message || 'فشل التصدير', 'err');
    }
  }

  function doClearAll() {
    if (!confirm('سيتم حذف كل التعديلات المحفوظة محلياً والعودة إلى محتوى data.js الأصلي.\nهل أنت متأكد؟')) return;
    Store.clearLocal();
    location.reload();
  }


  /* ============================================================= المنتجات */
  function viewProducts(p) {
    title('المنتجات', 'تعديل الأسعار والأسماء والصور والتوفّر');

    var cat = $('#pCat') ? $('#pCat').value : 'all';
    var q = $('#pQ') ? $('#pQ').value.trim().toLowerCase() : '';
    var list = (D.products || []).filter(function (x) {
      if (cat !== 'all' && x.cat !== cat) return false;
      if (q && (x.name + ' ' + x.id + ' ' + (x.brand || '')).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });

    p.innerHTML =
      '<div class="card"><div class="card__body">' +
      '<div class="grid grid--3">' +
      '<div class="f" style="margin:0"><label class="f__label" for="pQ">بحث</label>' +
      '<input class="inp" id="pQ" placeholder="اسم أو رقم المنتج" value="' + esc(q) + '"></div>' +
      '<div class="f" style="margin:0"><label class="f__label" for="pCat">القسم</label>' +
      '<select class="sel" id="pCat"><option value="all">كل الأقسام</option>' +
      (D.categories || []).map(function (c) {
        return '<option value="' + esc(c.id) + '"' + (c.id === cat ? ' selected' : '') + '>' + esc(c.name) + '</option>';
      }).join('') + '</select></div>' +
      '<div class="f" style="margin:0"><label class="f__label">&nbsp;</label>' +
      '<div class="f--row"><span class="chip">' + list.length + ' منتج</span>' +
      '<button class="btn btn--sm" id="pAdd">+ منتج جديد</button></div></div>' +
      '</div></div></div>' +

      (S.editing ? productForm(S.editing) : '') +

      '<div class="card"><div class="card__body card__body--flush"><div class="tbl__scroll"><table class="tbl">' +
      '<thead><tr><th>الصورة</th><th>الاسم</th><th>الماركة</th><th>القسم</th><th>السعر</th><th>قبل</th><th>المخزون</th><th></th></tr></thead><tbody>' +
      (list.length ? list.map(function (x) {
        return '<tr>' +
          '<td><img class="thumb" src="' + esc(artImg(x)) + '" alt=""></td>' +
          '<td><div>' + esc(x.name) + '</div><small style="color:var(--a-text-3)">' + esc(x.id) + '</small></td>' +
          '<td>' + esc(brandAr(x.brand)) + '</td>' +
          '<td>' + esc(catAr(x.cat)) + '</td>' +
          '<td class="num"><b>' + money(x.price) + '</b></td>' +
          '<td class="num">' + (x.was ? '<s style="color:var(--a-text-3)">' + money(x.was) + '</s>' : '—') + '</td>' +
          '<td class="num">' + (x.stock > 0 ? '<span class="chip chip--ok">' + x.stock + '</span>' : '<span class="chip chip--err">0</span>') + '</td>' +
          '<td class="num"><div class="tbl__tools">' +
          '<button class="btn btn--ghost btn--xs" data-pedit="' + esc(x.id) + '">تعديل</button>' +
          '<button class="btn btn--ghost btn--xs" data-pdup="' + esc(x.id) + '">نسخ</button>' +
          '<button class="btn btn--ghost btn--xs" data-pdel="' + esc(x.id) + '">حذف</button>' +
          '</div></td></tr>';
      }).join('') : '<tr><td colspan="8" class="empty">لا نتائج</td></tr>') +
      '</tbody></table></div></div></div>';
  }

  function artImg(x) {
    try { return global.TCArt.img(x.art); } catch (e) { return ''; }
  }
  function brandAr(id) {
    var b = (D.brands || []).filter(function (x) { return x.id === id; })[0];
    return b ? (b.nameAr || b.name) : (id || '—');
  }
  function catAr(id) {
    var c = (D.categories || []).filter(function (x) { return x.id === id; })[0];
    return c ? c.name : (id || '—');
  }

  function productForm(id) {
    var isNew = !id || id === '__new__';
    var x = isNew ? blankProduct() : (D.products || []).filter(function (y) { return y.id === id; })[0];
    if (!x) return '';

    return '<div class="card" id="pForm"><div class="card__head">' +
      '<h2 class="card__title">' + (isNew ? 'منتج جديد' : 'تعديل: ' + esc(x.name)) + '</h2>' +
      '<div class="card__spacer"></div>' +
      '<button class="btn btn--ghost btn--sm" data-pcancel>إغلاق</button></div>' +
      '<div class="card__body">' +
      '<div class="grid grid--2">' +
      fld('الاسم', 'pf_name', x.name, 'text') +
      fld('المعرّف (id)', 'pf_id', x.id, 'text', isNew ? '' : 'readonly') +
      fld('السعر', 'pf_price', x.price, 'number') +
      fld('السعر قبل الخصم', 'pf_was', x.was || '', 'number') +
      sel('الماركة', 'pf_brand', x.brand, (D.brands || []).map(function (b) { return [b.id, b.nameAr || b.name]; })) +
      sel('القسم', 'pf_cat', x.cat, (D.categories || []).map(function (c) { return [c.id, c.name]; })) +
      fld('المخزون', 'pf_stock', x.stock, 'number') +
      sel('الشارة', 'pf_badge', x.badge || '', [['', 'بدون'], ['best', 'الأكثر مبيعاً'], ['new', 'جديد'], ['sale', 'تخفيض']]) +
      fld('التقييم', 'pf_rating', x.rating, 'number', '', '0.1') +
      fld('عدد الآراء', 'pf_reviews', x.reviews, 'number') +
      fld('وسوم (افصل بفاصلة)', 'pf_tags', (x.tags || []).join('، '), 'text') +
      '</div>' +

      '<div class="grid grid--2" style="margin-top:6px">' +
      fld('وصف مختصر', 'pf_short', x.short || '', 'text') +
      fld('أحجام (افصل بفاصلة)', 'pf_variants', (x.variants || []).join('، '), 'text') +
      '</div>' +

      ta('الوصف الكامل (سطر لكل فقرة)', 'pf_desc', (x.desc || []).join('\n'), 'ta--sm') +
      ta('المواصفات (سطر لكل: اسم | قيمة)', 'pf_specs',
        (x.specs || []).map(function (s) { return s[0] + ' | ' + s[1]; }).join('\n'), 'ta--sm') +

      '<div class="f"><span class="f__label">ألوان صورة المنتج</span>' +
      '<div class="color">' +
      '<input type="color" class="color__pick" id="pf_c1" value="' + esc(normHex((x.art || {}).c1)) + '">' +
      '<input class="inp color__txt" id="pf_c1t" value="' + esc((x.art || {}).c1 || '') + '">' +
      '<span class="chip">اللون 1</span>' +
      '<input type="color" class="color__pick" id="pf_c2" value="' + esc(normHex((x.art || {}).c2)) + '">' +
      '<input class="inp color__txt" id="pf_c2t" value="' + esc((x.art || {}).c2 || '') + '">' +
      '<span class="chip">اللون 2</span>' +
      '</div><span class="f__hint">الصور مولّدة برمجياً — لو أردت صورة حقيقية ارفعها في قسم الصور وضع رابطها في الاسم.</span></div>' +

      '<div class="sticky-save">' +
      '<button class="btn" data-busy-btn data-psave="' + esc(id) + '">حفظ المنتج</button>' +
      '<button class="btn btn--ghost" data-pcancel>إلغاء</button>' +
      '<div class="card__spacer"></div>' +
      (isNew ? '' : '<button class="btn btn--danger btn--sm" data-pdel="' + esc(id) + '">حذف هذا المنتج</button>') +
      '</div></div></div>';
  }

  function normHex(c) {
    c = String(c || '');
    if (/^#[0-9a-fA-F]{6}$/.test(c)) return c;
    if (/^#[0-9a-fA-F]{3}$/.test(c)) return '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3];
    return '#cccccc';
  }
  function blankProduct() {
    return {
      id: 'p' + Date.now().toString().slice(-5),
      name: 'منتج جديد', brand: (D.brands[0] || {}).id, cat: (D.categories[0] || {}).id,
      tags: [], price: 0, was: 0, rating: 4.5, reviews: 0, stock: 0, badge: '',
      art: { shape: 'flacon', c1: '#d94b8a', c2: '#7d2249' },
      variants: ['100 مل'], short: '', desc: [], specs: []
    };
  }

  function readProductForm(id) {
    var x = (D.products || []).filter(function (y) { return y.id === id; })[0] || blankProduct();
    x.name = val('pf_name');
    x.price = +val('pf_price') || 0;
    x.was = +val('pf_was') || 0;
    if (!x.was) delete x.was;
    x.brand = val('pf_brand');
    x.cat = val('pf_cat');
    x.stock = +val('pf_stock') || 0;
    x.badge = val('pf_badge');
    x.rating = +val('pf_rating') || 0;
    x.reviews = +val('pf_reviews') || 0;
    x.tags = splitList(val('pf_tags'));
    x.short = val('pf_short');
    x.variants = splitList(val('pf_variants'));
    x.desc = lines(val('pf_desc'));
    x.specs = lines(val('pf_specs')).map(function (l) {
      var i = l.indexOf('|');
      return i < 0 ? [l, ''] : [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }).filter(function (s) { return s[0] || s[1]; });
    x.art = x.art || {};
    x.art.c1 = val('pf_c1t') || x.art.c1;
    x.art.c2 = val('pf_c2t') || x.art.c2;
    if (val('pf_id') && val('pf_id') !== x.id) x.id = val('pf_id');
    return x;
  }

  function saveProduct(id) {
    var x = readProductForm(id);
    var list = (D.products || []).slice();
    var i = list.findIndex(function (y) { return y.id === x.id; });
    if (i < 0) list.push(x); else list[i] = x;
    D.products = list;
    setBusy(true);
    saveSection('products', list, { silent: true })
      .then(function () { S.editing = null; render(); })
      .catch(function (e) { toast(e.message, 'err'); })
      .then(function () { setBusy(false); });
  }

  /* ============================================================== الماركات */
  function viewBrands(p) {
    title('الماركات', 'الأسماء التي تظهر في التصفية والمنتجات');
    p.innerHTML =
      '<div class="card"><div class="card__body card__body--flush"><table class="tbl"><thead><tr>' +
      '<th>الاسم اللاتيني</th><th>الاسم العربي</th><th>المعرّف</th><th>عدد المنتجات</th><th></th></tr></thead><tbody>' +
      (D.brands || []).map(function (b, i) {
        var n = (D.products || []).filter(function (x) { return x.brand === b.id; }).length;
        return '<tr>' +
          '<td><input class="inp" data-bname="' + i + '" value="' + esc(b.name) + '"></td>' +
          '<td><input class="inp" data-bnar="' + i + '" value="' + esc(b.nameAr) + '"></td>' +
          '<td><code style="font-size:12px">' + esc(b.id) + '</code></td>' +
          '<td class="num">' + n + '</td>' +
          '<td class="num"><div class="tbl__tools">' +
          '<button class="btn btn--ghost btn--xs" data-bdel="' + i + '">حذف</button></div></td></tr>';
      }).join('') +
      '</tbody></table></div>' +
      '<div class="card__body" style="border-top:1px solid var(--a-border)">' +
      '<button class="btn btn--ghost btn--sm" data-badd>+ ماركة جديدة</button>' +
      '<span class="f__hint" style="display:inline;margin-inline-start:10px">حذف ماركة سينقل منتجاتها تلقائياً إلى أول ماركة في القائمة.</span>' +
      '</div></div>' +
      '<div class="sticky-save"><button class="btn" data-busy-btn data-save="brands">حفظ الماركات</button></div>';
  }

  /* =============================================================== الأقسام */
  function viewCats(p) {
    title('الأقسام', 'أقسام التصنيف وشكل صورتها');
    p.innerHTML =
      '<div class="card"><div class="card__body card__body--flush"><table class="tbl"><thead><tr>' +
      '<th>الاسم</th><th>المعرّف</th><th>الشكل</th><th>اللون 1</th><th>اللون 2</th><th>منتجات</th><th>افتراضي</th><th></th></tr></thead><tbody>' +
      (D.categories || []).map(function (c, i) {
        var n = (D.products || []).filter(function (x) { return x.cat === c.id; }).length;
        return '<tr>' +
          '<td><input class="inp" data-cname="' + i + '" value="' + esc(c.name) + '"' + (c.virtual ? ' readonly' : '') + '></td>' +
          '<td><code style="font-size:12px">' + esc(c.id) + '</code></td>' +
          '<td><input class="inp" style="width:90px" data-cshape="' + i + '" value="' + esc((c.art || {}).shape || '') + '"></td>' +
          '<td><input type="color" class="color__pick" data-cc1="' + i + '" value="' + esc(normHex((c.art || {}).c1)) + '"></td>' +
          '<td><input type="color" class="color__pick" data-cc2="' + i + '" value="' + esc(normHex((c.art || {}).c2)) + '"></td>' +
          '<td class="num">' + n + '</td>' +
          '<td>' + (c.virtual ? '<span class="chip chip--warn">افتراضي</span>' : '') + '</td>' +
          '<td class="num">' + (c.virtual ? '' : '<button class="btn btn--ghost btn--xs" data-cdel="' + i + '">حذف</button>') + '</td>' +
          '</tr>';
      }).join('') + '</tbody></table></div></div>' +
      '<div class="sticky-save"><button class="btn" data-busy-btn data-save="categories">حفظ الأقسام</button></div>';
  }

  /* ================================================================ النصوص */
  function viewText(p) {
    title('النصوص', 'كل النصوص الظاهرة على الموقع');
    var C = D.content || (D.content = {});

    p.innerHTML =
      cardPromo(C) +
      cardTrust(C) +
      cardTicker(C) +
      cardHero(C) +
      cardBanners(C) +
      cardTiles(C) +
      cardPages(C);

    /* مزامنة منتقي اللون مع حقل النص */
    $$('.color').forEach(function (row) {
      var pick = $('.color__pick', row), txt = $('.color__txt', row);
      if (pick && txt) {
        pick.addEventListener('input', function () { txt.value = pick.value; });
        txt.addEventListener('input', function () {
          if (/^#[0-9a-fA-F]{6}$/.test(txt.value)) pick.value = txt.value;
        });
      }
    });
  }

  function cardPromo(C) {
    return '<div class="card"><div class="card__head"><h2 class="card__title">شريط الإعلانات العلوي</h2>' +
      '<div class="card__spacer"></div><span class="card__sub">استخدم {{freeShipFrom}} لإظهار حد الشحن تلقائياً</span></div>' +
      '<div class="card__body">' +
      (C.promoLines || []).map(function (l, i) {
        return rep(i, 'PL', '<textarea class="ta ta--sm" data-pl="' + i + '">' + esc(l) + '</textarea>');
      }).join('') +
      '<button class="btn btn--ghost btn--sm" data-pladd>+ سطر</button>' +
      '<div class="sticky-save"><button class="btn" data-busy-btn data-save="content">حفظ النصوص</button></div>' +
      '</div></div>';
  }

  function cardTrust(C) {
    return '<div class="card"><div class="card__head"><h2 class="card__title">شريط المزايا</h2>' +
      '<div class="card__spacer"></div><span class="card__sub">يظهر في الرئيسية وصفحة "عن تونى"</span></div>' +
      '<div class="card__body">' +
      (C.trust || []).map(function (f, i) {
        return rep(i, 'TR', grid3([
          sel('الأيقونة', 'tr_i_' + i, f.i, [['truck', 'شاحنة'], ['refresh', 'استبدال'], ['shield', 'درع'], ['card', 'بطاقة'], ['info', 'معلومة'], ['headset', 'سماعة'], ['mail', 'بريد'], ['star', 'نجمة'], ['trash', 'سلة'], ['box', 'علبة'], ['heart', 'قلب'], ['lock', 'قفل']]),
          fld('العنوان', 'tr_t_' + i, f.t, 'text'),
          fld('النص', 'tr_s_' + i, f.s, 'text')
        ]));
      }).join('') +
      '<button class="btn btn--ghost btn--sm" data-tradd>+ ميزة</button>' +
      '</div></div>';
  }

  function cardTicker(C) {
    return '<div class="card"><div class="card__head"><h2 class="card__title">الشريط المتحرك</h2>' +
      '<div class="card__spacer"></div><span class="card__sub">يتكرر تلقائياً في الموقع</span></div>' +
      '<div class="card__body">' +
      (C.ticker || []).map(function (t, i) {
        return rep(i, 'TK', grid2([
          fld('النص', 'tk_l_' + i, t.label, 'text'),
          fld('الرابط', 'tk_h_' + i, t.href, 'text')
        ]));
      }).join('') +
      '<button class="btn btn--ghost btn--sm" data-tkadd>+ عنصر</button>' +
      '</div></div>';
  }

  function cardHero(C) {
    return '<div class="card"><div class="card__head"><h2 class="card__title">شرائح الواجهة</h2>' +
      '<div class="card__spacer"></div><span class="card__sub">الشرائح الكبيرة في أعلى الرئيسية</span></div>' +
      '<div class="card__body">' +
      (C.hero || []).map(function (h, i) {
        return rep(i, 'HR',
          fld('السطر العلوي', 'hr_e_' + i, h.eyebrow, 'text') +
          ta('العنوان (يدعم <mark>)', 'hr_t_' + i, h.title, 'ta--sm') +
          ta('النص', 'hr_x_' + i, h.text, 'ta--sm') +
          grid3([
            fld('اللون 1', 'hr_c1_' + i, h.c1, 'text'),
            fld('اللون 2', 'hr_c2_' + i, h.c2, 'text'),
            fld('البذرة', 'hr_s_' + i, h.seed, 'number')
          ]) +
          '<div class="f__label" style="margin-top:10px">الأزرار</div>' +
          (h.actions || []).map(function (a, j) {
            return rep(j, 'HA' + i, grid3([
              fld('النص', 'ha_l_' + i + '_' + j, a.label, 'text'),
              fld('الرابط', 'ha_h_' + i + '_' + j, a.href, 'text'),
              sel('النمط', 'ha_c_' + i + '_' + j, a.cls, [
                ['btn--white btn--lg', 'أبيض'],
                ['btn--ghost-light btn--lg', 'شفاف']
              ])
            ]));
          }).join('') +
          '<button class="btn btn--ghost btn--xs" data-haadd="' + i + '">+ زر</button>'
        );
      }).join('') +
      '<button class="btn btn--ghost btn--sm" data-hradd>+ شريحة</button>' +
      '<div class="sticky-save"><button class="btn" data-busy-btn data-save="content">حفظ النصوص</button></div>' +
      '</div></div>';
  }

  function cardBanners(C) {
    var B = C.banners || {};
    return '<div class="card"><div class="card__head"><h2 class="card__title">اللوحات الإعلانية</h2>' +
      '<div class="card__spacer"></div><span class="card__sub">مجموعتان: الأولى في الأعلى والثانية في الأسفل</span></div>' +
      '<div class="card__body">' +
      Object.keys(B).map(function (k) {
        return '<div class="f__label" style="margin-top:6px">المجموعة ' + esc(k) + '</div>' +
          (B[k] || []).map(function (b, i) {
            return rep(i, 'BN' + k, grid2([
              fld('العنوان', 'bn_t_' + k + '_' + i, b.t, 'text'),
              fld('النص', 'bn_s_' + k + '_' + i, b.s, 'text')
            ]) + grid3([
              fld('الرابط', 'bn_h_' + k + '_' + i, b.href, 'text'),
              fld('نص الزر', 'bn_b_' + k + '_' + i, b.btn, 'text'),
              fld('الارتفاع', 'bn_hh_' + k + '_' + i, b.h, 'number')
            ]) + grid2([
              fld('اللون 1', 'bn_c1_' + k + '_' + i, b.c1, 'text'),
              fld('اللون 2', 'bn_c2_' + k + '_' + i, b.c2, 'text')
            ]));
          }).join('');
      }).join('') +
      '</div></div>';
  }

  function cardTiles(C) {
    return '<div class="card"><div class="card__head"><h2 class="card__title">مربعات الأقسام</h2>' +
      '<div class="card__spacer"></div><span class="card__sub">الصفوف المربعة في الرئيسية</span></div>' +
      '<div class="card__body">' +
      (C.tiles || []).map(function (t, i) {
        return rep(i, 'TL', grid3([
          fld('النص', 'tl_l_' + i, t.label, 'text'),
          sel('القسم', 'tl_c_' + i, t.c, (D.categories || []).map(function (c) { return [c.id, c.name]; })),
          sel('الحجم', 'tl_k_' + i, t.cls, [['tile--tall', 'طويل'], ['tile--sq', 'مربع'], ['tile--wide', 'عريض']])
        ]));
      }).join('') +
      '<button class="btn btn--ghost btn--sm" data-tladd>+ مربع</button>' +
      '</div></div>';
  }

  function cardPages(C) {
    var P = C.pages || {};
    var order = ['about', 'shipping', 'returns', 'faq', 'contact'];
    var label = {
      about: 'عن تونى كوزمتكس', shipping: 'الشحن والتوصيل', returns: 'الاستبدال والإرجاع',
      faq: 'الأسئلة الشائعة', contact: 'تواصل معنا'
    };
    return '<div class="card"><div class="card__head"><h2 class="card__title">محتوى الصفحات</h2>' +
      '<div class="card__spacer"></div><span class="card__sub">HTML كامل — احذر، يُعرض كما هو</span></div>' +
      '<div class="card__body">' +
      '<div class="note note--warn">هذه الحقول تحتوي HTML كامل يُحقن مباشرة في الصفحة. ' +
      'لا تُلصق هنا شيفرة من مصدر غير موثوق.</div>' +
      order.map(function (k) {
        return '<div class="f"><span class="f__label">' + esc(label[k]) + ' — ' + esc(k) + '.html</span>' +
          '<textarea class="ta ta--code" data-pg="' + esc(k) + '" spellcheck="false">' + esc(P[k] || '') + '</textarea>' +
          '<span class="f__hint">' + (P[k] || '').length + ' حرف</span></div>';
      }).join('') +
      '<div class="sticky-save"><button class="btn" data-busy-btn data-save="content">حفظ الصفحات</button></div>' +
      '</div></div>';
  }

  /* ================================================================ الألوان */
  function viewTheme(p) {
    title('ألوان الموقع', 'تُطبّق فوراً على كل الصفحات');
    var meta = D.THEME_META || {};
    var cur = D.theme || {};

    var keys = Object.keys(meta);
    p.innerHTML =
      '<div class="card"><div class="card__head"><h2 class="card__title">الألوان</h2>' +
      '<div class="card__spacer"></div>' +
      '<button class="btn btn--ghost btn--sm" data-theme-defaults>إرجاع للافتراضي</button></div>' +
      '<div class="card__body"><div class="grid grid--2">' +
      keys.map(function (k) {
        var m = meta[k];
        var v = cur[k] && cur[k].value ? cur[k].value : m.def;
        var isHex = /^#[0-9a-fA-F]{6}$/.test(v);
        return '<div class="f" style="margin:0">' +
          '<div class="color__name">' + esc(m.css) + '<span>' + esc(m.def) + '</span></div>' +
          '<div class="color">' +
          (isHex ? '<input type="color" class="color__pick" data-th-pick="' + esc(k) + '" value="' + esc(v) + '">'
                 : '<span class="color__pick" style="background:' + esc(v) + '"></span>') +
          '<input class="inp color__txt" data-th="' + esc(k) + '" value="' + esc(v) + '">' +
          '<button class="btn btn--ghost btn--xs" data-th-reset="' + esc(k) + '">↺</button>' +
          '</div></div>';
      }).join('') +
      '</div>' +
      '<div class="sticky-save">' +
      '<button class="btn" data-busy-btn data-save="theme">حفظ الألوان</button>' +
      '<a class="btn btn--ghost" href="index.html" target="_blank" rel="noopener">معاينة</a>' +
      '</div></div></div>';

    $$('[data-th]').forEach(function (inp) {
      inp.addEventListener('input', function () {
        var k = inp.getAttribute('data-th');
        D.theme = D.theme || {};
        D.theme[k] = { css: meta[k].css, def: meta[k].def, value: inp.value };
        if (D.applyTheme) D.applyTheme();
        var pick = $('[data-th-pick="' + k + '"]');
        if (pick && /^#[0-9a-fA-F]{6}$/.test(inp.value)) pick.value = inp.value;
      });
    });
  }

  /* ============================================================== الصور */
  function viewMedia(p) {
    title('الصور', 'ارفع الصور واستخدم روابطها في المنتجات');
    p.innerHTML =
      '<div class="card"><div class="card__head"><h2 class="card__title">رفع صورة</h2></div>' +
      '<div class="card__body">' +
      '<div class="drop" id="drop">' +
      '<span class="drop__ico">⬆</span>' +
      '<b>اسحب الصور هنا أو اضغط للاختيار</b><br>' +
      '<small>JPG / PNG / WEBP / GIF / SVG — حتى 5 ميجابايت</small>' +
      '</div>' +
      '<input type="file" id="file" accept="image/*" multiple hidden>' +
      '<div id="upList" style="margin-top:12px"></div>' +
      '</div></div>' +
      '<div class="card"><div class="card__head"><h2 class="card__title">مكتبة الصور</h2>' +
      '<div class="card__spacer"></div>' +
      '<button class="btn btn--ghost btn--sm" id="mReload">تحديث</button></div>' +
      '<div class="card__body"><div class="grid grid--auto" id="mGrid">' +
      '<div class="empty">جارٍ التحميل…</div></div></div></div>';

    var drop = $('#drop'), file = $('#file');
    drop.addEventListener('click', function () { file.click(); });
    file.addEventListener('change', function () { uploadFiles(file.files); file.value = ''; });
    ['dragenter', 'dragover'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('is-over'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('is-over'); });
    });
    drop.addEventListener('drop', function (e) {
      if (e.dataTransfer && e.dataTransfer.files) uploadFiles(e.dataTransfer.files);
    });
    $('#mReload').addEventListener('click', loadMedia);
    loadMedia();
  }

  function uploadFiles(files) {
    if (!files || !files.length) return;
    var host = $('#upList');
    token().then(function (t) {
      return Promise.all(Array.prototype.slice.call(files).map(function (f) {
        host.insertAdjacentHTML('beforeend',
          '<div class="rep" data-up><div class="rep__head"><span class="rep__n">' + esc(f.name) + '</span>' +
          '<span class="spin spin--dark"></span></div></div>');
        return Store.upload(f, t).then(function (r) {
          var el = $('[data-up]:last-child', host);
          if (el) el.innerHTML = '<div class="rep__head"><span class="rep__n">' + esc(f.name) + '</span>' +
            '<span class="chip chip--ok">تم</span></div>' +
            '<div class="pickrow"><input class="inp" readonly value="' + esc(r.url) + '">' +
            '<button class="btn btn--ghost btn--sm" data-copy="' + esc(r.url) + '">نسخ</button></div>';
        }).catch(function (e) {
          var el = $('[data-up]:last-child', host);
          if (el) el.innerHTML = '<div class="rep__head"><span class="rep__n">' + esc(f.name) + '</span>' +
            '<span class="chip chip--err">فشل</span></div><div style="font-size:12.5px;color:var(--a-err)">' +
            esc(e.message) + '</div>';
        });
      }));
    }).then(function () {
      toast('انتهى الرفع', 'ok');
      loadMedia();
      setTimeout(function () { host.innerHTML = ''; }, 6000);
    }).catch(function (e) { toast(e.message, 'err'); });
  }

  function loadMedia() {
    var grid = $('#mGrid');
    if (!grid) return;
    grid.innerHTML = '<div class="empty">جارٍ التحميل…</div>';
    token().then(function (t) {
      return Store.listMedia(t);
    }).then(function (list) {
      if (!list.length) {
        grid.innerHTML = '<div class="empty">لا توجد صور بعد — ارفع أول صورة</div>';
        return;
      }
      grid.innerHTML = list.map(function (m) {
        return '<div class="media" data-mp="' + esc(m.path) + '">' +
          '<img class="media__img" src="' + esc(m.url) + '" alt="" loading="lazy">' +
          '<div class="media__bar">' +
          '<span class="media__name" title="' + esc(m.path) + '">' + esc(m.path) + '</span>' +
          '<button class="btn btn--ghost btn--xs" data-copy="' + esc(m.url) + '">نسخ</button>' +
          '<button class="btn btn--ghost btn--xs" data-mdel="' + esc(m.path) + '">حذف</button>' +
          '</div></div>';
      }).join('');
    }).catch(function (e) {
      grid.innerHTML = '<div class="empty">تعذر تحميل الصور: ' + esc(e.message) + '</div>';
    });
  }

  /* ============================================================ الإعدادات */
  function viewSettings(p) {
    title('الإعدادات', 'بيانات المتجر والشحن وأكواد الخصم');
    var S1 = D.shop || {};
    var C = D.content || (D.content = {});

    p.innerHTML =
      '<div class="card"><div class="card__head"><h2 class="card__title">بيانات المتجر</h2></div>' +
      '<div class="card__body"><div class="grid grid--2">' +
      fld('الاسم', 'sh_name', S1.name, 'text') +
      fld('الاسم اللاتيني', 'sh_nameLatin', S1.nameLatin, 'text') +
      fld('الهاتف', 'sh_phone', S1.phone, 'text') +
      fld('واتساب (أرقام فقط)', 'sh_whatsapp', S1.whatsapp, 'text') +
      fld('البريد', 'sh_email', S1.email, 'text') +
      fld('العنوان', 'sh_address', S1.address, 'text') +
      fld('ساعات العمل', 'sh_hours', S1.hours, 'text') +
      fld('حد الشحن المجاني', 'sh_freeShipFrom', S1.freeShipFrom, 'number') +
      fld('رسوم الدفع عند الاستلام', 'cf_codFee', C.codFee, 'number') +
      fld('رمز العملة', 'sh_currencySymbol', S1.currencySymbol, 'text') +
      fld('نص رسالة واتساب', 'sh_whatsappText', S1.whatsappText, 'text') +
      fld('الموقع', 'sh_domain', S1.domain, 'text') +
      '</div>' +
      '<div class="f__label">حسابات التواصل</div><div class="grid grid--2">' +
      fld('إنستغرام', 'so_instagram', (S1.social || {}).instagram, 'text') +
      fld('فيسبوك', 'so_facebook', (S1.social || {}).facebook, 'text') +
      fld('تيك توك', 'so_tiktok', (S1.social || {}).tiktok, 'text') +
      '</div>' +
      '<div class="sticky-save"><button class="btn" data-busy-btn data-save="shop">حفظ بيانات المتجر</button></div>' +
      '</div></div>' +

      '<div class="card"><div class="card__head"><h2 class="card__title">مناطق الشحن</h2>' +
      '<div class="card__spacer"></div><span class="card__sub">' + (C.areas || []).length + ' منطقة</span></div>' +
      '<div class="card__body">' +
      (C.areas || []).map(function (a, i) {
        return rep(i, 'AR', grid2([
          fld('الاسم', 'ar_n_' + i, a.name, 'text'),
          fld('المعرّف', 'ar_i_' + i, a.id, 'text')
        ]) + grid2([
          fld('الرسوم', 'ar_f_' + i, a.fee, 'number'),
          fld('مدة التوصيل', 'ar_e_' + i, a.eta, 'text')
        ]));
      }).join('') +
      '<button class="btn btn--ghost btn--sm" data-aradd>+ منطقة</button>' +
      '<div class="sticky-save"><button class="btn" data-busy-btn data-save="content">حفظ المناطق</button></div>' +
      '</div></div>' +

      '<div class="card"><div class="card__head"><h2 class="card__title">أكواد الخصم</h2></div>' +
      '<div class="card__body"><table class="tbl"><thead><tr>' +
      '<th>الكود</th><th>النوع</th><th>القيمة</th><th>الوصف</th><th></th></tr></thead><tbody>' +
      Object.keys(C.promos || {}).map(function (k) {
        var v = C.promos[k];
        return '<tr>' +
          '<td><input class="inp" style="width:110px" data-pmk="' + esc(k) + '" value="' + esc(k) + '" readonly></td>' +
          '<td><select class="sel" data-pmt="' + esc(k) + '"><option value="pct"' + (v.type === 'pct' ? ' selected' : '') + '>نسبة %</option>' +
          '<option value="ship"' + (v.type === 'ship' ? ' selected' : '') + '>شحن مجاني</option>' +
          '<option value="amt"' + (v.type === 'amt' ? ' selected' : '') + '>مبلغ ثابت</option></select></td>' +
          '<td><input class="inp" style="width:90px" type="number" data-pmv="' + esc(k) + '" value="' + esc(v.value) + '"></td>' +
          '<td><input class="inp" data-pml="' + esc(k) + '" value="' + esc(v.label) + '"></td>' +
          '<td class="num"><button class="btn btn--ghost btn--xs" data-pmdel="' + esc(k) + '">حذف</button></td></tr>';
      }).join('') + '</tbody></table>' +
      '<button class="btn btn--ghost btn--sm" data-pmadd>+ كود</button>' +
      '<div class="sticky-save"><button class="btn" data-busy-btn data-save="content">حفظ الأكواد</button></div>' +
      '</div></div>' +

      '<div class="card"><div class="card__head"><h2 class="card__title">خيارات التصفية</h2></div>' +
      '<div class="card__body">' +
      Object.keys(D.filterOptions || {}).map(function (k) {
        return '<div class="f"><span class="f__label">' + esc(k) + ' (افصل بفاصلة)</span>' +
          '<input class="inp" data-fo="' + esc(k) + '" value="' + esc((D.filterOptions[k] || []).join('، ')) + '"></div>';
      }).join('') +
      '<div class="sticky-save"><button class="btn" data-busy-btn data-save="filterOptions">حفظ خيارات التصفية</button></div>' +
      '</div></div>';
  }

  /* ============================================================= JSON خام */
  function viewJson(p) {
    title('JSON خام', 'تحرير أي قسم مباشرة — طريقة قوية وخطرة في نفس الوقت');
    var cur = S.jsonSel || 'products';
    p.innerHTML =
      '<div class="card"><div class="card__body">' +
      '<div class="f" style="margin:0"><label class="f__label" for="jsSel">القسم</label>' +
      '<select class="sel" id="jsSel">' +
      Object.keys(SECTION_LABEL).map(function (id) {
        return '<option value="' + esc(id) + '"' + (id === cur ? ' selected' : '') + '>' + esc(SECTION_LABEL[id]) + ' — ' + id + '</option>';
      }).join('') + '</select></div></div></div>' +
      '<div class="card"><div class="card__head"><h2 class="card__title" id="jsTitle">' + esc(SECTION_LABEL[cur]) + '</h2>' +
      '<div class="card__spacer"></div>' +
      '<span class="card__sub" id="jsHint"></span></div>' +
      '<div class="card__body">' +
      '<textarea class="ta ta--code" id="jsArea" spellcheck="false"></textarea>' +
      '<div class="bar bar--err" id="jsErr" style="display:none"></div>' +
      '<div class="sticky-save">' +
      '<button class="btn" data-busy-btn id="jsSave">حفظ</button>' +
      '<button class="btn btn--ghost" id="jsFormat">تنسيق</button>' +
      '<div class="card__spacer"></div>' +
      '<button class="btn btn--danger btn--sm" id="jsReset">إرجاع للافتراضي</button>' +
      '</div></div></div>';

    function load(id) {
      S.jsonSel = id;
      var data = D[id];
      $('#jsArea').value = JSON.stringify(data === undefined ? null : data, null, 2);
      $('#jsTitle').textContent = SECTION_LABEL[id] || id;
      var n = $('#jsArea').value.length;
      var saved = Object.keys(Store.remote || {}).indexOf(id) >= 0;
      $('#jsHint').textContent = n + ' \u062d\u0631\u0641 \u00b7 ' + (saved ? '\u0645\u062d\u0641\u0648\u0638 \u0633\u062d\u0627\u0628\u064a\u0627\u064b' : '\u063a\u064a\u0631 \u0645\u062d\u0641\u0648\u0638');
      $('#jsErr').style.display = 'none';
    }

    $('#jsSel').addEventListener('change', function () { load(this.value); });
    $('#jsFormat').addEventListener('click', function () {
      try { $('#jsArea').value = JSON.stringify(JSON.parse($('#jsArea').value), null, 2); $('#jsErr').style.display = 'none'; }
      catch (e) { showJSError(e); }
    });
    $('#jsSave').addEventListener('click', function () {
      var data;
      try { data = JSON.parse($('#jsArea').value); }
      catch (e) { showJSError(e); return; }
      D[S.jsonSel] = data;
      setBusy(true);
      saveSection(S.jsonSel, data).then(function () { load(S.jsonSel); })
        .catch(function (e) { toast(e.message, 'err'); })
        .then(function () { setBusy(false); });
    });
    $('#jsReset').addEventListener('click', function () { resetSection(S.jsonSel); });

    function showJSError(e) {
      var el = $('#jsErr');
      el.textContent = 'JSON غير صالح: ' + e.message;
      el.style.display = '';
    }

    load(cur);
  }

  /* =========================================================== حقول HTML */
  function val(id) { var e = $('#' + id); return e ? e.value : ''; }
  function fld(label, id, value, type, extra, step) {
    return '<div class="f"><label class="f__label" for="' + esc(id) + '">' + esc(label) + '</label>' +
      '<input class="inp" id="' + esc(id) + '" type="' + (type || 'text') + '"' +
      (step ? ' step="' + esc(step) + '"' : '') + ' value="' + esc(value == null ? '' : value) + '"' +
      (extra === 'readonly' ? ' readonly' : '') + '></div>';
  }
  function ta(label, id, value, cls) {
    return '<div class="f"><label class="f__label" for="' + esc(id) + '">' + esc(label) + '</label>' +
      '<textarea class="ta ' + (cls || '') + '" id="' + esc(id) + '" spellcheck="false">' + esc(value) + '</textarea></div>';
  }
  function sel(label, id, value, opts) {
    return '<div class="f"><label class="f__label" for="' + esc(id) + '">' + esc(label) + '</label>' +
      '<select class="sel" id="' + esc(id) + '">' +
      opts.map(function (o) {
        return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(value) ? ' selected' : '') + '>' + esc(o[1]) + '</option>';
      }).join('') + '</select></div>';
  }
  function grid2(inner) { return '<div class="grid grid--2">' + inner + '</div>'; }
  function grid3(inner) { return '<div class="grid grid--3">' + inner + '</div>'; }
  function rep(i, kind, inner) {
    return '<div class="rep" data-rep="' + esc(kind) + '" data-i="' + i + '">' +
      '<div class="rep__head"><span class="rep__n">' + esc(kind) + ' ' + (i + 1) + '</span>' +
      '<button class="btn btn--ghost btn--xs" data-repdel="' + esc(kind) + '|' + i + '">حذف</button></div>' +
      inner + '</div>';
  }
  function splitList(s) {
    return String(s || '').split(/[،,]/).map(function (x) { return x.trim(); }).filter(Boolean);
  }
  function lines(s) {
    return String(s || '').split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
  }

  /* ================================================== قراءة التغييرات */
  function collect(section) {
    var C = D.content;

    if (section === 'shop') {
      var s = D.shop;
      ['name', 'nameLatin', 'phone', 'whatsapp', 'email', 'address', 'hours', 'currencySymbol', 'domain', 'whatsappText']
        .forEach(function (k) { var v = val('sh_' + k); if (v !== '') s[k] = v; });
      s.freeShipFrom = +val('sh_freeShipFrom') || 0;
      s.social = s.social || {};
      ['instagram', 'facebook', 'tiktok'].forEach(function (k) {
        var v = val('so_' + k); if (v !== '') s.social[k] = v;
      });
      C.codFee = +val('cf_codFee') || 0;
      return { shop: s, content: C };
    }

    if (section === 'filterOptions') {
      $$('[data-fo]').forEach(function (e) {
        D.filterOptions[e.getAttribute('data-fo')] = splitList(e.value);
      });
      return { filterOptions: D.filterOptions };
    }

    if (section === 'brands') {
      $$('[data-bname]').forEach(function (e) { D.brands[+e.getAttribute('data-bname')].name = e.value; });
      $$('[data-bnar]').forEach(function (e) { D.brands[+e.getAttribute('data-bnar')].nameAr = e.value; });
      return { brands: D.brands };
    }

    if (section === 'categories') {
      $$('[data-cname]').forEach(function (e) { D.categories[+e.getAttribute('data-cname')].name = e.value; });
      $$('[data-cshape]').forEach(function (e) {
        var c = D.categories[+e.getAttribute('data-cshape')];
        c.art = c.art || {};
        c.art.shape = e.value;
      });
      $$('[data-cc1]').forEach(function (e) {
        var c = D.categories[+e.getAttribute('data-cc1')];
        c.art = c.art || {}; c.art.c1 = e.value;
      });
      $$('[data-cc2]').forEach(function (e) {
        var c = D.categories[+e.getAttribute('data-cc2')];
        c.art = c.art || {}; c.art.c2 = e.value;
      });
      return { categories: D.categories };
    }

    if (section === 'theme') {
      return { theme: D.theme };
    }

    if (section === 'content') {
      /* promoLines */
      if ($$('[data-pl]').length) {
        C.promoLines = $$('[data-pl]').map(function (e) { return e.value; });
      }
      /* trust */
      if ($$('[data-rep="TR"]').length) {
        C.trust = $$('[data-rep="TR"]').map(function (r) {
          var i = r.getAttribute('data-i');
          return { i: val('tr_i_' + i), t: val('tr_t_' + i), s: val('tr_s_' + i) };
        });
      }
      /* ticker */
      if ($$('[data-rep="TK"]').length) {
        C.ticker = $$('[data-rep="TK"]').map(function (r) {
          var i = r.getAttribute('data-i');
          return { label: val('tk_l_' + i), href: val('tk_h_' + i) };
        });
      }
      /* hero */
      if ($$('[data-rep="HR"]').length) {
        C.hero = $$('[data-rep="HR"]').map(function (r) {
          var i = r.getAttribute('data-i');
          var acts = $$('[data-rep="HA' + i + '"]').map(function (ar) {
            var j = ar.getAttribute('data-i');
            return { label: val('ha_l_' + i + '_' + j), href: val('ha_h_' + i + '_' + j), cls: val('ha_c_' + i + '_' + j) };
          });
          return {
            eyebrow: val('hr_e_' + i), title: val('hr_t_' + i), text: val('hr_x_' + i),
            c1: val('hr_c1_' + i), c2: val('hr_c2_' + i), seed: +val('hr_s_' + i) || 1,
            actions: acts
          };
        });
      }
      /* banners */
      if ($$('[data-rep^="BN"]').length) {
        C.banners = C.banners || {};
        $$('[data-rep^="BN"]').forEach(function (r) {
          var k = r.getAttribute('data-rep').slice(2);
          var i = r.getAttribute('data-i');
          C.banners[k] = C.banners[k] || [];
          C.banners[k][i] = {
            t: val('bn_t_' + k + '_' + i), s: val('bn_s_' + k + '_' + i),
            href: val('bn_h_' + k + '_' + i), btn: val('bn_b_' + k + '_' + i),
            h: +val('bn_hh_' + k + '_' + i) || 300,
            c1: val('bn_c1_' + k + '_' + i), c2: val('bn_c2_' + k + '_' + i)
          };
        });
      }
      /* tiles */
      if ($$('[data-rep="TL"]').length) {
        C.tiles = $$('[data-rep="TL"]').map(function (r) {
          var i = r.getAttribute('data-i');
          return { label: val('tl_l_' + i), c: val('tl_c_' + i), cls: val('tl_k_' + i) };
        });
      }
      /* pages */
      $$('[data-pg]').forEach(function (e) {
        C.pages = C.pages || {};
        C.pages[e.getAttribute('data-pg')] = e.value;
      });
      /* areas */
      if ($$('[data-rep="AR"]').length) {
        C.areas = $$('[data-rep="AR"]').map(function (r) {
          var i = r.getAttribute('data-i');
          return { id: val('ar_i_' + i), name: val('ar_n_' + i), fee: +val('ar_f_' + i) || 0, eta: val('ar_e_' + i) };
        });
      }
      /* promos */
      if ($$('[data-pmt]').length) {
        var out = {};
        $$('[data-pmt]').forEach(function (e) {
          var k = e.getAttribute('data-pmt');
          var vIn = $('[data-pmv="' + k.replace(/"/g, '\\"') + '"]');
          var lIn = $('[data-pml="' + k.replace(/"/g, '\\"') + '"]');
          out[k] = {
            type: e.value,
            value: vIn ? (+vIn.value || 0) : 0,
            label: lIn ? lIn.value : ''
          };
        });
        C.promos = out;
      }
      return { content: C };
    }

    return {};
  }

  /* collect the whole `content` section from the settings view too */
  function collectSettings() {
    var got = collect('shop');
    D.shop = got.shop;
    D.content = got.content;
    return [
      saveSection('shop', D.shop, { silent: true }),
      saveSection('content', D.content, { silent: true })
    ];
  }

  /* ============================================================== الأحداث */
  function onClick(e) {
    var t = e.target;

    var nav = t.closest('[data-view]');
    if (nav) { S.view = nav.getAttribute('data-view'); S.editing = null; closeSide(); render(); return; }

    var sv = t.closest('[data-save]');
    if (sv) { doSave(sv.getAttribute('data-save')); return; }

    var rs = t.closest('[data-reset]');
    if (rs) { resetSection(rs.getAttribute('data-reset')); return; }

    /* --- الوضع المحلي: تصدير / مسح --- */
    if (t.closest('[data-export]')) { doExport(); return; }
    if (t.closest('[data-clearall]')) { doClearAll(); return; }

    /* --- المنتجات --- */
    var pe = t.closest('[data-pedit]');
    if (pe) { S.editing = pe.getAttribute('data-pedit'); viewProducts($('#panel')); $('#pForm').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    var pc = t.closest('[data-pcancel]');
    if (pc) { S.editing = null; viewProducts($('#panel')); return; }
    var ps = t.closest('[data-psave]');
    if (ps) { saveProduct(ps.getAttribute('data-psave')); return; }
    var pa = t.closest('#pAdd');
    if (pa) { S.editing = '__new__'; viewProducts($('#panel')); $('#pForm').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    var pd = t.closest('[data-pdel]');
    if (pd) { delProduct(pd.getAttribute('data-pdel')); return; }
    var pu = t.closest('[data-pdup]');
    if (pu) { dupProduct(pu.getAttribute('data-pdup')); return; }

    /* --- الماركات --- */
    var ba = t.closest('[data-badd]');
    if (ba) {
      D.brands.push({ id: 'brand-' + Date.now().toString(36), name: 'BRAND', nameAr: 'ماركة جديدة' });
      viewBrands($('#panel')); return;
    }
    var bd = t.closest('[data-bdel]');
    if (bd) {
      var bi = +bd.getAttribute('data-bdel');
      if (confirm('حذف الماركة "' + (D.brands[bi] || {}).nameAr + '"؟')) {
        D.brands.splice(bi, 1);
        viewBrands($('#panel'));
      }
      return;
    }

    /* --- الأقسام --- */
    var cd = t.closest('[data-cdel]');
    if (cd) {
      var ci = +cd.getAttribute('data-cdel');
      if (confirm('حذف القسم "' + (D.categories[ci] || {}).name + '"؟')) {
        D.categories.splice(ci, 1);
        viewCats($('#panel'));
      }
      return;
    }

    /* --- النصوص: إضافة --- */
    if (t.closest('[data-pladd]')) { (D.content.promoLines = D.content.promoLines || []).push('نص جديد'); viewText($('#panel')); return; }
    if (t.closest('[data-tradd]')) { (D.content.trust = D.content.trust || []).push({ i: 'star', t: 'ميزة', s: 'نص' }); viewText($('#panel')); return; }
    if (t.closest('[data-tkadd]')) { (D.content.ticker = D.content.ticker || []).push({ label: 'عنصر', href: 'collection.html?c=all' }); viewText($('#panel')); return; }
    if (t.closest('[data-hradd]')) { (D.content.hero = D.content.hero || []).push(blankHero()); viewText($('#panel')); return; }
    if (t.closest('[data-tladd]')) { (D.content.tiles = D.content.tiles || []).push({ c: 'luxury-perfumes', cls: 'tile--sq', label: 'عنوان' }); viewText($('#panel')); return; }
    if (t.closest('[data-aradd]')) { (D.content.areas = D.content.areas || []).push({ id: 'new', name: 'منطقة', fee: 20, eta: '24 ساعة' }); viewSettings($('#panel')); return; }
    if (t.closest('[data-haadd]')) {
      var hi = +t.closest('[data-haadd]').getAttribute('data-haadd');
      D.content.hero[hi].actions.push({ label: 'زر', href: 'collection.html?c=all', cls: 'btn--white btn--lg' });
      viewText($('#panel')); return;
    }
    if (t.closest('[data-pmadd]')) {
      var code = prompt('كود الخصم الجديد:');
      if (code) { D.content.promos[code.trim().toUpperCase()] = { type: 'pct', value: 10, label: 'خصم' }; viewSettings($('#panel')); }
      return;
    }

    /* --- النصوص: حذف مكرر --- */
    var rd = t.closest('[data-repdel]');
    if (rd) {
      var bits = rd.getAttribute('data-repdel').split('|');
      var kind = bits[0], idx = +bits[1];
      var arr = arrFor(kind);
      if (arr && confirm('حذف هذا العنصر؟')) { arr.splice(idx, 1); rerenderFor(kind); }
      return;
    }
    var pmd = t.closest('[data-pmdel]');
    if (pmd) { delete D.content.promos[pmd.getAttribute('data-pmdel')]; viewSettings($('#panel')); return; }

    /* --- الصور --- */
    var cp = t.closest('[data-copy]');
    if (cp) { copyText(cp.getAttribute('data-copy')); return; }
    var md = t.closest('[data-mdel]');
    if (md) { delMedia(md.getAttribute('data-mdel')); return; }

    /* --- الألوان --- */
    var th = t.closest('[data-th-reset]');
    if (th) {
      var tk = th.getAttribute('data-th-reset');
      var meta = (D.THEME_META || {})[tk];
      if (meta) {
        D.theme[tk] = { css: meta.css, def: meta.def, value: meta.def };
        if (D.applyTheme) D.applyTheme();
        viewTheme($('#panel'));
      }
      return;
    }
    if (t.closest('[data-theme-defaults]')) {
      if (confirm('إرجاع كل الألوان إلى قيم style.css؟')) {
        D.theme = clone(D.THEME_META);
        if (D.applyTheme) D.applyTheme();
        viewTheme($('#panel'));
      }
      return;
    }

    if (t.closest('#lgBtn')) { return; }
    if (t.closest('#logout')) { doLogout(); return; }
    if (t.closest('.burger')) { toggleSide(); return; }
    if (t.closest('.side__close') || t.closest('.scrim')) { closeSide(); return; }
  }

  function arrFor(kind) {
    var C = D.content;
    if (kind === 'PL') return C.promoLines;
    if (kind === 'TR') return C.trust;
    if (kind === 'TK') return C.ticker;
    if (kind === 'HR') return C.hero;
    if (kind === 'TL') return C.tiles;
    if (kind === 'AR') return C.areas;
    if (kind.slice(0, 2) === 'BN') return (C.banners || {})[kind.slice(2)];
    if (kind.slice(0, 2) === 'HA') return C.hero[+kind.slice(2)].actions;
    return null;
  }

  function rerenderFor(kind) {
    if (kind === 'AR' || kind === 'PL') { viewSettings($('#panel')); return; }
    viewText($('#panel'));
  }

  function blankHero() {
    return {
      c1: '#d94b8a', c2: '#7d2249', seed: 1,
      eyebrow: 'سطر علوي', title: 'عنوان <mark>العرض</mark>', text: 'نص الشريحة.',
      actions: [{ cls: 'btn--white btn--lg', href: 'collection.html?c=offers', label: 'تسوّق الآن' }]
    };
  }

  function delProduct(id) {
    var x = (D.products || []).filter(function (y) { return y.id === id; })[0];
    if (!x || !confirm('حذف "' + x.name + '" نهائياً؟')) return;
    D.products = D.products.filter(function (y) { return y.id !== id; });
    S.editing = null;
    setBusy(true);
    saveSection('products', D.products, { silent: true })
      .then(function () { viewProducts($('#panel')); toast('تم الحذف', 'ok'); })
      .catch(function (e) { toast(e.message, 'err'); })
      .then(function () { setBusy(false); });
  }

  function dupProduct(id) {
    var x = (D.products || []).filter(function (y) { return y.id === id; })[0];
    if (!x) return;
    var c = clone(x);
    c.id = x.id + '-copy-' + Date.now().toString(36).slice(-4);
    c.name = x.name + ' (نسخة)';
    D.products.push(c);
    setBusy(true);
    saveSection('products', D.products, { silent: true })
      .then(function () { viewProducts($('#panel')); toast('تم النسخ', 'ok'); })
      .catch(function (e) { toast(e.message, 'err'); })
      .then(function () { setBusy(false); });
  }

  function delMedia(path) {
    if (!confirm('حذف الصورة نهائياً؟\n' + path)) return;
    token().then(function (t) { return Store.deleteMedia(path, t); })
      .then(function () { toast('تم الحذف', 'ok'); loadMedia(); })
      .catch(function (e) { toast(e.message, 'err'); });
  }

  function copyText(s) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(s).then(function () { toast('نُسخ الرابط', 'ok'); },
        function () { toast('تعذر النسخ', 'err'); });
    } else {
      var i = doc.createElement('textarea');
      i.value = s; doc.body.appendChild(i); i.select();
      try { doc.execCommand('copy'); toast('نُسخ الرابط', 'ok'); } catch (e) { toast('تعذر النسخ', 'err'); }
      i.remove();
    }
  }

  function doSave(section) {
    var payload = collect(section);
    if (section === 'shop') {
      setBusy(true);
      Promise.all(collectSettings())
        .then(function () { toast('تم الحفظ', 'ok'); })
        .catch(function (e) { toast(e.message, 'err'); })
        .then(function () { setBusy(false); });
      return;
    }
    var ids = Object.keys(payload);
    if (!ids.length) { toast('لا يوجد تغيير', 'err'); return; }
    setBusy(true);
    Promise.all(ids.map(function (id) { return saveSection(id, payload[id], { silent: true }); }))
      .then(function () { toast('تم الحفظ', 'ok'); render(); })
      .catch(function (e) { toast(e.message, 'err'); })
      .then(function () { setBusy(false); });
  }

  function toggleSide() { $('.side').classList.toggle('is-open'); $('.scrim').classList.toggle('is-on'); }
  function closeSide() { $('.side').classList.remove('is-open'); $('.scrim').classList.remove('is-on'); }

  function onInput(e) {
    var t = e.target;
    if (t.id === 'pQ' || t.id === 'pCat') {
      clearTimeout(window.__t);
      window.__t = setTimeout(function () { viewProducts($('#panel')); focusSearch(); }, 260);
    }
  }
  function focusSearch() {
    var q = $('#pQ');
    if (q) { q.focus(); try { q.setSelectionRange(q.value.length, q.value.length); } catch (e) {} }
  }

  /* ================================================================ إقلاع */
  function init() {
    doc.addEventListener('click', onClick);
    doc.addEventListener('input', onInput);
    doc.addEventListener('change', function (e) {
      if (e.target.id === 'pCat') viewProducts($('#panel'));
    });
    $('#lgForm').addEventListener('submit', doLogin);

    /* وضع الحفظ المحلي: يعمل بلا Supabase، ويفتح مباشرة إلا إن وُجدت كلمة مرور */
    if (Store.isLocal()) {
      var mods = Object.keys(Store.remote || {}).length;
      bar('info', 'وضع الحفظ المحلي — تعديلاتك تُحفظ في هذا المتصفح. ' +
        (mods ? 'لديك ' + mods + ' قسم محفوظ. ' : 'ابدأ بالتعديل ثم اضغط «حفظ». ') +
        'لن تظهر للزوار حتى تُنزّل content.local.js وترفعه من «نظرة عامة».');

      if (!CFG.localPasscode) {
        S.session = localSession();
        S.token = 'local';
        showApp();
        return;
      }
      $('#lgSub').textContent = 'أدخل كلمة المرور الموضوعة في config.js';
      $('#lgEmail').style.display = 'none';
      $('#lgPass').focus();
      showLogin();
      return;
    }

    /* جلسة موجودة؟ */
    var sess = Store.session();
    if (!sess) { showLogin(); return; }

    Store.requireAdmin(sess).then(function (ok) {
      if (!ok) { Store.signOut(); showLogin(); return; }
      S.session = sess; S.token = sess.token;
      showApp();
    }).catch(function () { showLogin(); });
  }

  /* ننتظر انتهاء تحميل البيانات من Supabase قبل أول عرض للوحة */
  if (global.TCReady) {
    global.TCReady(function () {
      if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
      else init();
    });
  } else if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
