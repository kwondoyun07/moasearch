# 모아서치 — 앞으로 할 일 (TODO)

> 최종 업데이트: 2026-06-25
> 코드는 대부분 완료·푸시됨(master). 아래는 **남은 사용자 설정**과 **구현 예정 기능**.

## 0. 현재 상태 한눈에
- **배포**: Cloudflare Worker `moasearch`(GitHub `kwondoyun07/moasearch` 연결, `moasearch.bluehab28.workers.dev`) — 정적자산(dist) + `/api/*` Functions 서빙
- **cron**: 별도 워커 `moasearch-cron`(폴더 `moasearch-cron/`) — 가격알림 발동용
- **백엔드**: Supabase(인증·찜·가격알림·알림)
- **완료 기능**: 통합검색 4곳(번개·헬로마켓·당근·중고나라) · 무한스크롤 · 서버사이드 정렬 · 마켓 실카운트 · 가상스크롤 · 상품상세 실데이터 · 로그인/찜 · 가격알림 CRUD · 알림 · 카카오 로그인 버튼

---

## 1. ⚠️ 지금 필요한 설정 (안 하면 기능 무동작)

### 1-1. Cloudflare 빌드 환경변수 — ★ 화이트스크린 원인
`.env`는 git에 안 올라가서, CI 빌드에 Supabase 값이 없어 앱이 하얗게 떴음(코드 하드닝으로 흰 화면은 막았지만, 로그인·찜이 동작하려면 필요).
- Cloudflare → Workers & Pages → **`moasearch`** → Settings → **빌드(Build) 환경변수**에 추가:
  - `VITE_SUPABASE_URL` = (로컬 `.env` 값)
  - `VITE_SUPABASE_ANON_KEY` = (로컬 `.env` 값)
- ⚠️ 반드시 **빌드 타임 변수**(Vite가 빌드 시 코드에 인라인). 런타임 시크릿 아님.
- 저장 후 **재배포**(git push 또는 Retry deployment).

### 1-2. Supabase SQL (가격알림·알림 테이블)
SQL Editor에서 실행:
```sql
alter table price_alerts add column if not exists target_min integer;

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  type text, title text not null, body text,
  listing_url text, dot text,
  created_at timestamptz default now(),
  read boolean not null default false
);
alter table notifications enable row level security;
create policy "own_notifications" on notifications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create unique index if not exists notifications_user_listing
  on notifications(user_id, listing_url);
```

### 1-3. 카카오 로그인 (이메일 안 받음 기준)
- **Kakao Developers**: 앱 생성 → 앱 키의 **REST API 키** 확보 → 카카오 로그인 **ON** → **Redirect URI** = Supabase 콜백(`https://<ref>.supabase.co/auth/v1/callback`) → 보안에서 **Client Secret 생성·"사용함"** → 동의항목 닉네임
- 플랫폼(Web) 도메인 등록: `http://localhost:5173`, `https://moasearch.bluehab28.workers.dev`
- **Supabase** → Authentication → Providers → **Kakao**: REST API Key + Client Secret 입력 → Enable
- **Allow users without an email = ON** (이메일 안 받으므로 필수, 안 켜면 로그인 실패)
- Authentication → URL Configuration → Redirect URLs에 앱 도메인(`/**`) 포함 확인

### 1-4. 가격알림 Cron 워커 — 시크릿 + 배포
```bash
cd moasearch-cron
npx wrangler deploy
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY   # ⚠️ service_role 키(서버 전용, 프론트 금지)
npx wrangler secret put SEARCH_API_URL              # https://moasearch.bluehab28.workers.dev/api/search
```
> cron 워커는 별도 깃 레포 불필요(코드가 `moasearch-cron/`에 있음). 바뀔 때만 위 `wrangler deploy` 재실행.

---

## 2. 구현 예정 기능
- [ ] **반응형(모바일) UI** — 새로 디자인 예정. 현재 1440px 고정(인라인 스타일이라 미디어쿼리 불가 → CSS 클래스 또는 useMediaQuery 접근 결정 필요).

---

## 3. 보류 / 비현실적 (참고)
- **당근 271건 너머 페이지네이션** — 당근 웹 SSR이 커서·hasNextPage를 노출 안 함(`?page` 무시). 인증형 내부 GraphQL 역설계가 필요해 fragile → 비현실적. 당근은 첫 ~271건 유지(타 마켓 5페이지분 이상).
- **네이버 로그인** — Supabase 내장 미지원. 쓰려면 커스텀 OAuth 별도 구현.
- **지역/상태 필터** — 실데이터로 신뢰성 있게 못 채워 제거함(상태값은 마켓별 제각각, 지역은 절반 마켓이 없음).

---

## 4. 알려진 제약 / 메모
- **정렬**: 번개만 서버 정렬(order). 나머지는 불러온 결과를 클라이언트 정렬 → 무한스크롤 특성상 전역 정렬은 근사값(완벽 전역정렬은 k-way merge 필요).
- **취약성**: 검색·상세는 마켓 **비공식 엔드포인트** 의존 → 사이트 개편 시 깨질 수 있음(특히 중고나라 RSC). 수정 위치: `functions/api/search.ts`, `functions/api/listing.ts`의 마켓 어댑터.
- **약관**: 당근·번개는 자동수집 금지 → 개인/포트폴리오 전제. 상품명·가격 등 공개정보만 취급(개인정보 미수집).
- **로컬 풀스택 테스트**: `npm run pages:dev`(빌드+wrangler). `npm run dev`(Vite)는 `/api`가 404.
</content>
