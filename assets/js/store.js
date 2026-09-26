/* ==========================================================================
   TONY COSMETICS - store.js
   طبقة البيانات: تقرأ المحتوى من Supabase وتدمجه فوق البيانات المدمجة.
   - لو Supabase غير مفعّل أو فشل الاتصال  =>  الموقع يشتغل بالبيانات المدمجة.
   - يحدّث window.TCData في مكانه حتى ما تتغير أي صفحة حالية.
   ========================================================================== */
(function (global) {
  'use strict';

  var CFG = global.TCConfig;

  /* الأقسام القابلة للتعديل — هذه هي مفاتيح جدول site_content */
  var SECTIONS = [
    'shop', 'brands', 'categories', 'filterOptions', 'nav', 'products',
    'reviews', 'pal', 'content', 'promos', 'areas', 'theme'
  ];

  /* الأقسام التي تُدمج مفتاحاً بمفتاح (حتى لو نسيها السيرفر لا تنكسر الصفحة).
     theme يُطبّق بشكل منفصل عبر applyTheme. */
  var SOFT_MERGE = {
    content: 1, shop: 1, filterOptions: 1, pal: 1, nav: 1, theme: 1
  };

  /* ------------------------------------------------------- deep utilities */
  function isPlain(o) {
    return o && typeof o === 'object' && !Array.isArray(o);
  }

  /*دمج عميق: القيم القادمة من السيرفر تغلب، والمفاتيح الناقصة تُملأ من الافتراضي.
     المصفوفات تُستبدل بالكامل (لا دمج جزئي) حتى الحذف يعمل بشكل صحيح. */
  function merge(base, over) {
    if (over === undefined || over === null) return base;
    if (Array.isArray(over)) return over.slice();
    if (!isPlain(over)) return over;
    if (!isPlain(base)) return over;
    var out = {};
    var k;
    for (k in base) if (Object.prototype.hasOwnProperty.call(base, k)) out[k] = base[k];
    for (k in over) if (Object.prototype.hasOwnProperty.call(over, k)) {
      out[k] = (k in base) ? merge(base[k], over[k]) : over[k];
    }
    return out;
  }

  /* ---------------------------------------------- Supabase REST (no SDK)
     api()  يستخدم /rest/v1/  لقراءة وتعديل جداول قاعدة البيانات.
     raw()  يستخدم /auth/v1/ و /storage/v1/  لأنهما ليسا تحت rest. */

  function headers(token, extra) {
    var h = {
      apikey: CFG.supabaseAnon,
      Authorization: 'Bearer ' + (token || CFG.supabaseAnon)
    };
    var k;
    for (k in extra || {}) if (Object.prototype.hasOwnProperty.call(extra, k)) h[k] = extra[k];
    return h;
  }

  /* نداء لـ /auth/v1/ أو /storage/v1/ بدون بادئة rest */
  function raw(service, path, opts) {
    if (!CFG || !CFG.supabaseUrl) return Promise.reject(new Error('لم يتم ضبط رابط Supabase في config.js'));
    opts = opts || {};
    var url = CFG.supabaseUrl + '/' + service + '/v1/' + path;
    var h = headers(opts.token, { 'Content-Type': 'application/json' });
    if (opts.prefer) h.Prefer = opts.prefer;
    return fetch(url, {
      method: opts.method || 'GET',
      headers: h,
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });
  }

  function api(path, opts) {
    if (!CFG || !CFG.supabaseUrl) return Promise.reject(new Error('لم يتم ضبط رابط Supabase في config.js'));
    opts = opts || {};
    var url = CFG.supabaseUrl + '/rest/v1/' + path;
    var h = headers(opts.token, { 'Content-Type': 'application/json' });
    if (opts.prefer) h.Prefer = opts.prefer;
    return fetch(url, {
      method: opts.method || 'GET',
      headers: h,
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });
  }

  function readAll(token) {
    var cols = SECTIONS.map(function (s) { return s; }).join(',');
    return api(CFG.table + '?select=id,data', { token: token })
      .then(function (r) {
        if (!r.ok) throw new Error('read failed ' + r.status);
        return r.json();
      })
      .then(function (rows) {
        var out = {};
        rows.forEach(function (row) {
          if (row && row.id && row.data !== null && row.data !== undefined) out[row.id] = row.data;
        });
        return out;
      });
  }

  function writeSection(id, data, token) {
    return api(CFG.table, {
      method: 'POST',
      token: token,
      prefer: 'resolution=merge-duplicates,return=representation',
      body: { id: id, data: data, updated_at: new Date().toISOString() }
    }).then(function (r) {
      if (!r.ok) throw new Error('save failed ' + r.status + ' ' + r.statusText);
      return r.json();
    });
  }

  /* =================================================== الحفظ المحلي (بدون Supabase)
     عند غياب بيانات الاتصال نحفظ الأقسام في localStorage بدلSupabase،
     فتحصل اللوحة على حفظ حقيقي داخل المتصفح. ولتعميم التعديلات على الزوار
     تُصدِّر اللوحة ملف content.local.js يُرفع alongside البيانات. */
  var LS_PREFIX = 'tc_local_';
  var LS_MEDIA = 'tc_media_';

  function lsGet(key) {
    try { var s = localStorage.getItem(key); return s === null ? undefined : JSON.parse(s); }
    catch (e) { return undefined; }
  }
  function lsSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch (e) {
      throw new Error('مساحة التخزين ممتلئة — احذف صوراً أو أعد تعيين قسم، أو اربط Supabase');
    }
  }
  function lsDel(key) { try { localStorage.removeItem(key); } catch (e) {} }

  /* كل الأقسام المحفوظة محلياً */
  function lsAll() {
    var out = {};
    SECTIONS.forEach(function (s) {
      var v = lsGet(LS_PREFIX + s);
      if (v !== undefined) out[s] = v;
    });
    return out;
  }
  function lsClearAll() {
    SECTIONS.forEach(function (s) { lsDel(LS_PREFIX + s); });
  }
  function lsMediaList() {
    var out = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(LS_MEDIA) === 0) {
          var v = lsGet(k);
          if (v && v.url) out.push({ path: k.slice(LS_MEDIA.length), url: v.url, size: v.size, created: v.created });
        }
      }
    } catch (e) {}
    return out.sort(function (a, b) { return (b.created || 0) - (a.created || 0); });
  }
  function readFileAsDataUrl(file) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(r.result); };
      r.onerror = function () { rej(new Error('تعذّر قراءة الصورة')); };
      r.readAsDataURL(file);
    });
  }

  /* ================================================================ store */
  var Store = {
    SECTIONS: SECTIONS,
    remote: {},          /* آخر محتوى قادم من السيرفر أو التخزين المحلي */
    status: 'idle',      /* idle | loading | remote | local | error */
    error: null,

    /* Configuration ------------------------------------------------- */
    isEnabled: function () { return !!(CFG && CFG.enabled); },
    /* وضع الحفظ المحلي — يعمل بلا Supabase */
    isLocal: function () { return !Store.isEnabled(); },
    localOnly: function () { return Store.isLocal() && !!(CFG && CFG.localPasscode); },

    /* Load: read-only ------------------------------------------------ */
    load: function (token) {
      var self = this;
      if (!self.isEnabled()) {
        self.remote = lsAll();
        self.apply(self.remote);
        self.status = 'local';
        return Promise.resolve(false);
      }
      self.status = 'loading';
      return readAll(token).then(function (rows) {
        self.remote = rows;
        self.apply(rows);
        self.status = 'remote';
        return true;
      }).catch(function (e) {
        self.status = 'error';
        self.error = e && e.message;
        return false;
      });
    },

    /* ادمج المحتوى القادم فوق window.TCData في مكانه */
    apply: function (rows) {
      var D = global.TCData;
      if (!D) return;
      for (var k in rows) {
        if (!Object.prototype.hasOwnProperty.call(rows, k)) continue;
        if (k === 'theme') continue;               /* يُطبّق بعد الدمج */
        if (SOFT_MERGE[k]) {
          D[k] = merge(D[k], rows[k]);
        } else {
          D[k] = rows[k];
        }
      }
      if (rows.theme) Store.applyTheme(rows.theme);
    },

    /* تطبيق الألوان على :root عبر TCData.applyTheme */
    applyTheme: function (theme) {
      var D = global.TCData;
      if (D && D.theme) D.theme = merge(D.theme, theme || {});
      if (D && typeof D.applyTheme === 'function') D.applyTheme();
    },

    /* تطبيق قسم على window.TCData في مكانه (يُستخدم بعد الحفظ) */
    applySection: function (id, data) {
      var D = global.TCData;
      if (!D) return;
      if (id === 'theme') { Store.applyTheme(data); return; }
      if (SOFT_MERGE[id]) D[id] = merge(D[id], data);
      else D[id] = data;
    },

    /* كتابة قسم (للوحة التحكم) — محلياً أو في Supabase */
    save: function (id, data, token) {
      var self = this;
      if (!self.isEnabled()) {
        try { lsSet(LS_PREFIX + id, data); }
        catch (e) { return Promise.reject(e); }
        self.remote[id] = data;
        self.applySection(id, data);
        return Promise.resolve(true);
      }
      return writeSection(id, data, token).then(function () {
        self.remote[id] = data;
        Store.applySection(id, data);
        return true;
      });
    },

    /* حذف قسم (إرجاعه للافتراضي) */
    reset: function (id, token) {
      if (!this.isEnabled()) {
        lsDel(LS_PREFIX + id);
        delete this.remote[id];
        return Promise.resolve(true);
      }
      return api(CFG.table + '?id=eq.' + encodeURIComponent(id), { method: 'DELETE', token: token })
        .then(function (r) {
          if (!r.ok) throw new Error('reset failed ' + r.status);
          delete this.remote[id];
          return true;
        });
    },

    /* مسح كل التعديلات المحلية (العودة إلى محتوى data.js الأصلي) */
    clearLocal: function () {
      lsClearAll();
      this.remote = {};
      return true;
    },

    /* ------------------------------------------------------ export ------
       يولّد ملف content.local.js يحوي كل التعديلات المحلية مدمجة فوق
       data.js. ارفعه إلى assets/js/ وأضف سطراً في صفحات الموقع ليظهر
       التعديل لكل الزوار. */
    exportSource: function () {
      var rows = lsAll();
      var keys = Object.keys(rows);
      var date = new Date().toISOString().slice(0, 10);
      var head =
        '/* ============================================================\n' +
        '   TONY COSMETICS — محتوى محفوظ محلياً\n' +
        '   تاريخ التصدير: ' + date + '\n' +
        '   الأقسام: ' + (keys.length ? keys.join(', ') : '(لا يوجد)') + '\n' +
        '   \n' +
        '   هذا الملف يطبّق تعديلاتك فوق محتوى data.js. ارفعه إلى assets/js/\n' +
        '   وأضف السطر التالي بعد data.js في كل صفحة HTML:\n' +
        '   <script src="assets/js/content.local.js"></script>\n' +
        '   ============================================================ */\n' +
        '(function (global) {\n' +
        '  \'use strict\';\n' +
        '  var D = global.TCData;\n' +
        '  if (!D) return;\n' +
        '  var OVERRIDES = ';
      var body = JSON.stringify(rows, null, 2);
      var tail =
        ';\n' +
        '  var SOFT = { content:1, shop:1, filterOptions:1, pal:1, nav:1 };\n' +
        '  function isPlain(o){ return o && typeof o === \'object\' && !Array.isArray(o); }\n' +
        '  function merge(base, over){\n' +
        '    if (over === undefined || over === null) return base;\n' +
        '    if (Array.isArray(over)) return over.slice();\n' +
        '    if (!isPlain(over)) return over;\n' +
        '    if (!isPlain(base)) return over;\n' +
        '    var out = {}, k;\n' +
        '    for (k in base) if (Object.prototype.hasOwnProperty.call(base,k)) out[k] = base[k];\n' +
        '    for (k in over) if (Object.prototype.hasOwnProperty.call(over,k)) {\n' +
        '      out[k] = (k in base) ? merge(base[k], over[k]) : over[k];\n' +
        '    }\n' +
        '    return out;\n' +
        '  }\n' +
        '  for (var k in OVERRIDES) {\n' +
        '    if (!Object.prototype.hasOwnProperty.call(OVERRIDES, k)) continue;\n' +
        '    if (k === \'theme\') continue;\n' +
        '    D[k] = SOFT[k] ? merge(D[k], OVERRIDES[k]) : OVERRIDES[k];\n' +
        '  }\n' +
        '  if (OVERRIDES.theme && typeof D.applyTheme === \'function\') {\n' +
        '    D.theme = merge(D.theme, OVERRIDES.theme);\n' +
        '    D.applyTheme();\n' +
        '  }\n' +
        '})(window);\n';
      return head + body + tail;
    },

    /* حجم المحتوى المحفوظ محلياً بالكيلوبايت */
    localSize: function () {
      var n = 0;
      try {
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i) || '';
          if (k.indexOf(LS_PREFIX) === 0 || k.indexOf(LS_MEDIA) === 0) n += (localStorage.getItem(k) || '').length;
        }
      } catch (e) {}
      return Math.round(n / 1024);
    },

    /* ---------------------------------------------------------- media --- */
    /* رفع صورة: يعيد {path, url} */
    /* رفع صورة: يعيد {path, url} — محلياً تُحفظ كـ data URL داخل المتصفح */
    upload: function (file, token) {
      var self = this;
      if (!/^image\//.test(file.type || '')) return Promise.reject(new Error('الملف المختار ليس صورة'));
      if (file.size > 5 * 1024 * 1024) return Promise.reject(new Error('حجم الصورة أكبر من 5 ميجابايت'));
      var ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      var path = Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;

      if (self.isLocal()) {
        return readFileAsDataUrl(file).then(function (url) {
          try { lsSet(LS_MEDIA + path, { url: url, size: file.size, created: Date.now() }); }
          catch (e) { return Promise.reject(e); }
          return { path: path, url: url };
        });
      }

      if (!self.isEnabled()) return Promise.reject(new Error('Supabase غير مفعّل'));
      if (!token) return Promise.reject(new Error('يجب تسجيل الدخول'));
      return raw('storage', 'object/' + CFG.bucket + '/' + path, {
        method: 'POST',
        token: token,
        body: file
      }).then(function (r) {
        if (!r.ok) return r.text().then(function (t) {
          throw new Error('رفع الصورة فشل ' + r.status + ' ' + t);
        });
        return { path: path, url: publicUrl(path) };
      });
    },

    listMedia: function (token) {
      if (this.isLocal()) return Promise.resolve(lsMediaList());
      if (!this.isEnabled()) return Promise.resolve([]);
      return raw('storage', 'object/list/' + CFG.bucket, {
        method: 'POST', token: token, body: { limit: 300, sortBy: { column: 'name', order: 'desc' } }
      }).then(function (r) { return r.ok ? r.json() : []; })
        .then(function (list) {
          return (list || []).map(function (o) {
            return {
              path: o.name,
              url: publicUrl(o.name),
              size: o.metadata && o.metadata.size,
              created: o.created_at || o.updated_at
            };
          });
        })
        .catch(function () { return []; });
    },

    deleteMedia: function (path, token) {
      if (this.isLocal()) { lsDel(LS_MEDIA + path); return Promise.resolve(true); }
      if (!this.isEnabled()) return Promise.reject(new Error('Supabase غير مفعّل'));
      if (!token) return Promise.reject(new Error('يجب تسجيل الدخول'));
      var enc = String(path).split('/').map(encodeURIComponent).join('/');
      return raw('storage', 'object/' + CFG.bucket + '/' + enc, { method: 'DELETE', token: token })
        .then(function (r) {
          if (!r.ok) return r.text().then(function (t) { throw new Error('حذف الصورة فشل ' + r.status + ' ' + t); });
          return true;
        });
    },

    /* ----------------------------------------------------------- auth --- */
    signIn: function (email, pass) {
      if (!this.isEnabled()) return Promise.reject(new Error('Supabase غير مفعّل'));
      return raw('auth', 'token?grant_type=password', {
        method: 'POST', body: { email: email, password: pass }
      }).then(function (r) {
        return r.json().then(function (j) {
          if (!r.ok) throw new Error(j.error_description || j.msg || 'بيانات الدخول غير صحيحة');
          return { token: j.access_token, refresh: j.refresh_token, user: j.user, expires: Date.now() + ((j.expires_in || 3600) * 1000) };
        });
      }).then(function (s) {
        return Store.requireAdmin(s).then(function (ok) {
          if (!ok) { Store.signOut(); throw new Error('هذا البريد ليس حساب إدارة للمتجر'); }
          return s;
        });
      });
    },

    /* جدول الحسابات الإدارية — غير مقروء للزوار (سياسة RLS في schema.sql).
       بريد المستخدم alone لا يكفي: لازم يوجد صف له في الجدول. */
    isAdminEmail: function (email, token) {
      if (!this.isEnabled()) return Promise.resolve(false);
      var e = String(email || '').toLowerCase().trim();
      if (!e || !token) return Promise.resolve(false);
      return api(CFG.adminTable + '?email=eq.' + encodeURIComponent(e) + '&select=email', { token: token })
        .then(function (r) { return r.ok ? r.json() : []; })
        .then(function (rows) { return !!(rows && rows.length); })
        .catch(function () { return false; });
    },

    requireAdmin: function (session) {
      if (!session || !session.user) return Promise.resolve(false);
      return Store.isAdminEmail(session.user.email, session.token)
        .then(function (ok) { return !!ok; });
    },

    /* تجديد الرمز قبل انتهائه — يحتاج refresh token */
    ensureToken: function (session) {
      if (!session) return Promise.reject(new Error('لا توجد جلسة'));
      if (!session.expires || Date.now() < session.expires - 60000) return Promise.resolve(session);
      if (!session.refresh) return Promise.reject(new Error('انتهت الجلسة، سجّل الدخول من جديد'));
      return raw('auth', 'token?grant_type=refresh_token', {
        method: 'POST', body: { refresh_token: session.refresh }
      }).then(function (r) {
        return r.json().then(function (j) {
          if (!r.ok) { Store.signOut(); throw new Error('انتهت الجلسة، سجّل الدخول من جديد'); }
          var s = {
            token: j.access_token,
            refresh: j.refresh_token || session.refresh,
            user: j.user || session.user,
            expires: Date.now() + ((j.expires_in || 3600) * 1000)
          };
          Store.saveSession(s.token, s.user, s.refresh, s.expires);
          return s;
        });
      });
    },

    signOut: function () {
      try { sessionStorage.removeItem('tc_admin_token'); } catch (e) {}
      try { sessionStorage.removeItem('tc_admin_user'); } catch (e) {}
      try { sessionStorage.removeItem('tc_admin_refresh'); } catch (e) {}
      try { sessionStorage.removeItem('tc_admin_exp'); } catch (e) {}
    },

    session: function () {
      try {
        var t = sessionStorage.getItem('tc_admin_token');
        if (!t) return null;
        var u = sessionStorage.getItem('tc_admin_user');
        var rf = sessionStorage.getItem('tc_admin_refresh');
        var ex = parseInt(sessionStorage.getItem('tc_admin_exp') || '0', 10);
        return { token: t, user: u ? JSON.parse(u) : null, refresh: rf, expires: ex };
      } catch (e) { return null; }
    },

    saveSession: function (token, user, refresh, expires) {
      try {
        sessionStorage.setItem('tc_admin_token', token);
        sessionStorage.setItem('tc_admin_user', JSON.stringify(user || null));
        if (refresh) sessionStorage.setItem('tc_admin_refresh', refresh);
        if (expires) sessionStorage.setItem('tc_admin_exp', String(expires));
      } catch (e) {}
    }
  };

  function publicUrl(path) {
    return CFG.supabaseUrl + '/storage/v1/object/public/' + CFG.bucket + '/' + path;
  }
  Store.publicUrl = publicUrl;

  /* ================================================================ ready
     TCReady(fn, priority)  —  ينفّذ fn بعد تحميل البيانات.
     الأولوية الأصغر تُنفَّذ أولاً. الافتراضي 100.
     app.js يستخدم 200 لأنه يجب أن يكون آخر شيء (يخفي صفحة is-ready). */
  var queue = [];
  var phase = 'loading';   /* loading | ready */

  function TCReady(fn, priority) {
    if (phase === 'ready') { run(fn); return; }
    queue.push({ fn: fn, p: (typeof priority === 'number' ? priority : 100), n: queue.length });
    queue.sort(function (a, b) { return (a.p - b.p) || (a.n - b.n); });
  }
  function run(fn) {
    try { fn(); } catch (e) { if (global.console) console.error('[ready]', e); }
  }
  function flush() {
    phase = 'ready';
    while (queue.length) run(queue.shift().fn);
  }
  TCReady.status = function () { return Store.status; };
  TCReady.enabled = function () { return Store.isEnabled(); };
  global.TCReady = TCReady;

  global.TCStore = Store;

  /* تشغيل التحميل فوراً — يجب أن يسبق تنفيذ أي TCReady */
  var token = null;
  var sess = Store.session();
  if (sess) token = sess.token;

  Store.load(token).then(flush, flush);
})(window);
