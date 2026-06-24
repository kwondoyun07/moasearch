/**
 * GET /api/search?q=검색어&page=1
 *
 * Cloudflare Pages Function. 프론트와 같은 도메인이라 CORS·env변수 불필요.
 * 번개장터·헬로마켓·당근·중고나라 4곳을 병렬로 가져와 통합 포맷(Listing)으로 반환한다.
 * page 파라미터로 페이지를 이어 받으며(무한 스크롤), hasMore=false 가 되면 끝.
 * 마켓을 늘릴 땐 SEARCHERS 배열에 어댑터를 추가하면 된다.
 *
 * 주의(개인/포트폴리오 전제): 비공식 내부 엔드포인트를 사용하므로
 * - 결과를 캐시(기본 180초)해 호출 빈도를 낮추고
 * - 상품명·가격 등 매물 공개 정보만 다룬다(개인정보 미수집).
 */

interface Listing {
  id: string;
  title: string;
  price: number;
  market: string;
  location: string;
  postedAt: string;
  thumb: string;
  likes?: number;
  listingUrl?: string;
}

/** 마켓 어댑터 1회 호출 결과: 이 페이지의 매물 + 다음 페이지 존재 여부. */
interface MarketResult {
  items: Listing[];
  hasMore: boolean;
}

/** 정렬 키 — 프론트의 최신순/낮은가격순/인기순에 대응. */
type SortKey = 'latest' | 'price_asc' | 'popular';
type Adapter = (q: string, page: number, sort: SortKey) => Promise<MarketResult>;

const CACHE_TTL = 180; // 초

export const onRequestGet: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const q = (url.searchParams.get('q') ?? '').trim();
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
  const sortParam = url.searchParams.get('sort');
  const sort: SortKey = sortParam === 'price_asc' || sortParam === 'popular' ? sortParam : 'latest';

  if (!q) {
    return Response.json(
      { error: 'q (검색어) 가 필요해요', query: '', page, sort, count: 0, results: [], hasMore: false },
      { status: 400 },
    );
  }

  // 같은 (검색어, 정렬, 페이지)는 캐시에서 즉시 응답 (호출 빈도·차단 위험 ↓)
  const cache = caches.default;
  const cacheKey = new Request(
    `https://moa-search.cache/api/search?q=${encodeURIComponent(q)}&sort=${sort}&page=${page}`,
  );
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  // 마켓별 어댑터를 병렬 실행, 한 곳이 실패해도 나머지는 살린다.
  const SEARCHERS: Adapter[] = [searchBunjang, searchHellomarket, searchDaangn, searchJoongna];
  const settled = await Promise.allSettled(SEARCHERS.map((fn) => fn(q, page, sort)));
  settled.forEach((s, i) => {
    if (s.status === 'rejected') console.error(`[search] 어댑터 #${i} 실패:`, s.reason);
  });
  const ok: MarketResult[] = settled.map((s) => (s.status === 'fulfilled' ? s.value : { items: [], hasMore: false }));
  const results = ok.flatMap((r) => r.items);
  const hasMore = ok.some((r) => r.hasMore); // 한 곳이라도 더 있으면 계속

  const res = Response.json(
    { query: q, page, sort, count: results.length, results, hasMore },
    { headers: { 'cache-control': `public, max-age=${CACHE_TTL}` } },
  );
  context.waitUntil(cache.put(cacheKey, res.clone()));
  return res;
};

// ---- 공용 유틸 ----

/** 긴 주소("서울특별시 송파구 방이2동")를 카드용 짧은 지명으로. */
function shortLocation(loc?: string): string {
  if (!loc) return '';
  const parts = loc.trim().split(/\s+/);
  return parts[parts.length - 1];
}

/** epoch(초 또는 ms) → "3분 전" 류 상대 시간. */
function relativeTime(epoch?: number): string {
  if (!epoch) return '';
  const sec = epoch > 1e12 ? Math.floor(epoch / 1000) : epoch;
  const diff = Math.floor(Date.now() / 1000) - sec;
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

/**
 * `marker` 뒤 첫 `{` 부터 중괄호 균형이 맞는 지점까지의 JSON 문자열을 잘라낸다.
 * (문자열 내부의 중괄호·이스케이프를 고려) Remix `__remixContext` 추출용.
 */
function extractBalancedJson(src: string, marker: string): string | null {
  const at = src.indexOf(marker);
  if (at < 0) return null;
  const start = src.indexOf('{', at);
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let k = start; k < src.length; k++) {
    const c = src[k];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') {
      inStr = true;
    } else if (c === '{') {
      depth++;
    } else if (c === '}') {
      depth--;
      if (depth === 0) return src.slice(start, k + 1);
    }
  }
  return null;
}

