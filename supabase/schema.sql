-- ===========================================================================
--  TONY COSMETICS — supabase/schema.sql
--  شغّل هذا الملف مرة واحدة في Supabase SQL Editor.
--
--  ما ينشئه:
--    1) جدول site_content  — كل أقسام الموقع القابلة للتعديل
--    2) جدول admin_accounts — البريد الإداري الوحيد المسموح له بالكتابة
--    3) سياسات RLS         — الزوار يقرأون فقط، الإداري وحده يكتب
--    4) حاوية media        — صور عامة للقراءة، الكتابة للإداري فقط
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1) جدول المحتوى
-- ---------------------------------------------------------------------------
create table if not exists public.site_content (
  id         text primary key,
  data       jsonb        not null default '{}'::jsonb,
  updated_at timestamptz  not null default now()
);

comment on table public.site_content is
  'محتوى الموقع: كل صف قسم (shop, products, content, theme, ...) بعمود id';

-- ---------------------------------------------------------------------------
-- 2) جدول الحسابات الإدارية
--    الزائر لا يستطيع قراءته إطلاقاً، والإداري يقرأ صفّه فقط.
--    هذا ما يمنع أي شخص غير مسجّل من استخدام لوحة التحكم.
-- ---------------------------------------------------------------------------
create table if not exists public.admin_accounts (
  email      text primary key,
  created_at timestamptz not null default now()
);

comment on table public.admin_accounts is
  'البريد الإداري الوحيد. أضف صفاً واحداً فقط هنا.';

-- ---------------------------------------------------------------------------
-- 3) دالة مساعدة: هل المستخدم الحالي إداري؟
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_accounts a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- ---------------------------------------------------------------------------
-- 4) سياسات site_content
--    • القراءة متاحة للجميع بدون تسجيل دخول (الموقع لازم يشتغل للزوار).
--    • الكتابة للإداري فقط.
-- ---------------------------------------------------------------------------
alter table public.site_content enable row level security;

drop policy if exists "site_content_public_read" on public.site_content;
create policy "site_content_public_read"
  on public.site_content for select
  to anon, authenticated
  using (true);

drop policy if exists "site_content_admin_write" on public.site_content;
create policy "site_content_admin_write"
  on public.site_content for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 5) سياسات admin_accounts
--    • الإداري يقرأ صفّه فقط (ليعرف أنه إداري).
--    • لا أحد يعدّل هذا الجدول من الواجهة — فقط من SQL Editor.
-- ---------------------------------------------------------------------------
alter table public.admin_accounts enable row level security;

drop policy if exists "admin_read_own" on public.admin_accounts;
create policy "admin_read_own"
  on public.admin_accounts for select
  to authenticated
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- لا توجد سياسة insert/update/delete: التعديل يدوي من SQL Editor فقط.

-- ---------------------------------------------------------------------------
-- 6) حاوية الصور
--    • عامة القراءة => صور المنتجات تعمل في <img> مباشرة.
--    • الرفع والحذف للإداري فقط.
--    • إذا فشلت هذه الخطوة، أنشئ الحاوية يدوياً من Storage وفعّل "Public bucket".
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media', 'media', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/svg+xml']
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "media_public_read" on storage.objects;
create policy "media_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'media');

drop policy if exists "media_admin_insert" on storage.objects;
create policy "media_admin_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'media' and public.is_admin());

drop policy if exists "media_admin_update" on storage.objects;
create policy "media_admin_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'media' and public.is_admin())
  with check (bucket_id = 'media' and public.is_admin());

drop policy if exists "media_admin_delete" on storage.objects;
create policy "media_admin_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'media' and public.is_admin());

-- ---------------------------------------------------------------------------
-- 7) أضف بريدك الإداري
--    >>> غيّر البريد ثم شغّل السطر <<<
-- ---------------------------------------------------------------------------
-- insert into public.admin_accounts (email) values ('your@email.com');
