-- 모빌리티 가든: 사진 저장소 (Supabase Storage)
-- 이 파일은 틀입니다. 실제 실행본은 build.mjs 가 만드는 src/storage.filled.sql(토큰 포함, 저장소 제외)을 쓰세요.
-- SQL Editor 에 붙여넣고 Run. 여러 번 실행해도 안전합니다.
--
-- 사진은 추측할 수 없는 긴 파일 이름(UUID)으로 저장하고, 그 주소는 토큰이 있어야 읽히는 mg_records 안에만 있습니다.
-- 버킷은 '공개 읽기'라 주소를 아는 경우에만 열리고, 목록 보기는 막혀 있습니다. 올리기는 x-mg-token 이 맞을 때만 됩니다.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('mg-photos', 'mg-photos', true, 3145728, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists mg_photos_insert on storage.objects;
create policy mg_photos_insert on storage.objects for insert to anon
  with check (bucket_id = 'mg-photos'
              and (coalesce(current_setting('request.headers', true)::json->>'x-mg-token', '') = '__MG_TOKEN__'));