// ---- 마켓 어댑터 (각각 q + 1-based page 를 받아 {items, hasMore} 반환) ----

interface BunjangItem {
  pid: number | string;
  name: string;
  price: number | string;
  product_image?: string;
  location?: string;
  num_faved?: number;
  update_time?: number;
}

/** 번개장터 비공식 내부 검색 API → 통합 Listing. (page: 1-based, API는 0-based) */
async function searchBunjang(q: string, page: number, sort: SortKey): Promise<MarketResult> {
  const n = 40;
  // 번개는 order 파라미터로 서버 정렬 지원(실측 확인).
  const order = sort === 'price_asc' ? 'price_asc' : sort === 'popular' ? 'popular_score' : 'date';
  const api =
    `https://api.bunjang.co.kr/api/1/find_v2.json?q=${encodeURIComponent(q)}` +
    `&order=${order}&page=${page - 1}&n=${n}&stat_device=w&version=4`;

  const r = await fetch(api, {
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; MoaSearch/0.1)', accept: 'application/json' },
  });
  if (!r.ok) throw new Error(`bunjang ${r.status}`);

  const data = (await r.json()) as { result?: string; list?: BunjangItem[]; num_found?: number };
  const list = data.list ?? [];
  const items = list.map((it) => ({
    id: `bunjang-${it.pid}`,
    title: it.name,
    price: Number(it.price) || 0,
    market: 'bunjang',
    location: shortLocation(it.location),
    postedAt: relativeTime(it.update_time),
    // 번개 이미지 URL은 {cnt}(이미지 번호)·{res}(해상도) 토큰을 치환해야 함
    thumb: (it.product_image ?? '').replace('{cnt}', '1').replace('{res}', '300'),
    likes: it.num_faved,
    listingUrl: `https://m.bunjang.co.kr/products/${it.pid}`,
  }));
  return { items, hasMore: page * n < (data.num_found ?? 0) };
}

interface HelloItem {
  itemIdx: number;
  title: string;
  price: number;
  timestamp?: number; // ms epoch
  imageUrl?: string;
}

/**
 * 헬로마켓(=세컨웨어, 동일 도메인) — 공식 검색 JSON API가 없어 SSR HTML의
 * <script id="__NEXT_DATA__"> JSON을 파싱한다. (page: 1-based, &page=N)
 */
async function searchHellomarket(q: string, page: number, _sort: SortKey): Promise<MarketResult> {
  // 헬로마켓은 잘못된 sort 값에 빈 결과를 줘서 정렬은 안 넘기고 클라이언트 정렬에 맡긴다.
  void _sort;
  const r = await fetch(`https://www.hellomarket.com/search?q=${encodeURIComponent(q)}&page=${page}`, {
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; MoaSearch/0.1)', accept: 'text/html' },
  });
  if (!r.ok) throw new Error(`hellomarket ${r.status}`);

  const html = await r.text();
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new Error('hellomarket: __NEXT_DATA__ 누락');

  const data = JSON.parse(m[1]) as {
    props?: { initialState?: { searchData?: { itemList?: HelloItem[] } } };
  };
  const list = data.props?.initialState?.searchData?.itemList ?? [];
  const items = list.map((it) => ({
    id: `hello-${it.itemIdx}`,
    title: it.title,
    price: Number(it.price) || 0,
    market: 'hello',
    location: '', // 검색 응답에 매물별 지역 없음
    postedAt: relativeTime(it.timestamp),
    thumb: it.imageUrl ?? '', // 완전한 URL, 토큰 치환 불필요
    listingUrl: `https://www.hellomarket.com/item/${it.itemIdx}`,
  }));
  // 페이지당 30개 — 가득 차면 다음 페이지가 더 있다고 본다.
  return { items, hasMore: list.length >= 30 };
}

interface DaangnArticle {
  id: string;
  href: string;
  price: string; // "500000.0"
  title: string;
  thumbnail?: string;
  locationName?: string;
  createdAt?: string; // ISO
}

/** loaderData(중첩) 어디에 있든 fleamarketArticles 배열을 재귀로 찾는다. */
function findFleamarketArticles(node: unknown, depth = 0): DaangnArticle[] | null {
  if (!node || typeof node !== 'object' || depth > 6) return null;
  const rec = node as Record<string, unknown>;
  if (Array.isArray(rec.fleamarketArticles)) return rec.fleamarketArticles as DaangnArticle[];
  for (const v of Object.values(rec)) {
    const found = findFleamarketArticles(v, depth + 1);
    if (found) return found;
  }
  return null;
}

/**
 * 당근마켓 — SEO용 SSR 경로 `/search/{키워드}/`(→ `/kr/buy-sell/?search=`로 307 리다이렉트,
 * Worker fetch가 자동 추적). Remix `__remixContext` loaderData 안 fleamarketArticles 파싱.
 * 웹 SSR은 첫 ~270여 건만 주고 다음 페이지 커서를 노출하지 않으므로 1페이지만 지원.
 */
