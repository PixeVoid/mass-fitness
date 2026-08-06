-- ---------------------------------------------------------------------------
-- 0011 — images for blog posts
-- ---------------------------------------------------------------------------
-- Posts were text only. A fitness article without a picture of the movement it
-- describes is a worse article, and the index page was a wall of headings.
--
-- Two halves: somewhere to put the file, and a column saying which file a post
-- leads with. Body images reuse the same bucket through markdown, so there is
-- one place images live rather than a cover system and a separate body system.
-- ---------------------------------------------------------------------------

alter table public.posts
  add column if not exists cover_image_url text,
  -- Not optional in spirit. Alt text is what a screen reader reads and what
  -- search engines index, and the only moment anyone will write it is while
  -- uploading — so the form asks then, and this column holds the answer.
  add column if not exists cover_image_alt text;

comment on column public.posts.cover_image_alt is
  'Describes the image for screen readers. Empty means decorative.';

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------
-- A public bucket: these are illustrations on a public blog, and a signed URL
-- for each one would mean the index page could not be cached and every image
-- would expire. Public here means "readable by URL", not "writable" — the
-- policies below are what decide who can put something in it.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-images',
  'post-images',
  true,
  -- 5 MB. Comfortably more than a well-exported article image needs, and low
  -- enough that a phone photo straight off the camera is rejected rather than
  -- silently becoming a 12 MB page weight.
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Anyone may read. The bucket is already public, so this states the same thing
-- for the object policies rather than leaving read to depend on bucket config
-- alone — two settings that must agree is a setting that will eventually
-- disagree.
drop policy if exists "post images: public read" on storage.objects;
create policy "post images: public read"
  on storage.objects for select
  using (bucket_id = 'post-images');

-- Writes are admin-only. `is_admin()` is the same security-definer function
-- every other admin policy uses, so there is one definition of who that is.
drop policy if exists "post images: admin write" on storage.objects;
create policy "post images: admin write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'post-images' and public.is_admin());

drop policy if exists "post images: admin update" on storage.objects;
create policy "post images: admin update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'post-images' and public.is_admin())
  with check (bucket_id = 'post-images' and public.is_admin());

drop policy if exists "post images: admin delete" on storage.objects;
create policy "post images: admin delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'post-images' and public.is_admin());
