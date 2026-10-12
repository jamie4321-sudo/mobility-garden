-- 모빌리티 가든: 기록 삭제 (총괄 관리자 전용)
-- 이 파일은 틀입니다. 실제 실행본은 build.mjs 가 만드는 src/delete.filled.sql(열쇠 포함, 저장소 제외)을 쓰세요.
-- 삭제는 x-mg-token 에 더해, 총괄 관리자 계정에만 들어 있는 x-mg-master 열쇠가 맞을 때만 됩니다.

drop policy if exists mg_records_delete on public.mg_records;
create policy mg_records_delete on public.mg_records for delete to anon
  using (coalesce(current_setting('request.headers', true)::json->>'x-mg-token', '') = '__MG_TOKEN__'
         and coalesce(current_setting('request.headers', true)::json->>'x-mg-master', '') = '__MG_MASTER__');

grant delete on public.mg_records to anon;
