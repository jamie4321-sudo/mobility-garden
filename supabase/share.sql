-- 모빌리티 가든: 월간 리포트 공개 링크 저장 허용
-- 이 파일은 틀입니다. 실제 실행본은 build.mjs 가 만드는 src/share.filled.sql 을 쓰세요. 여러 번 실행해도 안전합니다.
--
-- 공개 링크 = r.html#<보관 이름>.<열쇠>. 리포트 사본은 암호화된 파일(application/octet-stream)로
-- mg-photos 버킷의 share/ 아래에 올라갑니다. 올리기는 기존 정책 그대로 x-mg-token 이 맞을 때만 됩니다.

update storage.buckets
   set allowed_mime_types = array['image/jpeg','image/png','image/webp','application/octet-stream']
 where id = 'mg-photos';