async function searchDaangn(q: string, page: number, _sort: SortKey): Promise<MarketResult> {
  void _sort; // 정렬 파라미터 미지원 — 273건 전체를 받아 클라이언트 정렬에 맡긴다.
  if (page > 1) return { items: [], hasMore: false }; // 커서 미노출 → 1페이지만

  const r = await fetch(`https://www.daangn.com/search/${encodeURIComponent(q)}/`, {
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; MoaSearch/0.1)', accept: 'text/html' },
  });
  if (!r.ok) throw new Error(`daangn ${r.status}`);

  const html = await r.text();
  const raw = extractBalancedJson(html, '__remixContext');
  if (!raw) throw new Error('daangn: __remixContext 누락');

  const ctx = JSON.parse(raw) as { state?: { loaderData?: unknown } };
  const articles = findFleamarketArticles(ctx.state?.loaderData) ?? [];
  const items = articles.map((it) => ({
    id: `danggn-${it.id}`,
    title: it.title,
    price: Math.round(Number(it.price)) || 0,
    market: 'danggn',
    location: it.locationName ?? '',
    postedAt: it.createdAt ? relativeTime(Date.parse(it.createdAt)) : '',
    thumb: it.thumbnail ?? '', // 완전한 URL
    listingUrl: it.href,
  }));
  return { items, hasMore: false };
}

interface JoongnaItem {
  seq: number;
  title: string;
  price: number;
  url?: string; // 이미지 URL
  sortDate?: string; // "2026-06-23 22:51:53" (KST, 타임존 표기 없음)
  mainLocationName?: string;
}

/** Next.js RSC 스트림(self.__next_f.push([1,"…"]))을 풀어 한 덩어리 텍스트로 복원. */
function decodeRscFlight(html: string): string {
  const re = /self\.__next_f\.push\(\[1,"((?:\\.|[^"\\])*)"\]\)/g;
  let m: RegExpExecArray | null;
  let flight = '';
  while ((m = re.exec(html)) !== null) {
    try {
      flight += JSON.parse('"' + m[1] + '"');
    } catch {
      /* 깨진 청크는 건너뜀 */
    }
  }
  return flight;
}

/** flight 텍스트에서 `"items":[ {seq…} … ]` 배열 문자열을 중괄호/대괄호 균형으로 잘라낸다. */
function extractItemsArray(flight: string): string | null {
  const at = flight.search(/"items"\s*:\s*\[\s*\{"seq":\d/);
  if (at < 0) return null;
  const start = flight.indexOf('[', at);
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let k = start; k < flight.length; k++) {
    const c = flight[k];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') {
      inStr = true;
    } else if (c === '[') {
      depth++;
    } else if (c === ']') {
      depth--;
      if (depth === 0) return flight.slice(start, k + 1);
    }
  }
  return null;
}

/**
 * 중고나라 — web.joongna.com 검색 페이지의 Next.js RSC 스트림에서 매물을 파싱.
 * 공식 검색 JSON API가 없어 RSC 구조에 의존(가장 깨지기 쉬움). (page: 1-based, ?page=N)
 */
async function searchJoongna(q: string, page: number, _sort: SortKey): Promise<MarketResult> {
  void _sort; // 정렬 코드가 불투명·불안정해 안 넘기고 클라이언트 정렬에 맡긴다.
  const r = await fetch(`https://web.joongna.com/search/${encodeURIComponent(q)}?page=${page}`, {
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; MoaSearch/0.1)', accept: 'text/html' },
  });
  if (!r.ok) throw new Error(`joongna ${r.status}`);

  const flight = decodeRscFlight(await r.text());
  const arr = extractItemsArray(flight);
  if (!arr) throw new Error('joongna: items 배열 누락');

  const items = (JSON.parse(arr) as JoongnaItem[])
    .filter((it) => it && typeof it.price === 'number' && !!it.title)
    .map((it) => ({
      id: `joonggo-${it.seq}`,
      title: it.title,
      price: it.price,
      market: 'joonggo',
      location: it.mainLocationName ?? '',
      // sortDate는 타임존 없는 KST → +09:00 로 해석
      postedAt: it.sortDate ? relativeTime(Date.parse(it.sortDate.replace(' ', 'T') + '+09:00')) : '',
      thumb: it.url ?? '', // 완전한 이미지 URL
      listingUrl: `https://web.joongna.com/product/${it.seq}`,
    }));

  const tm = flight.match(/"totalSize":(\d+)/);
  const total = tm ? Number(tm[1]) : 0;
  return { items, hasMore: items.length > 0 && (total ? page * 50 < total : true) };
}
