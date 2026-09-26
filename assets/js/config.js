/* ==========================================================================
   TONY COSMETICS - config.js
   إعدادات الاتصال بقاعدة البيانات.

   >>> لتفعيل لوحة التحكم املأ البيانات التالية من Supabase <<<
   >>> اتركها فارغة ليعمل الموقع بالبيانات المدمجة بدون إنترنت  <<<
   ========================================================================== */
(function (global) {
  'use strict';

  var SUPABASE_URL = '';        // مثال: https://xxxxxxxxxxxx.supabase.co
  var SUPABASE_ANON = '';       // anon public key
  var TABLE_CONTENT = 'site_content';
  var TABLE_ADMIN = 'admin_accounts';
  var BUCKET_MEDIA = 'media';

  /* كلمة مرور اختيارية للوحة عند العمل بلا Supabase.
     اتركها فارغة لفتح اللوحة مباشرة. هذه حماية بسيطة فقط —
     أي شخص يقرأ ملفات الموقع يستطيع تجاوزها. */
  var LOCAL_PASSCODE = '';

  global.TCConfig = {
    supabaseUrl: SUPABASE_URL.trim(),
    supabaseAnon: SUPABASE_ANON.trim(),
    table: TABLE_CONTENT,
    adminTable: TABLE_ADMIN,
    bucket: BUCKET_MEDIA,
    localPasscode: LOCAL_PASSCODE.trim(),

    /* true فقط إذا بيانات الاتصال موجودة */
    get enabled() {
      return /^https:\/\/.+\.supabase\.co$/.test(this.supabaseUrl) && this.supabaseAnon.length > 20;
    },

    /* وضع الحفظ داخل المتصفح — يُستخدم تلقائياً عند غياب Supabase */
    get local() { return !this.enabled; }
  };
})(window);
