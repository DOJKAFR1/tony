/* ==========================================================================
   TONY COSMETICS — info.js
   Shared chrome for static content pages: sidebar nav, breadcrumbs, and
   dynamic bits (contact form validation, FAQ accordions).
   ========================================================================== */
(function (global) {
  'use strict';

  var TC = global.TC;
  var D = global.TCData;
  var $ = TC.$, esc = TC.esc;

  /* Pages that share the info layout, in sidebar order. */
  var PAGES = [
    { id: 'about',    href: 'about.html',    label: 'عن تونى كوزمتكس', icon: 'info' },
    { id: 'shipping', href: 'shipping.html', label: 'الشحن والتوصيل', icon: 'truck' },
    { id: 'returns',  href: 'returns.html',  label: 'الاستبدال والإرجاع', icon: 'refresh' },
    { id: 'faq',      href: 'faq.html',      label: 'الأسئلة الشائعة', icon: 'headset' },
    { id: 'contact',  href: 'contact.html',  label: 'تواصل معنا', icon: 'mail' }
  ];

  function current() {
    var f = location.pathname.split('/').pop() || 'index.html';
    return f.replace('.html', '');
  }

  /* ------------------------------------------------------- page mounting
     محتوى كل صفحة (about/shipping/returns/faq/contact) مخزّن في
     D.content.pages ويصل من لوحة التحكم، فيجب حقنه قبل تشغيل أي
     منطق آخر لأن breadcrumbs والنموذج موجودان داخله. */
  function mountPage() {
    var slot = $('[data-page-body]');
    if (!slot) return;
    var id = slot.getAttribute('data-page-body');
    var pages = (D.content && D.content.pages) || {};
    var html = pages[id];
    if (typeof html === 'string' && html.trim()) slot.innerHTML = html;
    /* إذا لم يوجد محتوى مخزّن تبقى الصفحة فارغة — نبلغ في الكونسول */
    else if (global.console) console.warn('[info] لا يوجد محتوى مخزّن للصفحة: ' + id);
  }

  /* شريط المزايا في صفحة "عن تونى" — نفس بيانات شريط الثقة في الرئيسية */
  function renderFeatures() {
    var slot = $('[data-features]');
    if (!slot) return;
    var list = (D.content && D.content.trust) || [];
    if (!list.length) return;
    slot.innerHTML = list.map(function (f) {
      return '<div class="feature">' +
        '<span class="feature__icon">' + TC.icon(f.i) + '</span>' +
        '<span><span class="feature__title">' + esc(f.t) + '</span>' +
        '<span class="feature__text">' + esc(f.s) + '</span></span>' +
      '</div>';
    }).join('');
  }

  function renderNav() {
    var slot = $('[data-info-nav]');
    if (!slot) return;
    var cur = current();
    slot.innerHTML = PAGES.map(function (p) {
      return '<a href="' + p.href + '"' + (p.id === cur ? ' class="is-active" aria-current="page"' : '') + '>' +
        TC.icon(p.icon) + esc(p.label) + '</a>';
    }).join('');
  }

  function renderCrumbs() {
    var slot = $('[data-crumbs]');
    if (!slot) return;
    var cur = current();
    var page = PAGES.filter(function (p) { return p.id === cur; })[0];
    slot.innerHTML =
      '<a href="index.html">الرئيسية</a>' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg>' +
      (page ? '<span class="crumbs__now">' + esc(page.label) + '</span>' : '');
  }

  /* --------------------------------------------------------- contact form */
  function initContact() {
    var form = $('[data-contact-form]');
    if (!form) return;

    function mark(el, ok) {
      var f = el.closest('.field');
      if (f) f.classList.toggle('is-bad', !ok);
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.elements.name.value.trim();
      var phone = form.elements.phone.value.trim();
      var msg = form.elements.msg.value.trim();
      var okName = name.length >= 2;
      var okPhone = /^0?5[0-9]{8}$/.test(phone.replace(/[\s-]/g, ''));
      var okMsg = msg.length >= 10;

      mark(form.elements.name, okName);
      mark(form.elements.phone, okPhone);
      mark(form.elements.msg, okMsg);

      if (!(okName && okPhone && okMsg)) {
        TC.toast('يرجى إكمال الحقول المطلوبة بشكل صحيح', 'err');
        return;
      }

      var btn = $('[data-contact-send]', form);
      btn.disabled = true;
      btn.textContent = 'جارٍ الإرسال…';

      setTimeout(function () {
        form.innerHTML =
          '<div class="order-done" style="border:0;background:transparent;padding:20px 0">' +
            '<div class="order-done__ico">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>' +
            '</div>' +
            '<h2 class="h-md">وصلتنا رسالتك، ' + esc(name) + '!</h2>' +
            '<p class="muted" style="margin-top:10px;max-width:420px;margin-inline:auto">شكراً لتواصلك مع تونى كوزمتكس. فريقنا سيرد عليك خلال 24 ساعة عمل على الرقم ' + esc(phone) + '.</p>' +
            '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:20px">' +
              '<a class="btn btn--primary" href="https://wa.me/' + D.shop.whatsapp + '" target="_blank" rel="noopener">أسرع رد عبر واتساب</a>' +
              '<button class="btn btn--light" type="button" onclick="location.reload()">إرسال رسالة أخرى</button>' +
            '</div>' +
          '</div>';
        TC.toast('تم إرسال رسالتك بنجاح');
      }, 700);
    });
  }

  function boot() {
    mountPage();
    if (!$('[data-info-nav]') && !$('[data-contact-form]') && !$('[data-crumbs]') && !$('[data-features]')) return;
    renderNav();
    renderCrumbs();
    renderFeatures();
    initContact();
  }

  /* priority 100 (default) so it runs before app.js boot (200) */
  if (global.TCReady) global.TCReady(function () {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  });
  else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
